// abstract class for raymarcher.

// the raymarcher doesn't handle anything to do with the scene or camera transforms:
// all that other stuff is elsewhere for simplicity.

// the raymarcher will always render from the origin looking in the negative z
// direction. (this way, the x and y axes can still correspond to x and y, and
// the whole thing uses a right-handed 3d coordinate system.)

// for now, the raymarcher has a fixed FOV but this can (and probably will) be
// changed in future.

// shading is also handled elsewhere. The raymarcher should update only the
// depth, normal and SDF evaluations buffer.

import { Scene } from '../util/scene';

export abstract class Raymarcher {
    /**
     * runs the raymarcher on the scene and updates the relevant buffers.
     * @param scene the SceneSDF to render
     * @param depthBuffer the depth of the scene
     * @param normalBuffer the normal of the scene
     * @param SDFevaluationBuffer the number of SDFs evaluated for each pixel
     * @param iterationsBuffer the number of iterations for each pixel
     * @param width width of the buffers
     * @param height height of the buffers
     * @param time the current time in the scene (for animation, but otherwise unused)
     */
    public abstract runRaymarcher(
        scene: Scene,
        depthBuffer: Uint8ClampedArray,
        normalBuffer: Uint8ClampedArray,
        SDFevaluationBuffer: Uint16Array,
        iterationsBuffer: Uint16Array,
        width: number,
        height: number,
        time: number): void
}