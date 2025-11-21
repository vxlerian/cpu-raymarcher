import { mat4, vec3 } from "gl-matrix";
import { Primitive } from "../primitives/primitive";

export class SmoothSubtraction extends Primitive {
    prim1: Primitive;
    prim2: Primitive;
    smoothness: number;

    constructor(prim1: Primitive, prim2: Primitive, k: number) {
        super(mat4.create());
        this.prim1 = prim1;
        this.prim2 = prim2;
        this.smoothness = k;
    }

   
    localSdf(localPos: vec3): number {
        // convert local position back to world space
        const worldPos = vec3.create();
        const localToWorld = mat4.create();
        mat4.invert(localToWorld, this.transform);
        vec3.transformMat4(worldPos, localPos, localToWorld);
        
        // evaluate both primitives in world space
        const d1 = this.prim1.sdf(worldPos);
        const d2 = this.prim2.sdf(worldPos);

        // smooth subtraction: negate d2 for subtraction
        // based on https://iquilezles.org/articles/distfunctions/
        const k = this.smoothness * 4.0;
        const h = Math.max(k - Math.abs(d1 + d2), 0.0);

        return Math.max(d1, -d2) + h * h * 0.25 / k;
    }

    getLocalBoundingRadius(): number {
        // use only the first primitive's bounding radius for subtraction
        return this.prim1.getLocalBoundingRadius();
    }

    getWorldPosition(): vec3 {
        // use the first primitive's position
        return this.prim1.getWorldPosition();
    }

    public setTime(time: number): void {
        this.prim1.setTime(time);
        this.prim2.setTime(time);
    }
}