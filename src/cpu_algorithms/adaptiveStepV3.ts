import { Raymarcher } from './raymarcher'

const MAX_STEPS = 100;
const MAX_DIST = 10;
const EPSILON = 0.001;

import { Scene } from '../util/scene';
import { vec3 } from 'gl-matrix';

export class AdaptiveStepV3 extends Raymarcher {
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
        let prevSDF = 0; // last SDF distance
        let prevStep = 0; // last actual step

        const accelStruct = scene.getAccelerationStructure();
        let accelState = null;

        if (accelStruct && accelStruct.onRayMarchStart) {
            accelState = accelStruct.onRayMarchStart({
                rayOrigin,
                rayDirection: direction,
                currentDistance: totalDist,
                maxDistance: MAX_DIST
            });
            if (accelState && accelState.data && accelState.data.terminate) return MAX_DIST;
        }

        const tmpP = vec3.create(); // reuse vector to avoid allocations

        for (let i = 0; i < MAX_STEPS; i++) {
            vec3.scaleAndAdd(tmpP, rayOrigin, direction, totalDist);

            // Acceleration structure step
            if (accelStruct && accelStruct.onRayMarchStep && accelState) {
                const skipDist = accelStruct.onRayMarchStep({
                    rayOrigin,
                    rayDirection: direction,
                    currentDistance: totalDist,
                    maxDistance: MAX_DIST
                }, accelState);

                if (skipDist === -1) return MAX_DIST;
                else if (skipDist > 0) {
                    totalDist += skipDist;
                    if (totalDist > MAX_DIST) break;
                    prevSDF = 0;
                    prevStep = 0;
                    continue;
                }
            }

            // Evaluate current SDF
            const newSDF = this.getSceneDistance(scene, tmpP, idx, SDFevaluationBuffer);
            iterationsBuffer[idx] += 1;

            // Termination conditions
            if (newSDF < EPSILON) break;
            if (totalDist > MAX_DIST) break;

            ////// Adaptive-specific logic //////

            // First step or reset
            if (i === 0 || prevSDF === 0) {
                const step = newSDF;
                totalDist += step;
                prevSDF = newSDF;
                prevStep = step;
                continue;
            }

            // Check if overshoot was safe
            const spheresOverlapped = prevStep <= (prevSDF + newSDF);

            if (spheresOverlapped) {
                // Safe overshoot
                const step = newSDF * this.overshootFactor;
                totalDist += step;
                prevSDF = newSDF;
                prevStep = step;
                continue;
            }

            // =============================
            // OVERSHOOT FAILED, fallback
            // =============================

            const originalPos = totalDist - prevStep;

            // step back to original position + safe distance (prevSDF)
            totalDist = originalPos + prevSDF;

            // lazy bridging: only compute d3 if needed
            // we compute d3 as the next SDF evaluation, (which is exactly what V2 would have done)
            vec3.scaleAndAdd(tmpP, rayOrigin, direction, totalDist);
            const d3 = this.getSceneDistance(scene, tmpP, idx, SDFevaluationBuffer);
            iterationsBuffer[idx] += 1;

            // check if bridging allows us to skip forward
            if (prevSDF + newSDF + d3 >= prevStep) {
                // Gap bridged → jump ahead
                totalDist = originalPos + prevStep + newSDF;
                prevSDF = newSDF;
                prevStep = newSDF; // next iteration uses d2 as step
                continue;
            }

            // gap still not bridged -> continue as usual
            prevSDF = d3;
            prevStep = d3;
            totalDist += d3;
        }

        if (accelStruct && accelStruct.onRayMarchEnd && accelState) {
            accelStruct.onRayMarchEnd(accelState);
        }

        return totalDist;
    }
}
