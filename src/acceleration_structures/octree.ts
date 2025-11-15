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

    // get a bounding box for a primitive using a sphere based on radius
    public static fromPrimitive(primitive: Primitive): BoundingBox {
        const worldPos = primitive.getWorldPosition();
        const localRadius = primitive.getLocalBoundingRadius();

        // TODO: currently doesn't account for scale of the object :(
        
        // add some padding just in case
        const r = localRadius * 1.1;

        return new BoundingBox(
            vec3.fromValues(worldPos[0] - r, worldPos[1] - r, worldPos[2] - r),
            vec3.fromValues(worldPos[0] + r, worldPos[1] + r, worldPos[2] + r)
        );
    }
}

export class OctreeNode {
    public bounds: BoundingBox;
    public primitives: Primitive[];
    public children: OctreeNode[] | null;

    constructor(bounds: BoundingBox, primitives: Primitive[]) {
        this.bounds = bounds;
        this.primitives = primitives;
        this.children = null;
    }

    public isLeaf(): boolean {
        return this.children === null;
    }
}

export class Octree {
    private root: OctreeNode;
    private maxDepth: number;
    private maxPrimitivesPerNode: number;

    constructor(
        primitives: Primitive[],
        bounds: BoundingBox,
        maxDepth: number = 6,
        maxPrimitivesPerNode: number = 4
    ) {
        this.maxDepth = maxDepth;
        this.maxPrimitivesPerNode = maxPrimitivesPerNode;
        this.root = this.buildNode(primitives, bounds, 0);
    }

    private buildNode(
        primitives: Primitive[],
        bounds: BoundingBox,
        depth: number
    ): OctreeNode {
        const node = new OctreeNode(bounds, []);

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
                node.children.push(new OctreeNode(childBounds[i], []));
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
}
