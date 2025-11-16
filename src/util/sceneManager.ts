import { vec3, mat4 } from "gl-matrix";
import { Primitive } from "./primitives/primitive";
import { Sphere } from "./primitives/sphere";
import { Box } from "./primitives/box";
import { Torus } from "./primitives/torus";

export type Scene = {
    name: string;
    objects: Primitive[];
};

export class SceneManager {
    private static createSphere(x: number, y: number, z: number, radius: number): Sphere {
        const transform = mat4.create();
        mat4.fromRotationTranslationScale(transform, [0,0,0,1], [x,y,z], [1,1,1]);
        return new Sphere(transform, radius);
    }

    private static createBox(x: number, y: number, z: number, halfSize: vec3): Box {
        const transform = mat4.create();
        mat4.fromRotationTranslationScale(transform, [0,0,0,1], [x,y,z], [1,1,1]);
        return new Box(transform, halfSize);
    }

    private static createTorus(x: number, y: number, z: number, radius: number): Primitive {
        const transform = mat4.create();
        mat4.fromRotationTranslationScale(transform, [0,0,0,1], [x,y,z], [1,1,1]);
        return new Torus(transform, radius, radius / 4);
    }

    public static readonly presets: Scene[] = [
        {
            name: "Sphere",
            objects: [
                SceneManager.createSphere(0, 0, 0, 1.5)
            ]
        },
        {
            name: "Grid of Spheres",
            objects: [
                SceneManager.createSphere(-1, -1, 0, 0.3),
                SceneManager.createSphere(0, -1, 0, 0.3),
                SceneManager.createSphere(1, -1, 0, 0.3),
                SceneManager.createSphere(-1, 0, 0, 0.3),
                SceneManager.createSphere(0, 0, 0, 0.3),
                SceneManager.createSphere(1, 0, 0, 0.3),
                SceneManager.createSphere(-1, 1, 0, 0.3),
                SceneManager.createSphere(0, 1, 0, 0.3),
                SceneManager.createSphere(1, 1, 0, 0.3)
            ]
        },
        {
            name: "Atom",
            objects: [
                SceneManager.createSphere(0, 0, 0, 0.5),
                SceneManager.createSphere(1.2, 0, 0, 0.3),
                SceneManager.createSphere(-1.2, 0, 0, 0.3),
                SceneManager.createSphere(0, 1.2, 0, 0.3),
                SceneManager.createSphere(0, -1.2, 0, 0.3),
                SceneManager.createSphere(0, 0, 1.2, 0.3),
                SceneManager.createSphere(0, 0, -1.2, 0.3)
            ]
        },
        {
            name: "Random Spheres",
            objects: [
                SceneManager.createSphere(0.8, -0.3, 0.2, 0.4),
                SceneManager.createSphere(-0.5, 0.9, -0.1, 0.5),
                SceneManager.createSphere(0.2, 0.1, 0.8, 0.3),
                SceneManager.createSphere(-0.9, -0.4, -0.6, 0.6),
                SceneManager.createSphere(0.4, -0.8, 0.5, 0.35),
                SceneManager.createSphere(-0.2, 0.6, -0.9, 0.4),
                SceneManager.createSphere(0.7, 0.3, -0.4, 0.25)
            ]
        },
        {
            name: "Cube",
            objects: [
                SceneManager.createBox(0, 0, 0, vec3.fromValues(1, 1, 1))
            ]
        },
        {
            name: "Sphere and Cube",
            objects: [
                SceneManager.createSphere(-0.7, 0, 0, 0.5),
                SceneManager.createBox(1, 0, 0, vec3.fromValues(0.5, 0.5, 0.5))
            ]
        },
        {
            name: "Pyramid of Boxes",
            objects: [
                SceneManager.createBox(0, -0.5, 0, vec3.fromValues(0.9, 0.25, 0.9)),
                SceneManager.createBox(0, 0, 0, vec3.fromValues(0.6, 0.25, 0.6)),
                SceneManager.createBox(0, 0.5, 0, vec3.fromValues(0.3, 0.25, 0.3))
            ]
        },
        {
            name: "Torus",
            objects: [
                SceneManager.createTorus(0, 0, 0, 1.3)
            ]
        },
        {
            name: "Dense Sphere Grid",
            objects: (() => {
                const spheres = [];
                const gridSize = 5;
                const spacing = 0.6;
                const offset = (gridSize - 1) * spacing / 2;
                
                for (let x = 0; x < gridSize; x++) {
                    for (let y = 0; y < gridSize; y++) {
                        for (let z = 0; z < gridSize; z++) {
                            spheres.push(SceneManager.createSphere(
                                x * spacing - offset,
                                y * spacing - offset,
                                z * spacing - offset,
                                0.15
                            ));
                        }
                    }
                }
                return spheres;
            })()
        }
    ];

    public static getPreset(index: number): Scene {
        return this.presets[Math.max(0, Math.min(index, this.presets.length - 1))];
    }

    public static getPresetCount(): number {
        return this.presets.length;
    }

    // Populates the select element with all available scenes
    public static populateSceneDropdown(selectElement: HTMLSelectElement, selectedIndex: number = 0): void {
        selectElement.innerHTML = '';
        
        for (let i = 0; i < this.presets.length; i++) {
            const preset = this.getPreset(i);
            
            const option = document.createElement('option');
            option.value = i.toString();
            option.textContent = preset.name;
            option.selected = i === selectedIndex;
            selectElement.appendChild(option);
        }
    }
}