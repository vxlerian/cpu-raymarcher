import { Scene } from './util/scene';
import { SceneManager } from './util/sceneManager';
import { ShadingModel } from './util/shading_models/shadingModel';
import { PhongModel } from './util/shading_models/phongModel';
import { NormalModel } from './util/shading_models/normalModel';
import { SphereTracer } from './test_algorithms/sphereTracer';
import { FixedStep } from './test_algorithms/fixedStep';


const canvas = document.getElementById("shader-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const width = canvas.width;
const height = canvas.height;

const fpsDisplay = document.getElementById("fps")!;
const statusDisplay = document.getElementById("status")!;

let shadingModel: ShadingModel = new NormalModel();
// Changing model
document.getElementById('shading-models')!.addEventListener('change', e => {
    const selectedModel = (e.target as HTMLSelectElement).value;
    if (selectedModel === 'phong') {
        shadingModel = new PhongModel();
    } else if (selectedModel === 'normal') {
        shadingModel = new NormalModel();
    }
});

// Getting algorithm
let algorithm = 'sphere-tracer';
document.getElementById('algorithm')!.addEventListener('change', e => {
    const selectedAlgo = (e.target as HTMLSelectElement).value;
    if (selectedAlgo === 'sphere-tracing') {
        algorithm = 'sphere-tracer';
    } else if (selectedAlgo === 'fixed-step') {
        algorithm = 'fixed-step';
    }
});

// Timing for FPS
let lastFrame = performance.now();
let frameCount = 0;

const scene = new Scene();

// Scene dropdown setup
const sceneSelect = document.getElementById('scene-select') as HTMLSelectElement;

// Handle scene dropdown changes
sceneSelect.addEventListener('change', (e) => {
    const selectedIndex = parseInt((e.target as HTMLSelectElement).value);
    scene.loadPreset(selectedIndex);
});

// Initialise dropdown with current scene
const sceneInfo = scene.getCurrentPresetInfo();
SceneManager.populateSceneDropdown(sceneSelect, sceneInfo.index);

// Worker pool
const NUM_WORKERS = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
const workers = Array.from({ length: NUM_WORKERS }, () =>
  new Worker(new URL('./workers/raymarchWorker.ts', import.meta.url), { type: 'module' })
);

// Persistent buffers to avoid re-allocation each frame
const depthBuffer = new Uint8ClampedArray(width * height);
const normalBuffer = new Uint8ClampedArray(width * height * 3);
const SDFevaluationBuffer = new Uint16Array(width * height);
const iterationsBuffer = new Uint16Array(width * height);
const outputBuffer = new Uint8ClampedArray(width * height * 4); // RGBA

// Display scaling: keep internal resolution (width x height), scale via CSS only
let displayScale = 1.0; // 1x = native internal size
function applyCanvasScale() {
    canvas.style.width = `${width * displayScale}px`;
    canvas.style.height = `${height * displayScale}px`;
    statusDisplay.textContent = `Status: scale ${displayScale.toFixed(2)}x`;
}

applyCanvasScale();

// Main render loop
async function render(time: number) {
    // Partition rows across workers
    const rowsPerWorker = Math.ceil(height / NUM_WORKERS);
    const [pitch, yaw] = scene.camera.getAngles();

    const jobs = workers.map((w, i) => {
        const yStart = Math.min(i * rowsPerWorker, height);
        const yEnd = Math.min((i + 1) * rowsPerWorker, height);
        if (yStart >= yEnd) return Promise.resolve(null);

        return new Promise<null>((resolve) => {
            const handler = (e: MessageEvent<any>) => {
                w.removeEventListener('message', handler);
                const { yStart, yEnd, depth, normal, sdfEval, iters } = e.data as {
                    yStart: number; yEnd: number;
                    depth: Uint8ClampedArray; normal: Uint8ClampedArray;
                    sdfEval: Uint16Array; iters: Uint16Array;
                };

                // Copy tile buffers into full-frame buffers
                const tileHeight = yEnd - yStart;
                const pixelOffset = yStart * width;
                depthBuffer.set(depth, pixelOffset);
                SDFevaluationBuffer.set(sdfEval, pixelOffset);
                iterationsBuffer.set(iters, pixelOffset);
                const normalOffset = yStart * width * 3;
                normalBuffer.set(normal, normalOffset);

                resolve(null);
            };
            w.addEventListener('message', handler);
            const sceneInfo = scene.getCurrentPresetInfo();
            w.postMessage({ width, height, time, yStart, yEnd, camera: { pitch, yaw }, algorithm, scenePresetIndex: sceneInfo.index });
        });
    });

    await Promise.all(jobs);

    // Shade on main thread using your current shading model
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
    fpsDisplay.textContent = `Frame length: ${(now - lastFrame).toPrecision(4)}`;
    lastFrame = now;

    scene.updateInverseSceneTransforms();

    requestAnimationFrame(render);
}

// thanks chatgpt
window.addEventListener("keydown", e => {
    const step = 0.1;
    switch (e.key) {
        case "ArrowUp":    onPan(0, step); break;
        case "ArrowDown":  onPan(0, -step); break;
        case "ArrowLeft":  onPan(step, 0); break;
        case "ArrowRight": onPan(-step, 0); break;
        case "-":
        case "_":
            displayScale = Math.max(0.25, displayScale - 0.25);
            applyCanvasScale();
            break;
        case "+":
        case "=":
            displayScale = Math.min(8, displayScale + 0.25);
            applyCanvasScale();
            break;
    }
});
function onPan(dx: number, dy: number) {
    scene.camera.rotateCamera(-dy, dx);
    scene.updateInverseSceneTransforms();
}

requestAnimationFrame(render);
