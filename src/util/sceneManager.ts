import { vec3, mat4 } from "gl-matrix";
import { Primitive } from "./primitives/primitive";
import { Sphere } from "./primitives/sphere";
import { Box } from "./primitives/box";
import { Torus } from "./primitives/torus";
import { Mandelbulb } from "./primitives/mandelbulb";

import { SmoothUnion } from "./primitive_operations/smoothUnion";
import { Twist } from "./primitive_operations/twist";
import { Round } from "./primitive_operations/round";
import { SmoothSubtraction } from "./primitive_operations/smoothSubstraction";
import { Repetition } from "./primitive_operations/repetition";
import { AnimatedTranslate } from "./primitive_operations/animatedTranslate";

export type Scene = {
    name: string;
    objects: Primitive[];
};

export class SceneManager {
    private static getTransform(x: number, y: number, z: number, rotation?: vec3) {
        const model = mat4.create();
        
        if (rotation) {
            // Apply rotation: first translate, then rotate
            mat4.fromTranslation(model, [x, y, z]);
            mat4.rotateX(model, model, rotation[0]);
            mat4.rotateY(model, model, rotation[1]);
            mat4.rotateZ(model, model, rotation[2]);
        } else {
            mat4.fromRotationTranslationScale(model, [0,0,0,1], [x,y,z], [1,1,1]);
        }
        
        const worldToLocal = mat4.create();
        mat4.invert(worldToLocal, model);
        return worldToLocal
    }

    private static createSphere(x: number, y: number, z: number, radius: number, rotation?: vec3): Sphere {
        return new Sphere(SceneManager.getTransform(x, y, z, rotation), radius);
    }

    private static createBox(x: number, y: number, z: number, halfSize: vec3, rotation?: vec3): Box {
        return new Box(SceneManager.getTransform(x, y, z, rotation), halfSize);
    }

    private static createTorus(x: number, y: number, z: number, radius: number, rotation?: vec3): Primitive {
        return new Torus(SceneManager.getTransform(x, y, z, rotation), radius, radius / 4);
    }

    private static createMandelbulb(
        x: number, 
        y: number, 
        z: number, 
        power: number = 8.0,
        iterations: number = 9,
        enableAnimation: boolean = true,
        animationSpeed: number = 0.05,
        rotation?: vec3
    ): Mandelbulb {
        const transform = SceneManager.getTransform(x, y, z, rotation);
        mat4.scale(transform, transform, [0.5, 0.5, 0.5]);
        
        return new Mandelbulb(
            transform, 
            power, 
            iterations, 
            enableAnimation,
            animationSpeed
        );
    }

    private static createSmoothUnion(prim1: Primitive, prim2: Primitive, k: number) {
        return new SmoothUnion(prim1, prim2, k);
    }

    private static createSmoothSubtract(prim1: Primitive, prim2: Primitive, k: number) {
        return new SmoothSubtraction(prim1, prim2, k);
    }

    private static createTwist(primitive: Primitive, twistAmount: number) {
        return new Twist(primitive, twistAmount);
    }

    private static createRound(primitive: Primitive, radius: number) {
        return new Round(primitive, radius);
    }

    private static createRepetition(primitive: Primitive, spacing: vec3) {
        return new Repetition(primitive, spacing);
    }

    private static createAnimatedTranslate(
        primitive: Primitive, 
        direction: vec3 = vec3.fromValues(1, 0, 0),
        amplitude: number = 2.0,
        speed: number = 0.5
    ) {
        return new AnimatedTranslate(primitive, direction, amplitude, speed);
    }

