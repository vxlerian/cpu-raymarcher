/**
 *  const depthBuffer = new Uint8ClampedArray(width * height);
    const normalBuffer = new Uint8ClampedArray(width * height * 3);
    const SDFevaluationBuffer = new Uint16Array(width * height);
    const iterationsBuffer = new Uint16Array(width * height);
 */

export abstract class ShadingModel {
    public abstract shade(
        shadedBuffer: Uint8ClampedArray,
        depthBuffer: Uint8ClampedArray,
        normalBuffer: Uint8ClampedArray,
        SDFevaluationBuffer: Uint16Array,
        iterationsBuffer: Uint16Array,
        width: number,
        height: number): Uint8ClampedArray;
}