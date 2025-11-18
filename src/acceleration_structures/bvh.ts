import { vec3 } from "gl-matrix";
import { Primitive } from "../util/primitives/primitive";
import { BoundingBox, computeBounds } from "./boundingBox";
import { AccelerationStructure } from "./accelerationStructure";

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
}
