import { Raymarcher } from './raymarcher'

const MAX_STEPS = 100;
const MAX_DIST = 10;
const EPSILON = 0.001;

import { Scene } from '../util/scene';
import { mat3, mat4, vec3 } from 'gl-matrix';

/**
 * Sphere Tracer with BVH acceleration
 */
export class SphereTracerBVH extends Raymarcher {
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
        // --- get camera transforms once ---
        const rotMat4 = scene.camera.getRotationMatrix(mat4.create());
        const rotMat3 = mat3.create();
        mat3.fromMat4(rotMat3, rotMat4);

        const rayOrigin = vec3.create();
        scene.camera.getPosition(rayOrigin);

        for (let y = yStart; y < yEnd; y++) {
            const localY = y - yStart;
            const v = (y / height - 0.5) * 2.0; // normalized screen space

            for (let x = 0; x < width; x++) {
                const idx = localY * width + x;
                const normalIdx = idx * 3;

                SDFevaluationBuffer[idx] = 0;
                iterationsBuffer[idx] = 0;

                // --- compute ray direction in view space ---
                const u = (x / width - 0.5) * 2.0;
                const rayDir = vec3.fromValues(u, v, -1);

                // --- rotate ray by camera rotation ---
                vec3.transformMat3(rayDir, rayDir, rotMat3);
                vec3.normalize(rayDir, rayDir);

                // --- perform BVH-accelerated raymarch ---
                const depth = this.rayMarchBVH(scene, rayOrigin, rayDir, idx, SDFevaluationBuffer, iterationsBuffer);

                // --- compute hit normal ---
                const hitPosition = vec3.create();
                vec3.scaleAndAdd(hitPosition, rayOrigin, rayDir, depth);

                let normal;
                if (depth >= MAX_DIST) {
                    normal = vec3.fromValues(0, 0, 0);
                } else {
                    normal = this.getNormal(scene, hitPosition, idx, SDFevaluationBuffer);
                }
                normalBuffer[normalIdx]     = (normal[0] + 1) * 0.5 * 255;
                normalBuffer[normalIdx + 1] = (normal[1] + 1) * 0.5 * 255;
                normalBuffer[normalIdx + 2] = (normal[2] + 1) * 0.5 * 255;
                depthBuffer[idx] = depth;
            }
        }
    }

    /**
     * Get scene distance using BVH acceleration
     */
    private getSceneDistanceBVH(
        scene: Scene,
        position: vec3,
        idx: number,
        SDFevaluationBuffer: Uint16Array
    ): number {
        SDFevaluationBuffer[idx] += 1;
        return scene.bvh.findClosestDistance(position, MAX_DIST);
    }

    /**
     * Get normal using BVH acceleration
     */
    private getNormal(scene: Scene, position: vec3, idx: number, SDFevaluationBuffer: Uint16Array): vec3 {
        let d = this.getSceneDistanceBVH(scene, position, idx, SDFevaluationBuffer);
        const e = [0.01, 0, 0];
        const n = vec3.create();
        n[0] = d - this.getSceneDistanceBVH(scene,
            vec3.fromValues(position[0] - e[0], position[1], position[2]), idx, SDFevaluationBuffer);
        n[1] = d - this.getSceneDistanceBVH(scene,
            vec3.fromValues(position[0], position[1] - e[0], position[2]), idx, SDFevaluationBuffer);
        n[2] = d - this.getSceneDistanceBVH(scene,
            vec3.fromValues(position[0], position[1], position[2] - e[0]), idx, SDFevaluationBuffer);
        vec3.normalize(n, n);
        return n;
    }

    /**
     * BVH-accelerated sphere tracing raymarch
     */
    private rayMarchBVH(
        scene: Scene,
        rayOrigin: vec3,
        direction: vec3,
        idx: number,
        SDFevaluationBuffer: Uint16Array,
        iterationsBuffer: Uint16Array,
    ): number {
        let totalDist = 0;

        for (let i = 0; i < MAX_STEPS; i++) {
            const p = vec3.create();
            vec3.scaleAndAdd(p, rayOrigin, direction, totalDist);

            const dist = this.getSceneDistanceBVH(scene, p, idx, SDFevaluationBuffer);
            totalDist += dist;

            iterationsBuffer[idx] += 1;

            // --- termination conditions ---
            if (dist < EPSILON) break; // hit surface
            if (totalDist > MAX_DIST) break; // too far
        }

        return totalDist;
    }
}
