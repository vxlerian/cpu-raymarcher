import { mat4, vec3 } from "gl-matrix";

export class Camera {
    private orbitCentre: mat4;
    private cameraDistance: number;
    public cameraTransform: mat4;

    // i was just gonna keep the rotation as a quat but this is lowkey easier
    private pitch: number;
    private yaw: number;

    constructor() {
        this.orbitCentre = mat4.create();
        this.cameraDistance = 3;
        this.pitch = 0;
        this.yaw = 0;
        this.cameraTransform = mat4.create();
        this.updateCameraTransform();
    }

    /**
     * rotate the camera by some delta in pitch and yaw
     * @param pitch look up and down in radians. Is clamped.
     * @param yaw look left and right in radians. Will loop around.
     */
    public rotateCamera(pitch: number, yaw: number) {
        // pitch = look up and down is clamped between straight up and straight down
        this.pitch = Math.min(Math.max(this.pitch + pitch, -Math.PI/2), Math.PI/2);
        this.yaw += yaw;
        this.updateCameraTransform();
    }

    // helpers to serialise/restore orientation (used by worker renderer)
    public getAngles(): [number, number] {
        return [this.pitch, this.yaw];
    }

    public getRotationMatrix(out: mat4): mat4 {
        out[0] = this.cameraTransform[0]; out[1] = this.cameraTransform[1]; out[2] = this.cameraTransform[2]; out[3] = 0;
        out[4] = this.cameraTransform[4]; out[5] = this.cameraTransform[5]; out[6] = this.cameraTransform[6]; out[7] = 0;
        out[8] = this.cameraTransform[8]; out[9] = this.cameraTransform[9]; out[10] = this.cameraTransform[10]; out[11] = 0;
        out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
        return out;
    }

    public getCameraPosition(out: vec3): vec3 {
        out[0] = this.cameraTransform[12];
        out[1] = this.cameraTransform[13];
        out[2] = this.cameraTransform[14];
        return out;
    }

    public getCameraMatrix(out: mat4): mat4 {
        mat4.copy(out, this.cameraTransform);
        return out;
    }

    public setAngles(pitch: number, yaw: number) {
        this.pitch = Math.min(Math.max(pitch, -Math.PI/2), Math.PI/2);
        this.yaw = yaw;
        this.updateCameraTransform();
    }

    public getPosition(out: vec3): vec3 {
        out[0] = this.cameraTransform[12];
        out[1] = this.cameraTransform[13];
        out[2] = this.cameraTransform[14];
        return out;
    }

    public transformDirection(out: vec3, dir: vec3): vec3 {
        const m = this.cameraTransform;
        const x = dir[0], y = dir[1], z = dir[2];
        out[0] = m[0] * x + m[4] * y + m[8] * z;
        out[1] = m[1] * x + m[5] * y + m[9] * z;
        out[2] = m[2] * x + m[6] * y + m[10] * z;
        return out;
    }

    // call this every time the camera parameters change
    private updateCameraTransform() {
        const tempOrbitCentre = mat4.create();
        mat4.rotateY(tempOrbitCentre, mat4.create(), this.yaw);
        mat4.rotateX(this.orbitCentre, tempOrbitCentre, this.pitch);
        mat4.translate(this.cameraTransform, this.orbitCentre,
            vec3.fromValues(0, 0, Math.abs(this.cameraDistance))
        );
    }
}