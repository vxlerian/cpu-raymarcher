import { mat4, vec3 } from "gl-matrix";

export abstract class Primitive {
    transform: mat4;

    // holds the combined transform of the object and the camera, inverted.
    // can be applied directly to worldspace to get localspace.

    constructor(transform: mat4) {
        this.transform = transform;
    }

    abstract localSdf(localPos: vec3): number;

    // returns a rough bounding radius in local space
    // TODO: could make this more accurate as its always a sphere rn
    abstract getLocalBoundingRadius(): number;

    // extract world position by inverting the transform
    public getWorldPosition(): vec3 {
        const localToWorld = mat4.create();
        mat4.invert(localToWorld, this.transform);
        
        // world position is in the translation component of the transform
        return vec3.fromValues(
            localToWorld[12],
            localToWorld[13],
            localToWorld[14]
        );
    }

    // converts the coordinate spaces considering camera and object transform
    sdf(pos: vec3): number {
        const localPos = vec3.create();
        vec3.transformMat4(localPos, pos, this.transform);

        // evaluate local SDF
        return this.localSdf(localPos);
    }

    // update time for animation (override in animated primitives)
    public setTime(time: number): void {
        // default: do nothing (most primitives dont need it)
    }
}