import { vec3 } from "gl-matrix";
import { Scene } from "../util/scene";
import { Raymarcher } from "./raymarcher";

// Initially were 500, 0.02, 0.001 respectively but rendering took way too long
const MAX_DIST = 10;
const STEP_SIZE = 0.3;
const EPSILON = 0.01;

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
        const MAX_STEPS = Math.ceil(MAX_DIST / STEP_SIZE);

        const dir = vec3.create();
        const p = vec3.create();
        const origin = vec3.create();

        // Helper for normal estimation via finite differences
        const estimateNormal = (pos: vec3): vec3 => {
            const e = 0.001;
            const n = vec3.create();
            const tmp = vec3.create();

            const sampleSDF = (pt: vec3): number => {
                let d = MAX_DIST;
                for (const prim of scene.objectSDFs) {
                    const s = prim.sdf(pt);
                    if (s < d) d = s;
                }
                return d;
            };

            vec3.set(tmp, pos[0] + e, pos[1], pos[2]);
            const dx1 = sampleSDF(tmp);
            vec3.set(tmp, pos[0] - e, pos[1], pos[2]);
            const dx2 = sampleSDF(tmp);

            vec3.set(tmp, pos[0], pos[1] + e, pos[2]);
            const dy1 = sampleSDF(tmp);
            vec3.set(tmp, pos[0], pos[1] - e, pos[2]);
            const dy2 = sampleSDF(tmp);

            vec3.set(tmp, pos[0], pos[1], pos[2] + e);
            const dz1 = sampleSDF(tmp);
            vec3.set(tmp, pos[0], pos[1], pos[2] - e);
            const dz2 = sampleSDF(tmp);

            vec3.set(n, dx1 - dx2, dy1 - dy2, dz1 - dz2);
            vec3.normalize(n, n);
            return n;
        };

        // Loop over pixels
        for (let y = yStart; y < yEnd; y++) {
            const localY = y - yStart;
            const v = y / height - 0.5;

            for (let x = 0; x < width; x++) {
                const u = x / width - 0.5;

                // ---- 1️⃣ Ray setup ----
                vec3.set(dir, u, v, -1);
                vec3.normalize(dir, dir);

                // Rotate direction by camera
                scene.camera.transformDirection(dir, dir);
                vec3.normalize(dir, dir);

                // Camera world position
                scene.camera.getPosition(origin);

                // ---- 2️⃣ Raymarch ----
                let t = 0;
                let steps = 0;
                let sdfCalls = 0;
                let hit = false;

                for (; steps < MAX_STEPS && t <= MAX_DIST; steps++, t += STEP_SIZE) {
                    // p = origin + dir * t
                    p[0] = origin[0] + dir[0] * t;
                    p[1] = origin[1] + dir[1] * t;
                    p[2] = origin[2] + dir[2] * t;

                    let d = MAX_DIST;
                    for (const prim of scene.objectSDFs) {
                        const s = prim.sdf(p);
                        if (s < d) d = s;
                        sdfCalls++;
                    }

                    if (d < EPSILON) {
                        hit = true;
                        break;
                    }
                }

                // ---- 3️⃣ Write outputs ----
                const idx = localY * width + x;

                const depth = Math.min(t, MAX_DIST);
                depthBuffer[idx] = Math.round(255 * depth / MAX_DIST);
                iterationsBuffer[idx] = steps;
                SDFevaluationBuffer[idx] = sdfCalls;

                if (hit) {
                    const n = estimateNormal(p);
                    normalBuffer[idx * 3 + 0] = Math.round((n[0] * 0.5 + 0.5) * 255);
                    normalBuffer[idx * 3 + 1] = Math.round((n[1] * 0.5 + 0.5) * 255);
                    normalBuffer[idx * 3 + 2] = Math.round((n[2] * 0.5 + 0.5) * 255);
                } else {
                    // Flat sky/neutral color if no hit
                    normalBuffer[idx * 3 + 0] = 127;
                    normalBuffer[idx * 3 + 1] = 127;
                    normalBuffer[idx * 3 + 2] = 255;
                }
            }
        }
    }
}
