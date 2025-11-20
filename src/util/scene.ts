// for now, this always returns a default scene with a sphere

import { mat4, vec3 } from "gl-matrix";
import { Primitive } from "./primitives/primitive";
import { Sphere } from "./primitives/sphere";
import { Camera } from "./camera";
import { SceneManager } from "./sceneManager";
import { BoundingBox } from "../acceleration_structures/boundingBox";
import { Octree } from "../acceleration_structures/octree";
import { BVH } from "../acceleration_structures/bvh";
import { AccelerationStructure } from "../acceleration_structures/accelerationStructure";

export class Scene {
    // a scene is a list of objects and one camera
    // private objects: Array<Object>
    // private camera: Camera
    public objectSDFs: Array<Primitive>
    public camera: Camera;
    public octree: Octree | null = null;
    public bvh: BVH | null = null;
    public accelerationStructure: string = "None";
    private currentPresetIndex: number = 0;
    private cachedBounds: BoundingBox | null = null;

    constructor(accelerationStructure: string = "None") {
        this.camera = new Camera;
        this.objectSDFs = new Array;
        this.accelerationStructure = accelerationStructure;
        this.loadPreset(0); // load default scene
    }

    // get the current acceleration structure implementation
    public getAccelerationStructure(): AccelerationStructure | null {
        if (this.accelerationStructure === "Octree") return this.octree;
        if (this.accelerationStructure === "BVH") return this.bvh;
        return null;
    }

    public loadPreset(index: number) {
        this.currentPresetIndex = Math.max(0, Math.min(index, SceneManager.getPresetCount() - 1));
        const preset = SceneManager.getPreset(this.currentPresetIndex);

        // Clear existing objects and load new ones
        this.objectSDFs = [...preset.objects];
        
        // reset cached bounds
        this.cachedBounds = null;
        
        // build acceleration structure if enabled
        if (this.accelerationStructure == "Octree") {
            this.buildOctree();
            this.bvh = null;
        } else if (this.accelerationStructure == "BVH") {
            this.buildBVH();
            this.octree = null;
        } else {
            this.octree = null;
            this.bvh = null;
        }
    }

    private buildOctree() {
        // calculate bounds and create an octree with them
        const bounds = this.getSceneBounds();
        this.octree = new Octree(this.objectSDFs, bounds);
    }

    private buildBVH() {
        // calculate bounds and create a BVH with them
        const bounds = this.getSceneBounds();
        this.bvh = new BVH(this.objectSDFs, bounds);
    }

    private getSceneBounds(): BoundingBox {
        if (!this.cachedBounds) {
            // cache the bounds for visualiser performance
            this.cachedBounds = this.calculateSceneBounds();
        }
        return this.cachedBounds;
    }

    private calculateSceneBounds(): BoundingBox {
        return new BoundingBox(
            vec3.fromValues(-10, -10, -10),
            vec3.fromValues(10, 10, 10),
        );

        // might have to sack actual bounds checking - its somehow worse?
        // TODO: look into if im calculating this incorrectly

        // calculate bounds dynamically based on all primitives in the scene
        const min = vec3.fromValues(Infinity, Infinity, Infinity);
        const max = vec3.fromValues(-Infinity, -Infinity, -Infinity);

        for (let i = 0; i < this.objectSDFs.length; i++) {
            const primitive = this.objectSDFs[i];
            const pos = primitive.getWorldPosition();
            const radius = primitive.getLocalBoundingRadius();

            // update min
            min[0] = Math.min(min[0], pos[0] - radius);
            min[1] = Math.min(min[1], pos[1] - radius);
            min[2] = Math.min(min[2], pos[2] - radius);

            // update max
            max[0] = Math.max(max[0], pos[0] + radius);
            max[1] = Math.max(max[1], pos[1] + radius);
            max[2] = Math.max(max[2], pos[2] + radius);
        }

        // add some padding to be safe :P
        const padding = 0.1;
        vec3.subtract(min, min, vec3.fromValues(padding, padding, padding));
        vec3.add(max, max, vec3.fromValues(padding, padding, padding));

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
            // Octree-accelerated: get the leaf node for this position
            const node = this.octree.findNode(position);
            if (node) {
                if (node.primitives.length > 0) {
                    // this node isn't empty we only compute sdfs of these ones
                    // evaluate only primitives in this node
                    for (const primitive of node.primitives) {
                        if (sdfEvaluationCounter) sdfEvaluationCounter.count++;
                        closestDistance = Math.min(primitive.sdf(position), closestDistance);
                    }
                } else if (node.isEmpty) {
                    // empty node: use conservative precomputed minDistance
                    const safety = 0.99; // avoid overshooting between nodes
                    closestDistance = Math.min(closestDistance, node.minDistance * safety);
                } 
                return closestDistance;
            }
            // outside the octree bounds??? ig fall back to full evaluation
        } else if (this.accelerationStructure === "BVH" && this.bvh) {
            // BVH-accelerated: only check nearby primitives
            let candidates = this.bvh.getPrimitivesAt(position);
            
            // if nothing inside bounding box revert to full evaluation
            // lowk not sure why this happens?
            candidates = candidates.length === 0 ? this.objectSDFs : candidates;
            
            for (const primitive of candidates) {
                if (sdfEvaluationCounter) sdfEvaluationCounter.count++;
                closestDistance = Math.min(primitive.sdf(position), closestDistance);
            }
            
            return closestDistance;
        }

        // Normal: check all primitives
        for (const primitive of this.objectSDFs) {
            if (sdfEvaluationCounter) sdfEvaluationCounter.count++;
            closestDistance = Math.min(primitive.sdf(position), closestDistance);
        }
        
        return closestDistance;
    }

}