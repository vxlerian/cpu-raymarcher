import { mat4, vec3 } from "gl-matrix";

export abstract class Primitive {
    transform: mat4;

    // holds the combined transform of the object and the camera, inverted.
    // can be applied directly to worldspace to get localspace.
    invSceneTransform: mat4;

    constructor(transform: mat4) {
        this.transform = transform;
        this.invSceneTransform = mat4.create();
    }

    abstract localSdf(localPos: vec3): number;

    // call this every time the camera or object transform changes
    public updateInverseSceneTransform(cameraTransform: mat4) {
        const camToWorld = mat4.create();
        mat4.invert(camToWorld, cameraTransform);

        mat4.multiply(this.invSceneTransform, camToWorld, this.transform);

        mat4.invert(this.invSceneTransform, this.invSceneTransform);
    }
    // converts the coordinate spaces considering camera and object transform
    sdf(pos: vec3): number {
        const localPos = vec3.create();
        vec3.transformMat4(localPos, pos, this.invSceneTransform);

        // evaluate local SDF
        return this.localSdf(localPos);
    }
}