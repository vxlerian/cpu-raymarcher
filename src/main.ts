import { Scene } from './util/scene';
import { SceneManager } from './util/sceneManager';
import { ShadingModel } from './util/shading_models/shadingModel';
import { PhongModel } from './util/shading_models/phongModel';
import { NormalModel } from './util/shading_models/normalModel';
import { SphereTracer } from './cpu_algorithms/sphereTracer';
import { FixedStep } from './cpu_algorithms/fixedStep';
import { SDFHeatmap } from './util/shading_models/SDFHeatmap';
import { IterationHeatmap } from './util/shading_models/IterationHeatmap';

const canvas = document.getElementById("shader-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let width = canvas.width;
let height = canvas.height;

const fpsDisplay = document.getElementById("fps")!;

const averageSDFCallsDisplay = document.getElementById("average-sdf-calls")!;
const maxSDFCallsDisplay = document.getElementById("max-sdf-calls")!;
const minSDFCallsDisplay = document.getElementById("min-sdf-calls")!;

const averageIterationsDisplay = document.getElementById("average-iterations")!;
const resolutionDisplay = document.getElementById("resolution-display")!;

let shadingModel: ShadingModel = new NormalModel();
// Changing model
document.getElementById('shading-models')!.addEventListener('change', e => {
    const selectedModel = (e.target as HTMLSelectElement).value;
    switch (selectedModel) {
        case 'phong':
            shadingModel = new PhongModel();
            break;
        case 'normal':
            shadingModel = new NormalModel();
            break;
        case 'sdf-heatmap':
            shadingModel = new SDFHeatmap();
            break;
        case 'iteration-heatmap':
            shadingModel = new IterationHeatmap();
            break;
        default:
            shadingModel = new NormalModel();
    }
});

// Getting algorithm
let algorithm = 'sphere-tracer';
document.getElementById('algorithm')!.addEventListener('change', e => {
    const selectedAlgo = (e.target as HTMLSelectElement).value;
    switch (selectedAlgo) {
    case 'sphere-tracer':
        algorithm = 'sphere-tracer';
        break;
    case 'fixed-step':
        algorithm = 'fixed-step';
        break;
    default:
        algorithm = 'sphere-tracer';
    }
});

// getting acceleration structure type
let accelerationStructure = "None";
document.getElementById('octree-toggle')!.addEventListener('change', e => {
    if ((e.target as HTMLInputElement).checked) {
        accelerationStructure = "Octree";
    } else {
        accelerationStructure = "None";
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
// are reset when resolution changes tho
let depthBuffer = new Uint8ClampedArray(width * height);
let normalBuffer = new Uint8ClampedArray(width * height * 3);
let SDFevaluationBuffer = new Uint16Array(width * height);
let iterationsBuffer = new Uint16Array(width * height);
let outputBuffer = new Uint8ClampedArray(width * height * 4); // RGBA

// resolution scaling stuff
let resolutionPower = 7; // default to 2^7 = 128 x 128
const TARGET_DISPLAY_SIZE = 256; // Keep canvas display size around 256px
const MIN_RESOLUTION_POWER = 4; // min res = 2^4 = 16 x 16
const MAX_RESOLUTION_POWER = 10; // max res = 2^10 = 1024 x 1024
let isResizing = false;
let renderInProgress = false;

function updateResolution() {
    isResizing = true;
    
    // wait for current render to complete before updating
    const attemptUpdate = () => {
        if (renderInProgress) {
            setTimeout(attemptUpdate, 5);
            return;
        }
        
        const newResolution = Math.pow(2, resolutionPower);
        width = newResolution;
        height = newResolution;
        
        canvas.width = width;
        canvas.height = height;
        
        // scale display to match target display size
        const displayScale = TARGET_DISPLAY_SIZE / width;
        canvas.style.width = `${width * displayScale}px`;
        canvas.style.height = `${height * displayScale}px`;
        
        // update the text thing
        resolutionDisplay.textContent = `Resolution: ${width}x${height}`;
        
        // reallocate buffers with new size
        const totalPixels = width * height;
        depthBuffer = new Uint8ClampedArray(totalPixels);
        normalBuffer = new Uint8ClampedArray(totalPixels * 3);
        SDFevaluationBuffer = new Uint16Array(totalPixels);
        iterationsBuffer = new Uint16Array(totalPixels);
        outputBuffer = new Uint8ClampedArray(totalPixels * 4);
        
        // clear the flag immediately so rendering can resume
        isResizing = false;
    };
    
    attemptUpdate();
}

updateResolution();

// Main render loop
async function render(time: number) {
    // skip rendering during resolution changes
    if (isResizing) {
        requestAnimationFrame(render);
        return;
    }
    
    renderInProgress = true;
    
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
            w.postMessage({ width, height, time, yStart, yEnd, camera: { pitch, yaw }, algorithm, scenePresetIndex: sceneInfo.index, accelerationStructure });
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

    // Update SDF calls and iterations diagnostics
    const totalPixels = width * height;
    let totalSDFCalls = 0;
    let maxSDFCalls = 0;
    let minSDFCalls = Number.MAX_SAFE_INTEGER;
    let totalIterations = 0;

    for (let i = 0; i < totalPixels; i++) {
        const sdfCalls = SDFevaluationBuffer[i];
        totalSDFCalls += sdfCalls;
        totalIterations += iterationsBuffer[i];
        if (sdfCalls > maxSDFCalls) maxSDFCalls = sdfCalls;
        if (sdfCalls < minSDFCalls) minSDFCalls = sdfCalls;
    }

    const averageSDFCalls = totalSDFCalls / totalPixels;
    const averageIterations = totalIterations / totalPixels;

    averageSDFCallsDisplay.textContent = `Average SDF calls: ${averageSDFCalls.toFixed(2)}`;
    maxSDFCallsDisplay.textContent = `Max SDF calls: ${maxSDFCalls}`;
    minSDFCallsDisplay.textContent = `Min SDF calls: ${minSDFCalls}`;
    averageIterationsDisplay.textContent = `Average iterations: ${averageIterations.toFixed(2)}`;

    renderInProgress = false;
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
            if (resolutionPower > MIN_RESOLUTION_POWER) {
                resolutionPower--;
                updateResolution();
            }
            break;
        case "+":
        case "=":
            if (resolutionPower < MAX_RESOLUTION_POWER) {
                resolutionPower++;
                updateResolution();
            }
            break;
    }
});
function onPan(dx: number, dy: number) {
    scene.camera.rotateCamera(-dy, dx);
}

requestAnimationFrame(render);
