import { vec3 } from "gl-matrix";
import { Scene } from "../util/scene";
import { Raymarcher } from "./raymarcher";

// Your tuned values
const MAX_DIST   = 10;
const STEP_SIZE  = 0.2;
const EPSILON    = 0.01;

// Derive loop bound from step size
const MAX_STEPS = Math.ceil(MAX_DIST / STEP_SIZE);

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
        yEnd: number = height
    ): void {

        // temp vectors reused per pixel
        const rayDir = vec3.create();     // ray direction (world == camera == origin coords here)
        const samplePos = vec3.create();  // p along the ray

        // Loop over pixel rows
        for (let y = yStart; y < yEnd; y++) {
            const localY = y - yStart;

            // same normalized coords style as SphereTracer
            const v = y / height - 0.5;

            // Loop over columns
            for (let x = 0; x < width; x++) {
                const u = x / width - 0.5;

                // ---------------------------------
                // 1. Ray setup (match SphereTracer)
                // ---------------------------------
                // direction = normalize([u, v, -1])
                vec3.set(rayDir, u, v, -1);
                vec3.normalize(rayDir, rayDir);

                // origin is implicitly (0,0,0)
                // so any point on the ray is rayDir * t

                // ---------------------------------
                // 2. March forward in FIXED steps
                // ---------------------------------
                let t = 0.0;
                let steps = 0;
                let sdfCalls = 0;
                let hit = false;

                for (; steps < MAX_STEPS && t <= MAX_DIST; steps++, t += STEP_SIZE) {
                    // samplePos = origin + rayDir * t
                    samplePos[0] = rayDir[0] * t;
                    samplePos[1] = rayDir[1] * t;
                    samplePos[2] = rayDir[2] * t;

                    // distance to closest SDF primitive at this point
                    let distToScene = MAX_DIST;
                    for (const prim of scene.objectSDFs) {
                        const d = prim.sdf(samplePos);
                        if (d < distToScene) distToScene = d;
                        sdfCalls++;
                    }

                    // consider it a hit if we're within EPSILON of surface
                    if (distToScene < EPSILON) {
                        hit = true;
                        break;
                    }
                }

                // ---------------------------------
                // 3. Write out buffers
                // ---------------------------------
                const idx = localY * width + x;
                const normalIdx = idx * 3;

                // iterations + SDF eval counts for debug
                iterationsBuffer[idx] = steps;
                SDFevaluationBuffer[idx] = sdfCalls;

                // depth:
                // we map t (0..MAX_DIST) -> byte (0..255)
                const clampedT = Math.min(t, MAX_DIST);
                const depthByte = Math.round((clampedT / MAX_DIST) * 255);
                depthBuffer[idx] = depthByte;

                if (hit) {
                    // estimate normal at hit point
                    const n = this.getNormal(scene, samplePos);
                    normalBuffer[normalIdx + 0] = Math.round((n[0] * 0.5 + 0.5) * 255);
                    normalBuffer[normalIdx + 1] = Math.round((n[1] * 0.5 + 0.5) * 255);
                    normalBuffer[normalIdx + 2] = Math.round((n[2] * 0.5 + 0.5) * 255);
                } else {
                    // miss / background
                    normalBuffer[normalIdx + 0] = 127;
                    normalBuffer[normalIdx + 1] = 127;
                    normalBuffer[normalIdx + 2] = 255;
                }
            }
        }
    }

    // same helper logic as before, but without touching debug counters
    private getSceneDistance(scene: Scene, position: vec3): number {
        let closestDistance = MAX_DIST;
        for (const primitive of scene.objectSDFs) {
            const d = primitive.sdf(position);
            if (d < closestDistance) closestDistance = d;
        }
        return closestDistance;
    }

    private getNormal(scene: Scene, position: vec3): vec3 {
        // gradient approx
        const eps = 0.01;

        const d0 = this.getSceneDistance(scene, position);

        const px = vec3.fromValues(position[0] - eps, position[1], position[2]);
        const py = vec3.fromValues(position[0], position[1] - eps, position[2]);
        const pz = vec3.fromValues(position[0], position[1], position[2] - eps);

        const nx = d0 - this.getSceneDistance(scene, px);
        const ny = d0 - this.getSceneDistance(scene, py);
        const nz = d0 - this.getSceneDistance(scene, pz);

        const n = vec3.fromValues(nx, ny, nz);
        vec3.normalize(n, n);
        return n;
    }
}
