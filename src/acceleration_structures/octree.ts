import { vec3 } from "gl-matrix";
import { Primitive } from "../util/primitives/primitive";
import { BoundingBox } from "./boundingBox";
import { AccelerationStructure } from "./accelerationStructure";

export class OctreeNode {
    public bounds: BoundingBox;
    public primitives: Primitive[];
    public children: OctreeNode[] | null;
    public level: number;
    public isEmpty: boolean;

    constructor(bounds: BoundingBox, primitives: Primitive[], level: number) {
        this.bounds = bounds;
        this.primitives = primitives;
        this.children = null;
        this.level = level;
        this.isEmpty = true;
    }

    public isLeaf(): boolean {
        return this.children === null;
    }
}

export class Octree implements AccelerationStructure {
    private root: OctreeNode;
    private maxDepth: number;
    private maxPrimitivesPerNode: number;
    private primitives: Primitive[];
    private sceneBounds: BoundingBox;

    constructor(
        primitives: Primitive[],
        bounds: BoundingBox,
        maxDepth: number = 6,
        maxPrimitivesPerNode: number = 4
    ) {
        this.maxDepth = maxDepth;
        this.maxPrimitivesPerNode = maxPrimitivesPerNode;
        this.primitives = primitives;
        this.sceneBounds = bounds;
        this.root = this.buildNode(primitives, bounds, 0);
        this.computeEmptySpace(this.root);
    }

    private buildNode(
        primitives: Primitive[],
        bounds: BoundingBox,
        depth: number
    ): OctreeNode {
        const node = new OctreeNode(bounds, [], depth);

        // if valid leaf make it a leaf node
        if (depth >= this.maxDepth || primitives.length <= this.maxPrimitivesPerNode) {
            node.primitives = primitives;
            return node;
        }

        // otherwise we subdivide into 8 octants
        const center = bounds.center();
        const childBounds: BoundingBox[] = [];

        for (let zSplit = 0; zSplit < 2; zSplit++) {            // front (0) or back (1)
            for (let ySplit = 0; ySplit < 2; ySplit++) {        // bottom (0) or top (1)
                for (let xSplit = 0; xSplit < 2; xSplit++) {    // left (0) or right (1)
                    // Determine bounds for this octant
                    const minX = xSplit === 0 ? bounds.min[0] : center[0];
                    const maxX = xSplit === 0 ? center[0] : bounds.max[0];
                    
                    const minY = ySplit === 0 ? bounds.min[1] : center[1];
                    const maxY = ySplit === 0 ? center[1] : bounds.max[1];
                    
                    const minZ = zSplit === 0 ? bounds.min[2] : center[2];
                    const maxZ = zSplit === 0 ? center[2] : bounds.max[2];

                    childBounds.push(new BoundingBox(
                        vec3.fromValues(minX, minY, minZ),
                        vec3.fromValues(maxX, maxY, maxZ)
                    ));
                }
            }
        }

        // assign primitives to children
        const childPrimitives: Primitive[][] = Array.from({ length: 8 }, () => []);

        for (const primitive of primitives) {
            const primBounds = BoundingBox.fromPrimitive(primitive);

            for (let i = 0; i < 8; i++) {
                // if there is a primative within the bounds of this child
                // append it to its list of primatives
                if (childBounds[i].intersects(primBounds)) {
                    childPrimitives[i].push(primitive);
                }
            }
        }

        // create child nodes
        node.children = [];
        for (let i = 0; i < 8; i++) {
            if (childPrimitives[i].length > 0) {
                node.children.push(this.buildNode(childPrimitives[i], childBounds[i], depth + 1));
            } else {
                // create empty leaf for null children
                const emptyNode = new OctreeNode(childBounds[i], [], depth + 1);
                node.children.push(emptyNode);
            }
        }

        return node;
    }

    // get a set of all primatives that this point might affect
    public getPrimitivesAt(point: vec3): Primitive[] {
        const results = new Set<Primitive>();
        this.queryNode(this.root, point, results);
        return Array.from(results);
    }