    public static readonly presets: Scene[] = [
        // Basic sphere scenes
        {
            name: "Sphere",
            objects: [
                SceneManager.createSphere(0, 0, 0, 1.5)
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
            name: "Torus",
            objects: [
                SceneManager.createTorus(0, 0, 0, 1.3, vec3.fromValues(-Math.PI/2,0,0))
            ]
        },
        // 7-10: Rounded/Cube scenes
        {
            name: "Rounded Box",
            objects: [
                SceneManager.createRound(
                    SceneManager.createBox(0, 0, 0, vec3.fromValues(0.4, 0.4, 0.4)),
                    0.3
                )
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
                SceneManager.createBox(0, 0.5, 0, vec3.fromValues(0.9, 0.25, 0.9)),
                SceneManager.createBox(0, 0, 0, vec3.fromValues(0.6, 0.25, 0.6)),
                SceneManager.createBox(0, -0.5, 0, vec3.fromValues(0.3, 0.25, 0.3))
            ]
        },
        // Set operators
        {
            name: "Smooth Union",
            objects: [
                SceneManager.createSmoothUnion(
                   SceneManager.createSphere(0,0,0,0.5),
                   SceneManager.createBox(0,0.5,0,vec3.fromValues(1, 0.2, 1)),
                   0.2
                )
            ]
        },
        {
            name: "Smooth Subtraction",
            objects: [
                SceneManager.createSmoothSubtract(
                    SceneManager.createRound(
                        SceneManager.createBox(0,0,0,vec3.fromValues(1, 1, 1), vec3.fromValues(0,Math.PI/4,0)),
                        0.1
                    ),
                    SceneManager.createSphere(0,0,0,0.9),
                    0.2
                )
            ]
        },
        // Miscellaneous scenes.
        {
            name: "Smooth Union [A]",
            objects: [
                SceneManager.createSmoothUnion(
                    SceneManager.createAnimatedTranslate(
                        SceneManager.createSphere(0, 0, 0, 1),
                        vec3.fromValues(1, 0, 0), // x axis (left to right)
                        3.0, // amplitude
                        0.005  // speed
                    ),
                    SceneManager.createSphere(0, 0, 0, 1),
                    0.2
                )
            ]
        },
        {
            name: "Mandelbulb [A]",
            objects: [
                SceneManager.createMandelbulb(0, 0, 0, 8, 80, true, -0.0001, undefined)
            ]
        },
        {
            name: "Twisted Torus",
            objects: [
                SceneManager.createTwist(
                    SceneManager.createTorus(0, 0, 0, 1.3, vec3.fromValues(-Math.PI/2,0,0)),
                    3
                )
            ]
        },
        {
            name: "Infinite Spheres",
            objects: [
                SceneManager.createRepetition(
                    SceneManager.createSphere(0, 0, 0, 0.3),
                    vec3.fromValues(1.5, 1.5, 1.5)
                )
            ]
        },
        {
            name: "Screw",
            objects: [
                SceneManager.createRound(
                    SceneManager.createTwist(
                        SceneManager.createBox(0, 0, 0, vec3.fromValues(0.4, 1.5, 0.4)),
                        4.0
                    ),
                    0.1
                )
            ]
        },
        {
            name: "Chicken",
            objects: [
                SceneManager.createSmoothUnion(
                    SceneManager.createSmoothUnion(
                        SceneManager.createSmoothUnion(
                            SceneManager.createSmoothUnion(
                                SceneManager.createSmoothUnion(
                                    SceneManager.createSmoothUnion(
                                        SceneManager.createSmoothUnion(
                                            SceneManager.createSmoothUnion(
                                                SceneManager.createSmoothUnion(
                                                    SceneManager.createBox(0,0,0, vec3.fromValues(0.6, 0.6, 0.8)),
                                                    SceneManager.createBox(0,-0.2,0, vec3.fromValues(0.8, 0.4, 0.6)),
                                                    0.0001
                                                ),
                                                SceneManager.createBox(0,-0.8,0.8, vec3.fromValues(0.4, 0.6, 0.3)),
                                                0.0001
                                            ),
                                            SceneManager.createBox(0,-0.8,1.2, vec3.fromValues(0.4, 0.2, 0.2)),
                                            0.0001
                                        ),
                                        SceneManager.createBox(0,-0.4,1.0, vec3.fromValues(0.2, 0.2, 0.2)),
                                        0.0001
                                    ),
                                    SceneManager.createBox(0.3,1,0, vec3.fromValues(0.1, 0.6, 0.01)),
                                    0.0001
                                ),
                                SceneManager.createBox(-0.3,1,0, vec3.fromValues(0.1, 0.6, 0.01)),
                                0.0001
                            ),
                            SceneManager.createBox(0,1.6,0.2, vec3.fromValues(0.6, 0.01, 0.2)),
                            0.0001
                        ),
                        SceneManager.createBox(0.3,1.6,0.5, vec3.fromValues(0.1, 0.01, 0.1)),
                        0.0001
                    ),
                    SceneManager.createBox(-0.3,1.6,0.5, vec3.fromValues(0.1, 0.01, 0.1)),
                    0.0001
                )
            ]
        },
        {
            name: "67",
            objects: [
                SceneManager.createSmoothUnion(
                    // 6
                    SceneManager.createRound(
                        SceneManager.createBox(-1.25,-0.8,0, vec3.fromValues(0.05,0.7,0.05), vec3.fromValues(0,0,Math.PI/5)),
                        0.20
                    ),
                    SceneManager.createRound(
                        SceneManager.createTorus(-1.25,0.5,0,0.8, vec3.fromValues(-Math.PI/2, 0, 0)),
                        0.05
                    ),
                    0.0001
                ),


                SceneManager.createSmoothUnion(
                    // 7
                    SceneManager.createRound(
                        SceneManager.createBox(1.35,0,0, vec3.fromValues(0.05,1.5,0.05), vec3.fromValues(0,0,Math.PI/7)),
                        0.20
                    ),
                    SceneManager.createRound(
                        SceneManager.createBox(1.25,-1.4,0, vec3.fromValues(0.05,0.8,0.05), vec3.fromValues(0,0,Math.PI/2)),
                        0.20
                    ),
                    0.0001
                )
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