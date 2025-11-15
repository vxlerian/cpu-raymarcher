import { Scene } from './util/scene';
import { SceneManager } from './util/sceneManager';
import { ShadingModel } from './util/shading_models/shadingModel';
import { PhongModel } from './util/shading_models/phongModel';
import { NormalModel } from './util/shading_models/normalModel';
import { SphereTracer } from './cpu_algorithms/sphereTracer';
import { FixedStep } from './cpu_algorithms/fixedStep';
import { SDFHeatmap } from './util/shading_models/SDFHeatmap';
import { IterationHeatmap } from './util/shading_models/IterationHeatmap';
import ApexCharts from "apexcharts";
import { stdout } from 'process';

const canvas = document.getElementById("shader-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const analyticsCanvas = document.getElementById("analytics-canvas") as HTMLCanvasElement
const analyticsCtx = analyticsCanvas ? analyticsCanvas.getContext("2d")! : null;
const width = canvas.width;
const height = canvas.height;

if (analyticsCanvas) {
    analyticsCanvas.width = width;
    analyticsCanvas.height = height;
}

const fpsDisplay = document.getElementById("fps")!;

const averageSDFCallsDisplay = document.getElementById("average-sdf-calls")!;
const maxSDFCallsDisplay = document.getElementById("max-sdf-calls")!;
const minSDFCallsDisplay = document.getElementById("min-sdf-calls")!;

const averageIterationsDisplay = document.getElementById("average-iterations")!;

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

// Timing for FPS
let lastFrame = performance.now();
let frameCount = 0;

const scene = new Scene();

// Scene dropdown setup
const sceneSelect = document.getElementById('scene-select') as HTMLSelectElement;
const analyticsSceneSelect = document.getElementById('analytics-scene-select') as HTMLSelectElement | null;

// Handle scene dropdown changes
sceneSelect.addEventListener('change', (e) => {
    const selectedIndex = parseInt((e.target as HTMLSelectElement).value);
    scene.loadPreset(selectedIndex);
});

// Initialise dropdown with current scene
const sceneInfo = scene.getCurrentPresetInfo();
SceneManager.populateSceneDropdown(sceneSelect, sceneInfo.index);
if (analyticsSceneSelect) {
    SceneManager.populateSceneDropdown(analyticsSceneSelect, sceneInfo.index);
}

function handleSceneChange(index: number) {
    scene.loadPreset(index);
    sceneSelect.value = String(index);
    if (analyticsSceneSelect) {
        analyticsSceneSelect.value = String(index);
    }
}

// Handle scene dropdown changes
sceneSelect.addEventListener('change', (e) => {
    const selectedIndex = parseInt((e.target as HTMLSelectElement).value);
    handleSceneChange(selectedIndex);
});

if (analyticsSceneSelect) {
    analyticsSceneSelect.addEventListener('change', (e) => {
        const selectedIndex = parseInt((e.target as HTMLSelectElement).value);
        handleSceneChange(selectedIndex);
    });
}

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
    if (analyticsCanvas) {
        analyticsCanvas.style.width = `${width * displayScale}px`;
        analyticsCanvas.style.height = `${height * displayScale}px`;
    }
}
applyCanvasScale();


// Graph data/options (using ApexCharts)
// First, we'll just try with SDF calls.
let data: [number, number][] = []

var options = {
    series: data,
    chart: {
        id: 'realtime',
        height: 350,
        type: 'line',
        animations: {
            enabled: true,
            easing: 'linear',
            dynamicAnimation: {
                speed: 1000
            }
        },
        toolbar: { show: false },
        zoom: { enabled: false }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' },
    title: { text: 'Average SDF Calls', align: 'left' },
    markers: { size: 0 },
    xaxis: { range: 1000 },
    yaxis: { max: 20 },
    legend: { show: false },
};

var chart = new ApexCharts(document.querySelector("#chart"), options);

// Main render loop
async function render(time: number) {
    // Check if analytics is active, enabling auto rotation if so.
    const analyticsView = document.getElementById("analytics-view");
    const isAnalyticsActive = analyticsView?.classList.contains("active-view");
    if (isAnalyticsActive) {
        const rotationSpeed = 0.1;
        scene.camera.rotateCamera(0, rotationSpeed);
    }
    
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
    if (analyticsCtx) {
        analyticsCtx.putImageData(imageData, 0, 0);
    }

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

    data.push([now, averageSDFCalls]);
    if (data.length > 100) {
        data.shift();
    }
    chart.updateSeries([{data: data}]);
    
    // window.setInterval()

    chart.render();

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
}

requestAnimationFrame(render);
