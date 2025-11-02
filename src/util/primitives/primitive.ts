import { mat4, vec3 } from "gl-matrix";

export abstract class Primitive {
    transform: mat4;

    // holds the combined transform of the object and the camera, inverted.
    // can be applied directly to worldspace to get localspace.

    constructor(transform: mat4) {
        this.transform = transform;
    }

    abstract localSdf(localPos: vec3): number;

    // converts the coordinate spaces considering camera and object transform
    sdf(pos: vec3): number {
        const localPos = vec3.create();
        vec3.transformMat4(localPos, pos, this.transform);

        // evaluate local SDF
        return this.localSdf(localPos);
    }
}