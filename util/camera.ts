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
        this.cameraDistance = 5;
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

    public setAngles(pitch: number, yaw: number) {
        this.pitch = Math.min(Math.max(pitch, -Math.PI/2), Math.PI/2);
        this.yaw = yaw;
        this.updateCameraTransform();
    }

    // call this every time the camera parameters change
    private updateCameraTransform() {
        const tempOrbitCentre = mat4.create();
        mat4.rotateX(tempOrbitCentre, mat4.create(), this.pitch);
        mat4.rotateY(this.orbitCentre, tempOrbitCentre, this.yaw);
        mat4.translate(this.cameraTransform, this.orbitCentre,
            vec3.fromValues(0, 0, Math.abs(this.cameraDistance))
        );
    }
}