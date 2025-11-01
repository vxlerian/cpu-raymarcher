import { mat4, vec3 } from "gl-matrix";
import { Primitive } from "./primitive";

export class Sphere extends Primitive {
    radius: number;

    constructor(transform: mat4, radius: number) {
        super(transform);
        this.radius = radius;
    }

    localSdf(localPos: vec3): number {
        return vec3.length(localPos) - this.radius;
    }
}