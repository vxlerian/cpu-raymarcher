// for now, this always returns a default scene with a sphere

// import { Camera } from "./camera";
import { mat4, vec3 } from "gl-matrix";
import { Primitive } from "./primitives/primitive";
import { Sphere } from "./primitives/sphere";
import { Camera } from "./camera";
import { SceneManager } from "./sceneManager";
import { Octree, BoundingBox } from "../acceleration_structures/octree";

export class Scene {
    // a scene is a list of objects and one camera
    // private objects: Array<Object>
    // private camera: Camera
    public objectSDFs: Array<Primitive>
    public camera: Camera;
    public octree: Octree | null = null;
    public accelerationStructure: string = "None";
    private currentPresetIndex: number = 0;

    constructor(accelerationStructure: string = "None") {
        this.camera = new Camera;
        this.objectSDFs = new Array;
        this.accelerationStructure = accelerationStructure;
        this.loadPreset(0); // load default scene
    }

    public loadPreset(index: number) {
        this.currentPresetIndex = Math.max(0, Math.min(index, SceneManager.getPresetCount() - 1));
        const preset = SceneManager.getPreset(this.currentPresetIndex);

        // Clear existing objects and load new ones
        this.objectSDFs = [...preset.objects];
        
        // build octree if enabled as acceleration structure
        if (this.accelerationStructure == "Octree") {
            this.buildOctree();
        } else {
            this.octree = null;
        }
    }

    private buildOctree() {
        // calculate bounds and create an octree with them
        const bounds = this.calculateSceneBounds();
        this.octree = new Octree(this.objectSDFs, bounds);
    }

    private calculateSceneBounds(): BoundingBox {
        // TODO : currently hard-coded... need to identify where prims are
        //        to define suitable bounds
        const min = vec3.fromValues(-10, -10, -10);
        const max = vec3.fromValues(10, 10, 10);
        return new BoundingBox(min, max);
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

    // get the min distance to the scene at a given position
    // uses an acceleration structure if enabled
    public getDistance(position: vec3, sdfEvaluationCounter?: { count: number }): number {
        const MAX_DIST = 10;
        let closestDistance = MAX_DIST;
        
        if (this.accelerationStructure === "Octree" && this.octree) {
            // Octree-accelerated: only check nearby primitives (in current octreeNode)
            const candidates = this.octree.getPrimitivesAt(position);
            
            for (const primitive of candidates) {
                if (sdfEvaluationCounter) sdfEvaluationCounter.count++;
                closestDistance = Math.min(primitive.sdf(position), closestDistance);
            }
        } else {
            // Normal: check all primitives
            for (const primitive of this.objectSDFs) {
                if (sdfEvaluationCounter) sdfEvaluationCounter.count++;
                closestDistance = Math.min(primitive.sdf(position), closestDistance);
            }
        }
        
        return closestDistance;
    }

}