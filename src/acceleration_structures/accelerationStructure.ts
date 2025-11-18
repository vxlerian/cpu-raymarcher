import { vec3 } from "gl-matrix";
import { Primitive } from "../util/primitives/primitive";

// Interface for all acceleration structures:
// currently...
// - Octree Subdivision
// - Bounding Volume Hierarchy
export interface AccelerationStructure {
    // returns a filtered array of primitives using the acceleration structure
    getPrimitivesAt(point: vec3): Primitive[];
}
