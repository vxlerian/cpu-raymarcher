import { vec3 } from "gl-matrix";
import { ShadingModel } from "./shadingModel";

// from phong wikipedia: https://en.wikipedia.org/wiki/Phong_reflection_model
export class NormalModel extends ShadingModel {
    public shade(
        shadedBuffer: Uint8ClampedArray,
        depthBuffer: Uint8ClampedArray,
        normalBuffer: Uint8ClampedArray,
        SDFevaluationBuffer: Uint16Array,
        iterationsBuffer: Uint16Array,
        width: number,
        height: number): Uint8ClampedArray
    {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x);
                const normalIdx = idx * 3;
                const shadedIdx = idx * 4;

                shadedBuffer[shadedIdx] = normalBuffer[normalIdx];
                shadedBuffer[shadedIdx + 1] = normalBuffer[normalIdx + 1];
                shadedBuffer[shadedIdx + 2] = normalBuffer[normalIdx + 2];
                shadedBuffer[shadedIdx + 3] = 255; // alpha channel
            }
        }

        return shadedBuffer;
    }
}