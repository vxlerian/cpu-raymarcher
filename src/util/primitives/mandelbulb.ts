import { mat4, vec3 } from "gl-matrix";
import { Primitive } from "./primitive";

/**
 * Mandelbulbor primitive
 * 
 * Implementation taken from rogo1965 on shadertoy
 * - which was forked from evilryu's mandlebulb implementation
 * https://www.shadertoy.com/view/slGSR3
 */
export class Mandelbulb extends Primitive {
    power: number;
    iterations: number;
    enableAnimation: boolean;
    animationSpeed: number;
    time: number;

    constructor(
        transform: mat4,
        power: number = 8.0,
        iterations: number = 9,
        enableAnimation: boolean = true,
        animationSpeed: number = -0.2 
    ) {
        super(transform);
        this.power = power;
        this.iterations = iterations;
        this.enableAnimation = enableAnimation;
        this.animationSpeed = animationSpeed;
        this.time = 0;
    }

    setTime(time: number): void {
        this.time = time;
    }

    // translated from glsl: https://www.shadertoy.com/view/slGSR3
    localSdf(localPos: vec3): number {
        const p = vec3.fromValues(localPos[0], localPos[2], localPos[1]); // p.xyz = p.xzy
        
        let z = vec3.clone(p); // vec3 z = p
        let dr = 1.0;
        let r = 0.0;

        for (let i = 0; i < this.iterations; i++) {
            r = vec3.length(z); 
            
            if (r > 2.0) {
                break;
            }

            // theta = atan(z.y / z.x);
            let theta = Math.atan2(z[1], z[0]); 

            // phi = asin(z.z / r) + iTime*0.2;
            let phi = Math.asin(z[2] / r); 
            if (this.enableAnimation) {
                phi += this.time * this.animationSpeed;
            }

            // dr = pow(r, power - 1.0) * dr * power + 1.0;
            dr = Math.pow(r, this.power - 1.0) * dr * this.power + 1.0;

            // scale and rotate the point
            r = Math.pow(r, this.power);
            theta = theta * this.power;
            phi = phi * this.power;

            // convert back to cartesian coordinates and add original point
            // z = r * vec3(cos(theta)*cos(phi), sin(theta)*cos(phi), sin(phi)) + p;
            z[0] = r * Math.cos(theta) * Math.cos(phi) + p[0];
            z[1] = r * Math.sin(theta) * Math.cos(phi) + p[1];
            z[2] = r * Math.sin(phi) + p[2];
        }

        // return vec3(0.5 * log(r) * r / dr, t0, 0.0);
        return 0.5 * Math.log(r) * r / dr;
    }

    getLocalBoundingRadius(): number {
        // not entirely sure
        return 2.5;
    }
}
