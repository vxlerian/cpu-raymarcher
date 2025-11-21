import { mat4, vec3 } from "gl-matrix";
import { Primitive } from "../primitives/primitive";

export class SmoothUnion extends Primitive {
    prim1: Primitive;
    prim2: Primitive;
    smoothness: number;

    constructor(prim1: Primitive, prim2: Primitive, k: number) {
        // Use identity transform - we'll override getWorldPosition
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

        // do some calculation as per:
        // https://iquilezles.org/articles/distfunctions/ (this is very cool)
        const k = this.smoothness * 4.0;
        const h = Math.max(k - Math.abs(d1 - d2), 0.0);

        return Math.min(d1, d2) - h * h * 0.25 / k;
    }

    getLocalBoundingRadius(): number {
        // max of both prims' bounding radius
        const r1 = this.prim1.getLocalBoundingRadius();
        const r2 = this.prim2.getLocalBoundingRadius();
        
        // add half distance between centers
        const pos1 = this.prim1.getWorldPosition();
        const pos2 = this.prim2.getWorldPosition();
        const centerDist = vec3.distance(pos1, pos2);
        
        return Math.max(r1, r2) + centerDist * 0.5;
    }

    getWorldPosition(): vec3 {
        // return the midpoint between the two primitives
        const pos1 = this.prim1.getWorldPosition();
        const pos2 = this.prim2.getWorldPosition();
        return vec3.fromValues(
            (pos1[0] + pos2[0]) / 2,
            (pos1[1] + pos2[1]) / 2,
            (pos1[2] + pos2[2]) / 2
        );
    }

    public setTime(time: number): void {
        this.prim1.setTime(time);
        this.prim2.setTime(time);
    }
}