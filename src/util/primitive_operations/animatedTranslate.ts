import { mat4, vec3 } from "gl-matrix";
import { Primitive } from "../primitives/primitive";

/**
 * Translates a primitive along a vector direction, oscillates using a sine wave
 */
export class AnimatedTranslate extends Primitive {
    primitive: Primitive; // object being animated
    direction: vec3; // the direction vector to translate across
    amplitude: number; // how far to move in each direction
    speed: number; // animation speed
    time: number; // tracks the current position in the animation (updated by the scene)

    constructor(
        primitive: Primitive, 
        direction: vec3 = vec3.fromValues(1, 0, 0), // default: left-right
        amplitude: number = 2.0,
        speed: number = 0.5
    ) {
        super(primitive.transform);
        this.primitive = primitive;
        this.direction = vec3.create();
        vec3.normalize(this.direction, direction);
        this.amplitude = amplitude;
        this.speed = speed;
        this.time = 0;
    }

    // should be called each frame from the render loop
    setTime(time: number): void {
        this.time = time;
    }

    localSdf(localPos: vec3): number {
        // calculate the current offset based on sine wave
        const offset = Math.sin(this.time * this.speed) * this.amplitude;
        
        // create offset vector
        const offsetVec = vec3.create();
        vec3.scale(offsetVec, this.direction, offset);
        
        // subtract the offset from the position passed in
        const adjustedPos = vec3.create();
        vec3.subtract(adjustedPos, localPos, offsetVec);
        
        // evaluate the primitive at the adjusted position
        return this.primitive.sdf(adjustedPos);
    }

    getLocalBoundingRadius(): number {
        // include the amplitude to account for the full range of motion
        return this.primitive.getLocalBoundingRadius() + this.amplitude;
    }

    getWorldPosition(): vec3 {
        return this.primitive.getWorldPosition();
    }
}
