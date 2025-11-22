import { mat4, vec3 } from "gl-matrix";
import { Primitive } from "../primitives/primitive";

export class Twist extends Primitive {
    primitive: Primitive;
    twistAmount: number;

    constructor(primitive: Primitive, twistAmount: number = 10.0) {
        super(primitive.transform);
        this.primitive = primitive;
        this.twistAmount = twistAmount;
    }

    localSdf(localPos: vec3): number {
        // get world pos
        const worldPos = vec3.create();
        const localToWorld = mat4.create();
        mat4.invert(localToWorld, this.transform);
        vec3.transformMat4(worldPos, localPos, localToWorld);

        // apply twist transformation 
        // credit: https://iquilezles.org/articles/distfunctions/
        const k = this.twistAmount;
        const c = Math.cos(k * worldPos[1]);
        const s = Math.sin(k * worldPos[1]);
        
        // create twisted position: rotate XZ plane based on Y coordinate
        const twistedPos = vec3.fromValues(
            c * worldPos[0] - s * worldPos[2],
            worldPos[1],
            s * worldPos[0] + c * worldPos[2]
        );

        // evaluate primitive at twisted position
        return this.primitive.sdf(twistedPos);
    }

    getLocalBoundingRadius(): number {
        // i think we can keep this the same?
        return this.primitive.getLocalBoundingRadius();
    }

    getWorldPosition(): vec3 {
        // same world position as primitive
        return this.primitive.getWorldPosition();
    }

    public setTime(time: number): void {
        this.primitive.setTime(time);
    }
}
