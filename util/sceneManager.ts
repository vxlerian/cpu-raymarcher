import { mat4 } from "gl-matrix";
import { Primitive } from "./primitives/primitive";
import { Sphere } from "./primitives/sphere";

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

    public static readonly presets: Scene[] = [
        {
            name: "Overlapping spheres",
            objects: [
                SceneManager.createSphere(0, 0, 0, 1),
                SceneManager.createSphere(0, 1, 0, 0.6),
                SceneManager.createSphere(1, 0, -0.5, 0.9)
            ]
        },
        {
            name: "Single sphere",
            objects: [
                SceneManager.createSphere(0, 0, 0, 1.5)
            ]
        },
        {
            name: "Grid of spheres",
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
            name: "Atom thingo",
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
            name: "Bunch of random spheres",
            objects: [
                SceneManager.createSphere(0.8, -0.3, 0.2, 0.4),
                SceneManager.createSphere(-0.5, 0.9, -0.1, 0.5),
                SceneManager.createSphere(0.2, 0.1, 0.8, 0.3),
                SceneManager.createSphere(-0.9, -0.4, -0.6, 0.6),
                SceneManager.createSphere(0.4, -0.8, 0.5, 0.35),
                SceneManager.createSphere(-0.2, 0.6, -0.9, 0.4),
                SceneManager.createSphere(0.7, 0.3, -0.4, 0.25)
            ]
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