    private queryNode(node: OctreeNode, point: vec3, results: Set<Primitive>): void {
        if (!node.bounds.contains(point)) {
            return;
        }

        // if node is a leaf add all the primatives it contains
        if (node.isLeaf()) {
            for (const primitive of node.primitives) {
                results.add(primitive);
            }
            return;
        }

        // otherwise recurse into its children
        if (node.children) {
            for (const child of node.children) {
                this.queryNode(child, point, results);
            }
        }
    }
    
    // Compute empty space flags based on SDF evaluation
    private computeEmptySpace(node: OctreeNode): void {
        if (node.isLeaf()) {
            // evaluate SDF to determine if node is actually empty
            const center = node.bounds.center();
            const sdf = this.evaluateSDF(center);
            const diagonal = vec3.distance(node.bounds.min, node.bounds.max);
            const threshold = diagonal * 0.5;
            
            // node is empty if center is far enough from any surface
            node.isEmpty = sdf > threshold;
            return;
        }
        
        // recursively compute for children first
        else if (node.children) {
            let allChildrenEmpty = true;
            for (const child of node.children) {
                this.computeEmptySpace(child);
                if (!child.isEmpty) {
                    allChildrenEmpty = false;
                }
            }
            // mark parent as empty if all children are empty
            node.isEmpty = allChildrenEmpty;
        } 
    }
    
    // evaluate SDF at a point by checking all primitives
    private evaluateSDF(point: vec3): number {
        let minDist = Infinity;
        for (const primitive of this.primitives) {
            const dist = primitive.sdf(point);
            minDist = Math.min(minDist, dist);
        }
        return minDist;
    }
    
    // ray-box intersection for octree traversal
    // returns [tEnter, tExit] or null if no intersection
    public intersectRayBox(rayOrigin: vec3, rayDir: vec3, box: BoundingBox): [number, number] | null {
        const tMin = vec3.create();
        const tMax = vec3.create();
        
        for (let i = 0; i < 3; i++) {
            const invD = 1.0 / rayDir[i];
            let t0 = (box.min[i] - rayOrigin[i]) * invD;
            let t1 = (box.max[i] - rayOrigin[i]) * invD;
            
            if (invD < 0.0) {
                [t0, t1] = [t1, t0];
            }
            
            tMin[i] = t0;
            tMax[i] = t1;
        }
        
        const tEnter = Math.max(tMin[0], tMin[1], tMin[2]);
        const tExit = Math.min(tMax[0], tMax[1], tMax[2]);
        
        if (tEnter > tExit || tExit < 0) {
            return null;
        }
        
        return [Math.max(0, tEnter), tExit];
    }
    
    // find the octree node containing a point
    public findNode(point: vec3): OctreeNode | null {
        return this.findNodeRecursive(this.root, point);
    }
    
    private findNodeRecursive(node: OctreeNode, point: vec3): OctreeNode | null {
        if (!node.bounds.contains(point)) {
            return null;
        }
        
        // if its a leaf or at max depth, return this node
        if (node.isLeaf() || node.level === this.maxDepth) {
            return node;
        }
        
        // traverse to children
        if (node.children) {
            for (const child of node.children) {
                const found = this.findNodeRecursive(child, point);
                if (found) {
                    return found;
                }
            }
        }
        
        return node;
    }
    
    // march a ray through the octree, skipping empty nodes
    // returns distance to skip or 0 if we should evaluate normally (normal algo)
    public marchRay(rayOrigin: vec3, rayDir: vec3, currentDist: number): number {
        // get current position along ray
        const currentPos = vec3.create();
        vec3.scaleAndAdd(currentPos, rayOrigin, rayDir, currentDist);
        
        // find node at current position
        const node = this.findNode(currentPos);
        
        if (!node) {
            return 0; // outside octree, evaluate normally
        }
        
        // if node is empty, skip to next node boundary
        if (node.isEmpty) {
            const intersection = this.intersectRayBox(rayOrigin, rayDir, node.bounds);
            if (intersection) {
                const [_, tExit] = intersection;
                // skip to exit point plus small offset to enter new box
                return Math.max(0, tExit - currentDist + 0.001);
            }
        }
        
        return 0; // node is not empty, evaluate normally
    }
}
