import { vec3 } from "gl-matrix";
import { Primitive } from "./primitives/primitive";

/**
 * Axis-aligned bounding box
 */
export class AABB {
    min: vec3;
    max: vec3;

    constructor(min: vec3 = vec3.fromValues(Infinity, Infinity, Infinity), 
                max: vec3 = vec3.fromValues(-Infinity, -Infinity, -Infinity)) {
        this.min = vec3.clone(min);
        this.max = vec3.clone(max);
    }

    /**
     * Expand the AABB to include a point
     */
    expandByPoint(point: vec3): void {
        this.min[0] = Math.min(this.min[0], point[0]);
        this.min[1] = Math.min(this.min[1], point[1]);
        this.min[2] = Math.min(this.min[2], point[2]);

        this.max[0] = Math.max(this.max[0], point[0]);
        this.max[1] = Math.max(this.max[1], point[1]);
        this.max[2] = Math.max(this.max[2], point[2]);
    }

    /**
     * Expand the AABB to include another AABB
     */
    expandByAABB(other: AABB): void {
        this.min[0] = Math.min(this.min[0], other.min[0]);
        this.min[1] = Math.min(this.min[1], other.min[1]);
        this.min[2] = Math.min(this.min[2], other.min[2]);

        this.max[0] = Math.max(this.max[0], other.max[0]);
        this.max[1] = Math.max(this.max[1], other.max[1]);
        this.max[2] = Math.max(this.max[2], other.max[2]);
    }

    /**
     * Get the surface area of the AABB (used for SAH)
     */
    getSurfaceArea(): number {
        const dx = this.max[0] - this.min[0];
        const dy = this.max[1] - this.min[1];
        const dz = this.max[2] - this.min[2];
        return 2 * (dx * dy + dy * dz + dz * dx);
    }

    /**
     * Get the center of the AABB
     */
    getCenter(): vec3 {
        return vec3.fromValues(
            (this.min[0] + this.max[0]) * 0.5,
            (this.min[1] + this.max[1]) * 0.5,
            (this.min[2] + this.max[2]) * 0.5
        );
    }

    /**
     * Check if a point is inside the AABB
     */
    containsPoint(point: vec3): boolean {
        return point[0] >= this.min[0] && point[0] <= this.max[0] &&
               point[1] >= this.min[1] && point[1] <= this.max[1] &&
               point[2] >= this.min[2] && point[2] <= this.max[2];
    }

    /**
     * Ray-AABB intersection (conservative estimate for acceleration)
     */
    rayIntersects(rayOrigin: vec3, rayDir: vec3): boolean {
        const tMin = vec3.create();
        const tMax = vec3.create();

        for (let i = 0; i < 3; i++) {
            const invDir = 1.0 / rayDir[i];
            const t0 = (this.min[i] - rayOrigin[i]) * invDir;
            const t1 = (this.max[i] - rayOrigin[i]) * invDir;

            tMin[i] = Math.min(t0, t1);
            tMax[i] = Math.max(t0, t1);
        }

        const tEnter = Math.max(tMin[0], Math.max(tMin[1], tMin[2]));
        const tExit = Math.min(tMax[0], Math.min(tMax[1], tMax[2]));

        return tEnter <= tExit && tExit > 0;
    }

    /**
     * Distance from a point to the AABB surface (conservative)
     */
    distanceToPoint(point: vec3): number {
        const clipped = vec3.create();
        clipped[0] = Math.max(this.min[0], Math.min(point[0], this.max[0]));
        clipped[1] = Math.max(this.min[1], Math.min(point[1], this.max[1]));
        clipped[2] = Math.max(this.min[2], Math.min(point[2], this.max[2]));

        return vec3.distance(point, clipped);
    }

    clone(): AABB {
        return new AABB(this.min, this.max);
    }
}

/**
 * BVH node - either a leaf (contains primitives) or internal (has children)
 */
export class BVHNode {
    bounds: AABB;
    left: BVHNode | null = null;
    right: BVHNode | null = null;
    primitives: Primitive[] = [];
    isLeaf: boolean = false;

    constructor(bounds: AABB) {
        this.bounds = bounds;
    }
}

/**
 * Bounding Volume Hierarchy for efficient spatial acceleration
 */
export class BVH {
    root: BVHNode | null = null;
    private maxPrimitivesPerLeaf: number = 8; // tune based on raymarcher cost

    /**
     * Build the BVH from a list of primitives
     */
    build(primitives: Primitive[]): void {
        if (primitives.length === 0) {
            this.root = null;
            return;
        }

        // Compute bounds for each primitive
        const primitivesBounds: Array<{ primitive: Primitive; bounds: AABB }> = primitives.map(prim => ({
            primitive: prim,
            bounds: this.computePrimitiveBounds(prim)
        }));

        // Build BVH recursively
        this.root = this.buildNode(primitivesBounds);
    }

