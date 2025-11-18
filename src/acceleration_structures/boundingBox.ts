import { vec3 } from "gl-matrix";
import { Primitive } from "../util/primitives/primitive";

// represents a bounding 3d area for primitives
export class BoundingBox {
    public min: vec3;
    public max: vec3;

    constructor(min: vec3, max: vec3) {
        this.min = vec3.clone(min);
        this.max = vec3.clone(max);
    }

    // checks if the bounding box contains a point
    public contains(point: vec3): boolean {
        return (
            point[0] >= this.min[0] && point[0] <= this.max[0] &&
            point[1] >= this.min[1] && point[1] <= this.max[1] &&
            point[2] >= this.min[2] && point[2] <= this.max[2]
        );
    }

    // checks if two bounding boxes intersect with each other
    public intersects(other: BoundingBox): boolean {
        return (
            this.min[0] <= other.max[0] && this.max[0] >= other.min[0] &&
            this.min[1] <= other.max[1] && this.max[1] >= other.min[1] &&
            this.min[2] <= other.max[2] && this.max[2] >= other.min[2]
        );
    }

    // gets the center of the bounding box
    public center(): vec3 {
        return vec3.fromValues(
            (this.min[0] + this.max[0]) / 2,
            (this.min[1] + this.max[1]) / 2,
            (this.min[2] + this.max[2]) / 2
        );
    }

    // merges two bounding boxes together (for bvh)
    public merge(other: BoundingBox): BoundingBox {
        return new BoundingBox(
            vec3.fromValues(
                Math.min(this.min[0], other.min[0]),
                Math.min(this.min[1], other.min[1]),
                Math.min(this.min[2], other.min[2])
            ),
            vec3.fromValues(
                Math.max(this.max[0], other.max[0]),
                Math.max(this.max[1], other.max[1]),
                Math.max(this.max[2], other.max[2])
            )
        );
    }

    // get a bounding box for a primitive using a sphere based on radius
    public static fromPrimitive(primitive: Primitive): BoundingBox {
        const worldPos = primitive.getWorldPosition();
        const localRadius = primitive.getLocalBoundingRadius();

        // calculate rough scale by taking max of each direction
        const transform = primitive.transform;
        const scaleX = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1] + transform[2] * transform[2]);
        const scaleY = Math.sqrt(transform[4] * transform[4] + transform[5] * transform[5] + transform[6] * transform[6]);
        const scaleZ = Math.sqrt(transform[8] * transform[8] + transform[9] * transform[9] + transform[10] * transform[10]);
        const maxScale = Math.max(scaleX, scaleY, scaleZ);
        
        // padding just in case :P
        const r = localRadius * maxScale * 1.5;

        return new BoundingBox(
            vec3.fromValues(worldPos[0] - r, worldPos[1] - r, worldPos[2] - r),
            vec3.fromValues(worldPos[0] + r, worldPos[1] + r, worldPos[2] + r)
        );
    }
}

// compute tight bounding box around a set of primitives
export function computeBounds(primitives: Primitive[]): BoundingBox {
    if (primitives.length === 0) {
        return new BoundingBox(vec3.fromValues(0, 0, 0), vec3.fromValues(0, 0, 0));
    }

    let bounds = BoundingBox.fromPrimitive(primitives[0]);
    for (let i = 1; i < primitives.length; i++) {
        bounds = bounds.merge(BoundingBox.fromPrimitive(primitives[i]));
    }

    return bounds;
}
