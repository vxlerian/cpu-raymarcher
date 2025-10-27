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
        for (let y = yStart; y < yEnd; y++) {
            const localY = y - yStart;
            const v = y / height - 0.5;

            for (let x = 0; x < width; x++) {
                const rayDir = vec3.create();
                const u = x / width - 0.5;
                vec3.normalize(rayDir, vec3.fromValues(
                    u,
                    v,
                    -1
                ));
                const depth = this.rayMarch(scene, rayDir);
                // const depth = this.getSceneDistance(scene, rayDir);

                const idx = (localY * width + x);
                const normalIdx = idx * 3;

                const position = vec3.create();
                vec3.scale(position, rayDir, depth);
                const normal = this.getNormal(scene, position);

                normalBuffer[normalIdx] = (normal[0] + 1) * 0.5 * 255;
                normalBuffer[normalIdx + 1] = (normal[1] + 1) * 0.5 * 255;
                normalBuffer[normalIdx + 2] = (normal[2] + 1) * 0.5 * 255;
                depthBuffer[idx] = depth;
            }
        }
    }

    private getSceneDistance(scene: Scene, position: vec3): number {
        let closestDistance = MAX_DIST;
        for (const primitive of scene.objectSDFs) {
            closestDistance = Math.min(primitive.sdf(position), closestDistance);
        }
        return closestDistance;
    }

    private getNormal(scene: Scene, position: vec3): vec3 {
        let d = this.getSceneDistance(scene, position);
        const e = [0.01, 0, 0];
        const n = vec3.create();
        n[0] = d - this.getSceneDistance(scene, vec3.fromValues(position[0] - e[0], position[1], position[2]));
        n[1] = d - this.getSceneDistance(scene, vec3.fromValues(position[0], position[1] - e[0], position[2]));
        n[2] = d - this.getSceneDistance(scene, vec3.fromValues(position[0], position[1], position[2] - e[0]));
        vec3.normalize(n, n);
        return n;
    }

    private rayMarch(scene: Scene, direction: vec3): number {
        let d = 0;
        for (let i = 0; i < MAX_STEPS; i++) {
            const p = vec3.fromValues(0, 0, 0);
            vec3.scale(p, direction, d);
            let ds = this.getSceneDistance(scene, p);
            d += ds;
            if (d > MAX_DIST || ds < EPSILON) {
                break;  // hit object or out of scene
            }
        }
        return Math.min(d, 255);
    }
}