    /**
     * Compute a conservative bounding box for a primitive
     * Uses sampling approach since precise SDF bounds are expensive
     */
    private computePrimitiveBounds(primitive: Primitive): AABB {
        const bounds = new AABB();
        const samples = 8; // number of sample points per axis
        const range = 3.0; // search radius in local space

        for (let x = -range; x <= range; x += (2 * range) / samples) {
            for (let y = -range; y <= range; y += (2 * range) / samples) {
                for (let z = -range; z <= range; z += (2 * range) / samples) {
                    const point = vec3.fromValues(x, y, z);
                    // Transform to world space
                    const worldPoint = vec3.create();
                    vec3.transformMat4(worldPoint, point, primitive.transform);
                    
                    // Only add points that are close to the surface
                    const dist = Math.abs(primitive.sdf(worldPoint));
                    if (dist < 0.5) {
                        bounds.expandByPoint(worldPoint);
                    }
                }
            }
        }

        // Expand bounds slightly for safety
        const expansion = vec3.fromValues(0.2, 0.2, 0.2);
        vec3.subtract(bounds.min, bounds.min, expansion);
        vec3.add(bounds.max, bounds.max, expansion);

        return bounds;
    }

    /**
     * Recursively build BVH nodes
     */
    private buildNode(items: Array<{ primitive: Primitive; bounds: AABB }>): BVHNode {
        // Create bounds for this node
        const nodeBounds = new AABB();
        for (const item of items) {
            nodeBounds.expandByAABB(item.bounds);
        }

        const node = new BVHNode(nodeBounds);

        // Base case: few enough primitives to be a leaf
        if (items.length <= this.maxPrimitivesPerLeaf) {
            node.isLeaf = true;
            node.primitives = items.map(item => item.primitive);
            return node;
        }

        // Split using Surface Area Heuristic (SAH)
        const splitAxis = this.findBestSplitAxis(items);
        const splitIndex = this.partitionBySAH(items, splitAxis);

        if (splitIndex <= 0 || splitIndex >= items.length) {
            // Fallback: just make it a leaf if split failed
            node.isLeaf = true;
            node.primitives = items.map(item => item.primitive);
            return node;
        }

        // Recursively build children
        node.left = this.buildNode(items.slice(0, splitIndex));
        node.right = this.buildNode(items.slice(splitIndex));

        return node;
    }

    /**
     * Find the best axis to split on (x=0, y=1, z=2)
     */
    private findBestSplitAxis(items: Array<{ primitive: Primitive; bounds: AABB }>): number {
        let bestAxis = 0;
        let bestSpread = 0;

        for (let axis = 0; axis < 3; axis++) {
            let minVal = Infinity;
            let maxVal = -Infinity;

            for (const item of items) {
                const center = item.bounds.getCenter();
                minVal = Math.min(minVal, center[axis]);
                maxVal = Math.max(maxVal, center[axis]);
            }

            const spread = maxVal - minVal;
            if (spread > bestSpread) {
                bestSpread = spread;
                bestAxis = axis;
            }
        }

        return bestAxis;
    }

    /**
     * Partition items using Surface Area Heuristic
     */
    private partitionBySAH(items: Array<{ primitive: Primitive; bounds: AABB }>, axis: number): number {
        // For simplicity, sort by center and split in middle
        // A full SAH implementation would evaluate multiple split positions
        items.sort((a, b) => {
            const centerA = a.bounds.getCenter();
            const centerB = b.bounds.getCenter();
            return centerA[axis] - centerB[axis];
        });

        return Math.floor(items.length / 2);
    }

    /**
     * Find the closest distance to any primitive in the BVH
     * Only evaluates SDFs for primitives that might be relevant
     */
    findClosestDistance(position: vec3, maxDist: number): number {
        if (!this.root) return maxDist;
        return this.findClosestDistanceRecursive(this.root, position, maxDist);
    }

    /**
     * Recursively search the BVH tree for closest distance
     */
    private findClosestDistanceRecursive(node: BVHNode, position: vec3, maxDist: number): number {
        // Prune nodes whose bounds are too far away
        const distToBounds = node.bounds.distanceToPoint(position);
        if (distToBounds > maxDist) {
            return maxDist;
        }

        if (node.isLeaf) {
            // Evaluate all primitives in the leaf
            let closest = maxDist;
            for (const primitive of node.primitives) {
                const dist = primitive.sdf(position);
                closest = Math.min(closest, dist);
                // Early termination if we're very close
                if (closest < 0.001) break;
            }
            return closest;
        } else {
            // Recursively search children
            let closest = maxDist;

            if (node.left) {
                closest = this.findClosestDistanceRecursive(node.left, position, closest);
            }

            if (node.right) {
                closest = this.findClosestDistanceRecursive(node.right, position, closest);
            }

            console.log(closest);
            return closest;
        }
    }

    /**
     * Alternative method: evaluate only nearby primitives (for diagnostic purposes)
     */
    findNearbyPrimitives(position: vec3, maxDist: number): Primitive[] {
        const result: Primitive[] = [];
        if (this.root) {
            this.findNearbyPrimitivesRecursive(this.root, position, maxDist, result);
        }
        return result;
    }

    /**
     * Recursively collect nearby primitives
     */
    private findNearbyPrimitivesRecursive(node: BVHNode, position: vec3, maxDist: number, result: Primitive[]): void {
        const distToBounds = node.bounds.distanceToPoint(position);
        if (distToBounds > maxDist) {
            return;
        }

        if (node.isLeaf) {
            result.push(...node.primitives);
        } else {
            if (node.left) {
                this.findNearbyPrimitivesRecursive(node.left, position, maxDist, result);
            }
            if (node.right) {
                this.findNearbyPrimitivesRecursive(node.right, position, maxDist, result);
            }
        }
    }
}
