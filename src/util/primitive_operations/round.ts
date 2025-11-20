import { mat4, vec3 } from "gl-matrix";
import { Primitive } from "../primitives/primitive";

export class Round extends Primitive {
    primitive: Primitive;
    radius: number;

    constructor(primitive: Primitive, radius: number) {
        super(primitive.transform);
        this.primitive = primitive;
        this.radius = radius;
    }

    
    localSdf(localPos: vec3): number {
        // get world pos from transform
        const worldPos = vec3.create();
        const localToWorld = mat4.create();
        mat4.invert(localToWorld, this.transform);
        vec3.transformMat4(worldPos, localPos, localToWorld);

        // https://iquilezles.org/articles/distfunctions/
        return this.primitive.sdf(worldPos) - this.radius;
    }

    getLocalBoundingRadius(): number {
        // bounding radius increases by the rounding amount
        return this.primitive.getLocalBoundingRadius() + this.radius;
    }

    getWorldPosition(): vec3 {
        // use wrapped primitive world position
        return this.primitive.getWorldPosition();
    }
}
