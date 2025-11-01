import { mat4, vec3 } from "gl-matrix";
import { Primitive } from "./primitive";

export class Box extends Primitive {
    halfSize: vec3;

    // halfSize is half the length of each side
    constructor(transform: mat4, halfSize: vec3) {
        super(transform);
        this.halfSize = vec3.clone(halfSize);
    }

    localSdf(localPos: vec3): number {
        const q = vec3.fromValues(
            Math.abs(localPos[0]) - this.halfSize[0],
            Math.abs(localPos[1]) - this.halfSize[1],
            Math.abs(localPos[2]) - this.halfSize[2]
        );

        const outside = vec3.fromValues(
            Math.max(q[0], 0),
            Math.max(q[1], 0),
            Math.max(q[2], 0)
        );

        const outsideDist = vec3.length(outside);
        const insideDist = Math.min(Math.max(q[0], Math.max(q[1], q[2])), 0);

        return outsideDist + insideDist;
    }
}
