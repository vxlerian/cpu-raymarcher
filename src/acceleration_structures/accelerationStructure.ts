import { vec3 } from "gl-matrix";
import { Primitive } from "../util/primitives/primitive";

// stuff to pass to acceleration structure during raymarching
export interface RayMarchContext {
    rayOrigin: vec3;
    rayDirection: vec3;
    currentDistance: number;
    maxDistance: number;
}

// get initial state for use during raymarching
export interface RayMarchState {
    // includes random data acceleration structures can use 
    // (bvh gets node intervals to allow for easy traversal)
    data?: any;
}

// Interface for all acceleration structures:
// currently...
// - Octree Subdivision
// - Bounding Volume Hierarchy
export interface AccelerationStructure {
    // returns a filtered array of primitives using the acceleration structure
    getPrimitivesAt(point: vec3): Primitive[];
    
    // called once before raymarching begins for a ray
    // returns initial state or null if not needed
    onRayMarchStart?(context: RayMarchContext): RayMarchState | null;
    
    // called at each step during raymarching
    // returns...
    // - distance to skip forward (0 = no skip, use normal marching)
    // - or -1 to terminate ray (early exit)
    onRayMarchStep?(context: RayMarchContext, state: RayMarchState): number;
    
    // called when raymarching completes (optional cleanup - not used rn but maybe later)
    onRayMarchEnd?(state: RayMarchState): void;
}
