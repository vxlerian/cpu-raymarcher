import { Raymarcher } from './raymarcher'

const MAX_STEPS = 100;
const MAX_DIST = 500;
const EPSILON = 0.001;

import { Scene } from '../util/scene';
import { vec3 } from 'gl-matrix';

export class SphereTracer extends Raymarcher {
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
        const dir = vec3.create();
        const origin = vec3.create();

        for (let y = yStart; y < yEnd; y++) {
            const localY = y - yStart;
            const v = y / height - 0.5;

            for (let x = 0; x < width; x++) {
                const idx = (localY * width + x);
                const normalIdx = idx * 3;

                SDFevaluationBuffer[idx] = 0;
                iterationsBuffer[idx] = 0;

                const u = x / width - 0.5;
                
                // ---- Ray setup ----
                vec3.set(dir, u, v, -1);
                vec3.normalize(dir, dir);

                // Rotate direction by camera
                scene.camera.transformDirection(dir, dir);
                vec3.normalize(dir, dir);

                // Camera world position
                scene.camera.getPosition(origin);

                const depth = this.rayMarch(scene, origin, dir, idx, SDFevaluationBuffer, iterationsBuffer);

                const position = vec3.create();
                vec3.scaleAndAdd(position, origin, dir, depth);
                const normal = this.getNormal(scene, position, idx, SDFevaluationBuffer);

                normalBuffer[normalIdx] = (normal[0] + 1) * 0.5 * 255;
                normalBuffer[normalIdx + 1] = (normal[1] + 1) * 0.5 * 255;
                normalBuffer[normalIdx + 2] = (normal[2] + 1) * 0.5 * 255;
                depthBuffer[idx] = depth;
            }
        }
    }

    private getSceneDistance(
        scene: Scene,
        position: vec3,
        idx: number,
        SDFevaluationBuffer: Uint16Array
    ): number {
        SDFevaluationBuffer[idx] += 1;

        let closestDistance = MAX_DIST;
        for (const primitive of scene.objectSDFs) {
            closestDistance = Math.min(primitive.sdf(position), closestDistance);
        }
        return closestDistance;
    }

    private getNormal(scene: Scene, position: vec3, idx: number, SDFevaluationBuffer: Uint16Array): vec3 {
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

    private rayMarch(
        scene: Scene,
        origin: vec3,
        direction: vec3,
        idx: number,
        SDFevaluationBuffer: Uint16Array,
        iterationsBuffer: Uint16Array,
    ): number {
        let t = 0;

        for (let i = 0; i < MAX_STEPS; i++) {
            const p = vec3.create();
            vec3.scaleAndAdd(p, origin, direction, t);
            let ds = this.getSceneDistance(scene, p, idx, SDFevaluationBuffer);
            t += ds;
            if (t > MAX_DIST || ds < EPSILON) {
                break;  // hit object or out of scene
            }

            iterationsBuffer[idx] += 1;
        }
        return Math.min(t, MAX_DIST);
    }
}