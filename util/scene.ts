// for now, this always returns a default scene with a sphere

// import { Camera } from "./camera";
import { mat4 } from "gl-matrix";
import { Primitive } from "./primitives/primitive";
import { Sphere } from "./primitives/sphere";
import { Camera } from "./camera";

export class Scene {
    // a scene is a list of objects and one camera
    // private objects: Array<Object>
    // private camera: Camera
    public objectSDFs: Array<Primitive>
    public camera: Camera;

    constructor() {
        this.camera = new Camera;

        this.objectSDFs = new Array;

        // TEMPORARILY hardcoded as a sphere
        const sphereTransformA = mat4.create();
        mat4.fromRotationTranslationScale(sphereTransformA, [0,0,0,1], [0,0,0], [1,1,1]);
        this.objectSDFs.push(new Sphere(sphereTransformA, 1));
        const sphereTransformB = mat4.create();
        mat4.fromRotationTranslationScale(sphereTransformB, [0,0,0,1], [0,1,0], [1,1,1]);
        this.objectSDFs.push(new Sphere(sphereTransformB, 0.6));
        const sphereTransformC = mat4.create();
        mat4.fromRotationTranslationScale(sphereTransformC, [0,0,0,1], [1,0,-0.5], [1,1,1]);
        this.objectSDFs.push(new Sphere(sphereTransformC, 0.9));
    }

    updateInverseSceneTransforms() {
        for (const primitive of this.objectSDFs) {
            primitive.updateInverseSceneTransform(this.camera.cameraTransform);
        }
    }
}