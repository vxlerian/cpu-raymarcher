import { vec3 } from "gl-matrix";
import { Scene } from "../util/scene";
import { Raymarcher } from "./raymarcher";

const MAX_DIST = 500;
const STEP_SIZE = 0.02; // fixed t increment
const EPSILON = 0.001;  // hit threshold

export class FixedStep extends Raymarcher {
    public runRaymarcher(
        scene: Scene,
        depthBuffer: Uint8ClampedArray,
        normalBuffer: Uint8ClampedArray,
        SDFevaluationBuffer: Uint16Array,
        iterationsBuffer: Uint16Array,
        width: number,
        height: number,
        time: number,
        yStart: number = 0,
        yEnd: number = height): void
    {
        // loop cap
        const MAX_STEPS = Math.ceil(MAX_DIST / STEP_SIZE);

        const dir = vec3.create();
        const p = vec3.create();
        for (let y = yStart; y < yEnd; y++) {
            const localY = y - yStart;
            const v = y / height - 0.5;

            for (let x = 0; x < width; x++) {
                const u = x / width - 0.5;

                vec3.set(dir, u, v, -1);
                vec3.normalize(dir, dir);

                // march
                let t = 0;          // distance marched along the ray
                let steps = 0;      // loop iterations
                let sdfCalls = 0;   // SDF function evaluations (for metrics)

                for (; steps < MAX_STEPS && t <= MAX_DIST; steps++, t += STEP_SIZE) {
                    // p = dir * t
                    p[0] = dir[0] * t;
                    p[1] = dir[1] * t;
                    p[2] = dir[2] * t;

                    // SDF scene query
                    let d = MAX_DIST;
                    for (const prim of scene.objectSDFs) {
                        const s = prim.sdf(p);
                        if (s < d) d = s;
                        sdfCalls++;
                    }

                    if (d < EPSILON) {
                        break; // hit
                    }
                }

                // pack outputs
                const idx = localY * width + x;

                const depth = Math.min(t, MAX_DIST);
                depthBuffer[idx] = Math.round(255 * depth / MAX_DIST);

                // simple metrics
                iterationsBuffer[idx] = steps;
                SDFevaluationBuffer[idx] = sdfCalls;
            }
        }
    }
}