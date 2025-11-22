// abstract class for raymarcher.

// the raymarcher doesn't handle anything to do with the scene or camera transforms:
// all that other stuff is elsewhere for simplicity.

// the raymarcher will always render from the origin looking in the negative z
// direction. (this way, the x and y axes can still correspond to x and y, and
// the whole thing uses a right-handed 3d coordinate system.)

// for now, the raymarcher has a fixed FOV but this can (and probably will) be
// changed in future.

// shading is also handled elsewhere. The raymarcher should update only the
// depth, normal and SDF evaluations buffer.

import { Scene } from '../util/scene';
import { mat3, mat4, vec3 } from 'gl-matrix';

export abstract class Raymarcher {
    protected abstract getMaxDistance(): number;

    /**
     * core raymarching algorithm implemented in each subclass.
     * returns the distance traveled along the ray
     */
    protected abstract rayMarch(
        scene: Scene,
        rayOrigin: vec3,
        direction: vec3,
        idx: number,
        SDFevaluationBuffer: Uint16Array,
        iterationsBuffer: Uint16Array,
    ): number;

    /**
     * runs the raymarcher on the scene and updates the relevant buffers.
     * @param scene the SceneSDF to render
     * @param depthBuffer the depth of the scene
     * @param normalBuffer the normal of the scene
     * @param SDFevaluationBuffer the number of SDFs evaluated for each pixel
     * @param iterationsBuffer the number of iterations for each pixel
     * @param width width of the buffers
     * @param height height of the buffers
     * @param time the current time in the scene (for animation, but otherwise unused)
     */
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
        // update time for animated primitives
        scene.updateTime(time);

        // --- get camera transforms once ---
        const rotMat4 = scene.camera.getRotationMatrix(mat4.create());
        const rotMat3 = mat3.create();
        mat3.fromMat4(rotMat3, rotMat4);

        const rayOrigin = vec3.create();
        scene.camera.getPosition(rayOrigin);

        const MAX_DIST = this.getMaxDistance();

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

                // --- rotate ray by camera rotation (not multiply!) ---
                vec3.transformMat3(rayDir, rayDir, rotMat3);
                vec3.normalize(rayDir, rayDir);

                // --- perform raymarch ---
                const depth = this.rayMarch(scene, rayOrigin, rayDir, idx, SDFevaluationBuffer, iterationsBuffer);

                // --- compute hit normal (unchanged) ---
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

    protected getSceneDistance(
        scene: Scene,
        position: vec3,
        idx: number,
        SDFevaluationBuffer: Uint16Array
    ): number {
        const counter = { count: 0 };
        const distance = scene.getDistance(position, counter);
        SDFevaluationBuffer[idx] += counter.count;
        return distance;
    }

    protected getNormal(scene: Scene, position: vec3, idx: number, SDFevaluationBuffer: Uint16Array): vec3 {
        let d = this.getSceneDistance(scene, position, idx, SDFevaluationBuffer);
        const e = [0.01, 0, 0];
        const n = vec3.create();
        n[0] = d - this.getSceneDistance(scene,
            vec3.fromValues(position[0] - e[0], position[1], position[2]), idx, SDFevaluationBuffer);
        n[1] = d - this.getSceneDistance(scene,
            vec3.fromValues(position[0], position[1] - e[0], position[2]), idx, SDFevaluationBuffer);
        n[2] = d - this.getSceneDistance(scene,
            vec3.fromValues(position[0], position[1], position[2] - e[0]), idx, SDFevaluationBuffer);
        vec3.normalize(n, n);
        return n;
    }
}