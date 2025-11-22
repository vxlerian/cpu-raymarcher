import { Raymarcher } from './raymarcher'

const MAX_STEPS = 100;
const MAX_DIST = 10;
const EPSILON = 0.001;

import { Scene } from '../util/scene';
import { vec3 } from 'gl-matrix';

export class SphereTracer extends Raymarcher {
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
            
            // check if acceleration structure finds nothin
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
                    continue;
                }
            }

            const dist = this.getSceneDistance(scene, p, idx, SDFevaluationBuffer);
            totalDist += dist;

            iterationsBuffer[idx] += 1;

            // --- termination conditions ---
            if (dist < EPSILON) break; // hit surface
            if (totalDist > MAX_DIST) break; // too far
        }

        // call acceleration structure end callback
        if (accelStruct && accelStruct.onRayMarchEnd && accelState) {
            accelStruct.onRayMarchEnd(accelState);
        }

        return totalDist;
    }
}