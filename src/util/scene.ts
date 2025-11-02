// for now, this always returns a default scene with a sphere

// import { Camera } from "./camera";
import { mat4 } from "gl-matrix";
import { Primitive } from "./primitives/primitive";
import { Sphere } from "./primitives/sphere";
import { Camera } from "./camera";
import { SceneManager } from "./sceneManager";

export class Scene {
    // a scene is a list of objects and one camera
    // private objects: Array<Object>
    // private camera: Camera
    public objectSDFs: Array<Primitive>
    public camera: Camera;
    private currentPresetIndex: number = 0;

    constructor() {
        this.camera = new Camera;
        this.objectSDFs = new Array;
        this.loadPreset(0); // load default scene
    }

    public loadPreset(index: number) {
        this.currentPresetIndex = Math.max(0, Math.min(index, SceneManager.getPresetCount() - 1));
        const preset = SceneManager.getPreset(this.currentPresetIndex);

        // Clear existing objects and load new ones
        this.objectSDFs = [...preset.objects];
    }

    public nextPreset() {
        this.loadPreset(Math.min(this.currentPresetIndex + 1, SceneManager.getPresetCount()));
    }

    public previousPreset() {
        this.loadPreset(Math.max(this.currentPresetIndex - 1, 0));
    }

    public getCurrentPresetInfo() {
        const preset = SceneManager.getPreset(this.currentPresetIndex);
        return {
            index: this.currentPresetIndex,
            name: preset.name,
            total: SceneManager.getPresetCount()
        };
    }

}