import { vec3 } from "gl-matrix";
import { Primitive } from "../util/primitives/primitive";
import { BoundingBox, computeBounds } from "./boundingBox";
import { AccelerationStructure, RayMarchContext, RayMarchState } from "./accelerationStructure";

export class BVHNode {
    public bounds: BoundingBox;
    public primitives: Primitive[];
    public left: BVHNode | null;
    public right: BVHNode | null;

    constructor(bounds: BoundingBox, primitives: Primitive[]) {
        this.bounds = bounds;
        this.primitives = primitives;
        this.left = null;
        this.right = null;
    }

    public isLeaf(): boolean {
        return this.left === null && this.right === null;
    }
}

export class BVH implements AccelerationStructure {
    private root: BVHNode;
    private maxDepth: number;
    private maxPrimitivesPerNode: number;

    constructor(
        primitives: Primitive[],
        bounds: BoundingBox,
        maxDepth: number = 20,
        maxPrimitivesPerNode: number = 2
    ) {
        this.maxDepth = maxDepth;
        this.maxPrimitivesPerNode = maxPrimitivesPerNode;
        
        // build initial bounding box from all primitives
        const primitiveBounds = computeBounds(primitives);
        
        this.root = this.buildNode(primitives, primitiveBounds, 0);
    }

    private buildNode(
        primitives: Primitive[],
        bounds: BoundingBox,
        depth: number
    ): BVHNode {
        const node = new BVHNode(bounds, []);

        // if valid leaf make it a leaf node
        if (depth >= this.maxDepth || primitives.length <= this.maxPrimitivesPerNode) {
            node.primitives = primitives;
            return node;
        }

        // choose axis based on longest dimension
        const size = vec3.create();
        vec3.subtract(size, bounds.max, bounds.min);
        
        let axis = 0;
        if (size[1] > size[0]) axis = 1;
        if (size[2] > size[axis]) axis = 2;

        // sort primitives along chosen axis by their center position
        const sortedPrimitives = [...primitives].sort((a, b) => {
            const aPos = a.getWorldPosition()[axis];
            const bPos = b.getWorldPosition()[axis];
            return aPos - bPos;
        });

        // split at median (cuz its easier than surface area heuristics)
        const mid = Math.floor(sortedPrimitives.length / 2);
        const leftStuff = sortedPrimitives.slice(0, mid);
        const rightStuff = sortedPrimitives.slice(mid);

        // if split resulted in empty partition, make it a leaf
        if (leftStuff.length === 0 || rightStuff.length === 0) {
            node.primitives = primitives;
            return node;
        }

        // compute bounds for each half
        const leftBounds = computeBounds(leftStuff);
        const rightBounds = computeBounds(rightStuff);

        // recursively build child nodes
        node.left = this.buildNode(leftStuff, leftBounds, depth + 1);
        node.right = this.buildNode(rightStuff, rightBounds, depth + 1);

        return node;
    }

    // get a set of all primitives that this point might affect
    public getPrimitivesAt(point: vec3): Primitive[] {
        const results = new Set<Primitive>();
        this.queryNode(this.root, point, results);
        return Array.from(results);
    }

    private queryNode(node: BVHNode, point: vec3, results: Set<Primitive>): void {
        if (!node.bounds.contains(point)) {
            return;
        }

        // if node is a leaf add all the primitives it contains
        if (node.isLeaf()) {
            for (const primitive of node.primitives) {
                results.add(primitive);
            }
            return;
        }

        // otherwise recurse into children
        if (node.left) {
            this.queryNode(node.left, point, results);
        }
        if (node.right) {
            this.queryNode(node.right, point, results);
        }
    }

    // find all bounding box intersections along a ray
    // returns sorted array of intersections to traverse thru [tEnter, tExit, node]
    // algorithm psuedocode from: https://meistdan.github.io/publications/bvh_star/paper.pdf
    public findRayIntersections(
        origin: vec3,
        direction: vec3,
        tMin: number = 0,
        tMax: number = Infinity
    ): Array<{ tEnter: number; tExit: number; node: BVHNode }> {
        const intersections: Array<{ tEnter: number; tExit: number; node: BVHNode }> = [];
        
        // root contains all scene prims
        // push root to stack
        const stack: BVHNode[] = [this.root];

        // while stack not empty
        while (stack.length > 0) {
            // pop node from top of stack
            const node = stack.pop()!;

            // check if ray intersects node
            const hit = node.bounds.intersectRay(origin, direction);
            if (!hit) continue;

            // if it does take the enter and exit points of the box
            const [tEnter, tExit] = hit;

            // skip if intersection is behind ray or beyond max range
            if (tExit < tMin || tEnter > tMax) continue;

            // clamp to valid range
            const clampedEnter = Math.max(tEnter, tMin);
            const clampedExit = Math.min(tExit, tMax);

            if (!node.isLeaf()) {
                // if node is not a leaf then
                // for each child push the child onto the stack
                if (node.left) stack.push(node.left);
                if (node.right) stack.push(node.right);
            } else {
                // if leaf node with primitives
                // we want to check all these prims for ray intersect
                if (node.primitives && node.primitives.length > 0) {
                    intersections.push({
                        tEnter: clampedEnter,
                        tExit: clampedExit,
                        node: node
                    });
                }
            } 
        }

        // sort by tEnter so we traverse in correct order
        intersections.sort((a, b) => a.tEnter - b.tEnter);
        return intersections;
    }

    // acceleration structure callbacks
    public onRayMarchStart(context: RayMarchContext): RayMarchState | null {
        const intervals = this.findRayIntersections(
            context.rayOrigin,
            context.rayDirection,
            0,
            context.maxDistance
        );

        // if ray doesn't hit any bounding boxes we terminate cuz no primatives
        if (intervals.length === 0) {
            return { data: { intervals: [], terminate: true } };
        }

        // return state with intervals and current index
        return {
            data: {
                intervals: intervals,
                currentIntervalIdx: 0,
                terminate: false
            }
        };
    }

    public onRayMarchStep(context: RayMarchContext, state: RayMarchState): number {
        if (!state.data || state.data.terminate) {
            return -1; // terminate ray
        }

        const { intervals, currentIntervalIdx } = state.data;

        if (currentIntervalIdx >= intervals.length) {
            return -1; // no more intervals, terminate
        }

        const currentInterval = intervals[currentIntervalIdx];

        // if we're before the first interval, skip to it
        if (context.currentDistance < currentInterval.tEnter) {
            return currentInterval.tEnter - context.currentDistance;
        }

        // if we've exited current interval, move to next
        if (context.currentDistance > currentInterval.tExit) {
            state.data.currentIntervalIdx++;

            if (state.data.currentIntervalIdx < intervals.length) {
                const nextInterval = intervals[state.data.currentIntervalIdx];
                // skip to next interval
                if (nextInterval.tEnter > context.currentDistance) {
                    return nextInterval.tEnter - context.currentDistance;
                }
            } else {
                // no more intervals
                return -1;
            }
        }

        // we are inside a valid interval, go back to normal ray marching
        return 0;
    }
}
