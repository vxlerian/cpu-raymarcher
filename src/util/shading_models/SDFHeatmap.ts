import { vec3 } from "gl-matrix";
import { ShadingModel } from "./shadingModel";

export class SDFHeatmap extends ShadingModel {
    public shade(
        shadedBuffer: Uint8ClampedArray,
        depthBuffer: Uint8ClampedArray,
        normalBuffer: Uint8ClampedArray,
        SDFevaluationBuffer: Uint16Array,
        iterationsBuffer: Uint16Array,
        width: number,
        height: number
    ): Uint8ClampedArray {
        const colourScalingFactor = 5;

        const lightDir = vec3.fromValues(1, -1, 1.5);
        vec3.normalize(lightDir, lightDir);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const shadedIdx = idx * 4;

                const sdfIntensity = SDFevaluationBuffer[idx] * colourScalingFactor % 256;

                shadedBuffer[shadedIdx + 0] = Math.min(2 * sdfIntensity, 255);
                shadedBuffer[shadedIdx + 1] = Math.min(-2 * sdfIntensity + 512, 255);
                shadedBuffer[shadedIdx + 2] = 0;
                shadedBuffer[shadedIdx + 3] = 255;
            }
        }

        return shadedBuffer;
    }
}