import { mat4, vec3 } from "gl-matrix";
import { Primitive } from "./primitive";

export class Torus extends Primitive {
    majorRadius: number; // distance from center to ring centerline
    minorRadius: number; // radius of the tube

    constructor(transform: mat4, majorRadius: number, minorRadius: number) {
        super(transform);
        this.majorRadius = majorRadius;
        this.minorRadius = minorRadius;
    }

    localSdf(localPos: vec3): number {
        const x = localPos[0];
        const y = localPos[1];
        const z = localPos[2];

        // Distance to central ring in the XZ-plane
        const qx = Math.sqrt(x * x + z * z) - this.majorRadius;
        const qy = y;

        // Distance to the torus surface
        return Math.sqrt(qx * qx + qy * qy) - this.minorRadius;
    }

    getLocalBoundingRadius(): number {
        return this.majorRadius + this.minorRadius;
    }
}
