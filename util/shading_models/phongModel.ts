import { vec3 } from "gl-matrix";
import { ShadingModel } from "./shadingModel";

// from phong wikipedia: https://en.wikipedia.org/wiki/Phong_reflection_model
export class PhongModel extends ShadingModel {
    public shade(
        shadedBuffer: Uint8ClampedArray,
        depthBuffer: Uint8ClampedArray,
        normalBuffer: Uint8ClampedArray,
        SDFevaluationBuffer: Uint16Array,
        iterationsBuffer: Uint16Array,
        width: number,
        height: number
    ): Uint8ClampedArray {
        const lightDir = vec3.fromValues(1, -1, 1.5);
        vec3.normalize(lightDir, lightDir);

        // Reuse temp vectors
        const normal = vec3.create();
        const reflectDir = vec3.create();
        const viewDir = vec3.fromValues(0, 0, 1);

        const ambient = 0.1;
        const specularStrength = 0.5;
        const shininess = 32;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const normalIdx = idx * 3;
                const shadedIdx = idx * 4;

                const depth = depthBuffer[idx];
                if (depth >= 255) {
                    // background colour
                    shadedBuffer[shadedIdx + 0] = 10;
                    shadedBuffer[shadedIdx + 1] = 10;
                    shadedBuffer[shadedIdx + 2] = 20;
                    shadedBuffer[shadedIdx + 3] = 255;
                    continue;
                }

                // calculate normal
                normal[0] = normalBuffer[normalIdx] / 127.5 - 1.0;
                normal[1] = normalBuffer[normalIdx + 1] / 127.5 - 1.0;
                normal[2] = normalBuffer[normalIdx + 2] / 127.5 - 1.0;
                vec3.normalize(normal, normal);

                // lighting
                const diffuse = Math.max(vec3.dot(normal, lightDir), 0);

                // Reflect direction = 2*(N·L)*N - L
                vec3.scale(reflectDir, normal, 2 * vec3.dot(normal, lightDir));
                vec3.subtract(reflectDir, reflectDir, lightDir);
                vec3.normalize(reflectDir, reflectDir);

                const specular = specularStrength * Math.pow(
                    Math.max(vec3.dot(viewDir, reflectDir), 0),
                    shininess
                );

                const intensity = Math.min(ambient + diffuse + specular, 1);

                // Optional: make closer = brighter
                const depthFactor = 1 - depth / 255;

                const color = 255 * intensity * depthFactor;

                shadedBuffer[shadedIdx + 0] = color;
                shadedBuffer[shadedIdx + 1] = color;
                shadedBuffer[shadedIdx + 2] = color;
                shadedBuffer[shadedIdx + 3] = 255;
            }
        }

        return shadedBuffer;
    }
}