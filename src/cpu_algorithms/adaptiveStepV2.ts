import { Raymarcher } from './raymarcher'

const MAX_STEPS = 100;
const MAX_DIST = 10;
const EPSILON = 0.001;

import { Scene } from '../util/scene';
import { vec3 } from 'gl-matrix';

export class AdaptiveStepV2 extends Raymarcher {
    private overshootFactor: number; // how much to overshoot by

    constructor(overshootFactor: number = 1.2) {
        super();
        this.overshootFactor = overshootFactor;
    }

    protected getMaxDistance(): number {
        return MAX_DIST;
    }

    protected rayMarch(
        scene: Scene,
        rayOrigin: vec3,
        direction: vec3,
        idx: number,
        SDFevaluationBuffer: Uint16Array,
        iterationsBuffer: Uint16Array,
    ): number {
        let totalDist = 0;
        let prevSDF = 0; // track the last SDF evaluation
        let prevStep = 0; // track the actual step we took to get to current position

        /////////////// This stuff is the same as Sphere Tracing ///////////////

        // initialise acceleration structure if available
        const accelStruct = scene.getAccelerationStructure();
        let accelState = null;
        
        if (accelStruct && accelStruct.onRayMarchStart) {
            accelState = accelStruct.onRayMarchStart({
                rayOrigin,
                rayDirection: direction,
                currentDistance: totalDist,
                maxDistance: MAX_DIST
            });
            
            // check if acceleration structure finds nothing
            if (accelState && accelState.data && accelState.data.terminate) {
                return MAX_DIST;
            }
        }

        for (let i = 0; i < MAX_STEPS; i++) {
            const p = vec3.create();
            vec3.scaleAndAdd(p, rayOrigin, direction, totalDist);

            // if needed do acceleration structure step callback
            if (accelStruct && accelStruct.onRayMarchStep && accelState) {
                const skipDist = accelStruct.onRayMarchStep({
                    rayOrigin,
                    rayDirection: direction,
                    currentDistance: totalDist,
                    maxDistance: MAX_DIST
                }, accelState);
                
                if (skipDist === -1) {
                    // acceleration structure signals nothing left
                    return MAX_DIST;
                } else if (skipDist > 0) {
                    // skip forward by amount given by acceleration structure
                    totalDist += skipDist;
                    if (totalDist > MAX_DIST) break;
                    prevSDF = 0; // reset adaptive stuff
                    prevStep = 0;
                    continue;
                }
            }

            const newSDF = this.getSceneDistance(scene, p, idx, SDFevaluationBuffer);
            iterationsBuffer[idx] += 1;

            // --- termination conditions ---
            if (newSDF < EPSILON) break; // hit surface
            if (totalDist > MAX_DIST) break; // too far
        
            ////// Adaptive-Specific: check overshoot using previous step //////
            
            // on first iteration or we just failed to overshoot...
            // just use normal sphere tracing to start process again
            if (i === 0 || prevSDF == 0) {
                const step = newSDF;
                totalDist += step;
                prevSDF = newSDF;
                prevStep = step;
            } else {
                // check if the previous step we took was safe
                // the spheres overlap if: prevStep <= (prevSDF + newSDF)
                const spheresOverlapped = prevStep <= (prevSDF + newSDF);
                
                if (spheresOverlapped) {
                    // the previous step was safe! we can continue with our 
                    // overshooting strategy
                    const step = newSDF * this.overshootFactor;
                    totalDist += step;
                    prevSDF = newSDF;
                    prevStep = step;
                } else {
                    // gap detected - the previous step was too aggressive
                    // go back to previous position and take conservative step
                    totalDist -= prevStep; // go back to previous position
                    totalDist += prevSDF; // take the safe sphere tracer step
                    prevStep = prevSDF;
                }
            }
        }

        // call acceleration structure end callback
        if (accelStruct && accelStruct.onRayMarchEnd && accelState) {
            accelStruct.onRayMarchEnd(accelState);
        }

        return totalDist;
    }
}
