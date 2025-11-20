import { mat4, vec3 } from "gl-matrix";
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

    // distance between this box and another (0 if overlapping)
    public distanceToBox(other: BoundingBox): number {
        let dx = 0;
        if (this.max[0] < other.min[0]) dx = other.min[0] - this.max[0]; // check ordering of the boxes
        else if (other.max[0] < this.min[0]) dx = this.min[0] - other.max[0];

        let dy = 0;
        if (this.max[1] < other.min[1]) dy = other.min[1] - this.max[1];
        else if (other.max[1] < this.min[1]) dy = this.min[1] - other.max[1];

        let dz = 0;
        if (this.max[2] < other.min[2]) dz = other.min[2] - this.max[2];
        else if (other.max[2] < this.min[2]) dz = this.min[2] - other.max[2];

        return Math.hypot(dx, dy, dz); // this function fire I don't have to do the sqrt thing now
    }

    // distance from a point to this bounding box (0 if point is inside)
    public distanceToPoint(point: vec3): number {
        let dx = 0;
        if (point[0] < this.min[0]) dx = this.min[0] - point[0];
        else if (point[0] > this.max[0]) dx = point[0] - this.max[0];

        let dy = 0;
        if (point[1] < this.min[1]) dy = this.min[1] - point[1];
        else if (point[1] > this.max[1]) dy = point[1] - this.max[1];

        let dz = 0;
        if (point[2] < this.min[2]) dz = this.min[2] - point[2];
        else if (point[2] > this.max[2]) dz = point[2] - this.max[2];

        return Math.hypot(dx, dy, dz);
    }

    // ray and bounding box intersection test
    // returns [tMin, tMax] if ray intersects box, null otherwise
    // ray is defined as: point = origin + t * direction
    public intersectRay(origin: vec3, direction: vec3): [number, number] | null {
        let tMin = -Infinity;
        let tMax = Infinity;

        // check each axis (x, y, z) separately
        for (let i = 0; i < 3; i++) {
            // if ray is going parallel to this axis, just check if we're between the bounds
            if (Math.abs(direction[i]) < 1e-10) {
                if (origin[i] < this.min[i] || origin[i] > this.max[i]) {
                    return null; // we're outside the box on this axis, so no hit
                }
            } else {
                // calculate where the ray hits the two planes on this axis
                const invD = 1.0 / direction[i];
                let t0 = (this.min[i] - origin[i]) * invD; // near plane
                let t1 = (this.max[i] - origin[i]) * invD; // far plane

                // make sure t0 is the closer one
                if (t0 > t1) {
                    const temp = t0;
                    t0 = t1;
                    t1 = temp;
                }

                // keep track of the latest entry and earliest exit across all axes
                tMin = Math.max(tMin, t0);
                tMax = Math.min(tMax, t1);

                // if we enter after we exit, we miss the box
                if (tMin > tMax) {
                    return null;
                }
            }
        }

        return [tMin, tMax];
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

        // calculate rough scale by taking max of each direction from local->world
        // primitive.transform is world->local, so invert once here
        const localToWorld = mat4.create();
        const ok = mat4.invert(localToWorld, primitive.transform);
        const m = ok ? localToWorld : primitive.transform; // just in-case its not invertible
        const scaleX = Math.hypot(m[0], m[1], m[2]);
        const scaleY = Math.hypot(m[4], m[5], m[6]);
        const scaleZ = Math.hypot(m[8], m[9], m[10]);
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
