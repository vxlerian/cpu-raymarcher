import { Raymarcher } from './test_algorithms/raymarcher'
import { SphereTracer } from './test_algorithms/sphereTracer'
import { Sphere } from './util/primitives/sphere';
import { Scene } from './util/scene';
import { ShadingModel } from './util/shading_models/shadingModel';
import { PhongModel } from './util/shading_models/phongModel';
import { NormalModel } from './util/shading_models/normalModel';


const canvas = document.getElementById("shader-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const width = canvas.width;
const height = canvas.height;

const fpsDisplay = document.getElementById("fps")!;
const statusDisplay = document.getElementById("status")!;

// Here you can choose which algorithm and shading model to use. It's currently
// hardcoded, but in future this could be changed with a dropdown or something.
let algorithm: Raymarcher;
algorithm = new SphereTracer();

let shadingModel: ShadingModel;
shadingModel = new NormalModel();

// Timing for FPS
let lastFrame = performance.now();
let frameCount = 0;

const scene = new Scene();
// Main render loop
function render(time: number) {
    if (!algorithm) {
        requestAnimationFrame(render);
        return;
    }

    const depthBuffer = new Uint8ClampedArray(width * height);
    const normalBuffer = new Uint8ClampedArray(width * height * 3);
    const SDFevaluationBuffer = new Uint16Array(width * height);
    const iterationsBuffer = new Uint16Array(width * height);

    algorithm.runRaymarcher(
        scene,
        depthBuffer,
        normalBuffer,
        SDFevaluationBuffer,
        iterationsBuffer,
        width,
        height,
        time);

    const outputBuffer = new Uint8ClampedArray(width * height * 4); // four channels for RGBA

    shadingModel.shade(
        outputBuffer,
        depthBuffer,
        normalBuffer,
        SDFevaluationBuffer,
        iterationsBuffer,
        width,
        height
    );

    const imageData = new ImageData(outputBuffer, width, height);
    ctx.putImageData(imageData, 0, 0);

    // FPS calculation
    const now = performance.now();
    // frameCount++;
    // if (now - lastFrame >= 1000) {
    //     fpsDisplay.textContent = `FPS: ${frameCount}`;
    //     frameCount = 0;
    //     lastFrame = now;
    // }
    fpsDisplay.textContent = `frame length: ${(now - lastFrame).toPrecision(4)}`;
    lastFrame = now;

    scene.updateInverseSceneTransforms();

    requestAnimationFrame(render);
}

// thanks chatgpt
window.addEventListener("keydown", e => {
    const step = 0.1;
    switch (e.key) {
        case "ArrowUp":    onPan(0, -step); break;
        case "ArrowDown":  onPan(0,  step); break;
        case "ArrowLeft":  onPan(-step, 0); break;
        case "ArrowRight": onPan( step, 0); break;
    }
});
function onPan(dx: number, dy: number) {
    scene.camera.rotateCamera(-dy, dx);
    scene.updateInverseSceneTransforms();
}

requestAnimationFrame(render);
