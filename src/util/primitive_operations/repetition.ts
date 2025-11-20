import { mat4, vec3 } from "gl-matrix";
import { Primitive } from "../primitives/primitive";

export class Repetition extends Primitive {
    primitive: Primitive;
    spacing: vec3;

    constructor(primitive: Primitive, spacing: vec3) {
        super(mat4.create());
        this.primitive = primitive;
        this.spacing = spacing;
    }

    localSdf(localPos: vec3): number {
        // convert local position back to world space
        const worldPos = vec3.create();
        const localToWorld = mat4.create();
        mat4.invert(localToWorld, this.transform);
        vec3.transformMat4(worldPos, localPos, localToWorld);

        // apply repetition: q = p - s*round(p/s)
        const q = vec3.create();
        q[0] = worldPos[0] - this.spacing[0] * Math.round(worldPos[0] / this.spacing[0]);
        q[1] = worldPos[1] - this.spacing[1] * Math.round(worldPos[1] / this.spacing[1]);
        q[2] = worldPos[2] - this.spacing[2] * Math.round(worldPos[2] / this.spacing[2]);

        // evaluate primitive at repeated position
        return this.primitive.sdf(q);
    }

    getLocalBoundingRadius(): number {
        // for infinite repetition, we need to return a large enough radius
        // to cover at least one cell of the repetition
        const primRadius = this.primitive.getLocalBoundingRadius();
        const maxSpacing = Math.max(this.spacing[0], this.spacing[1], this.spacing[2]);
        
        // bounding radius should cover the primitive plus half the spacing
        return primRadius + maxSpacing * 0.5;
    }
}
