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
import { select } from 'three/tsl';

const canvas = document.getElementById("shader-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const analyticsCanvas = document.getElementById("analytics-canvas") as HTMLCanvasElement;
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

function createShadingModelFromValue(selectedModel: string): ShadingModel {
    switch (selectedModel) {
        case 'phong':
            return new PhongModel();
        case 'sdf-heatmap':
            return new SDFHeatmap();
        case 'iteration-heatmap':
            return new IterationHeatmap();
        case 'normal':
        default:
            return new NormalModel();
    }
}

let shadingModel: ShadingModel = new NormalModel();
let analyticsShadingModel: ShadingModel = new NormalModel(); // analytics shader (default)

const shadingSelect = document.getElementById('shading-models') as HTMLSelectElement;
const analyticsShadingSelect = document.getElementById('analytics-shading-model') as HTMLSelectElement | null;

shadingSelect.addEventListener('change', e => {
    const selectedModel = (e.target as HTMLSelectElement).value;
    shadingModel = createShadingModelFromValue(selectedModel);
});

if (analyticsShadingSelect) {
    analyticsShadingSelect.addEventListener('change', e => {
        const selectedModel = (e.target as HTMLSelectElement).value;
        analyticsShadingModel = createShadingModelFromValue(selectedModel);
    });
}

let algorithm = 'sphere-tracer';
const algoSelect = document.getElementById('algorithm') as HTMLSelectElement;
const analyticsAlgoSelect = document.getElementById('analytics-algorithm') as HTMLSelectElement | null;

type AnalyticMetric = 'frame-length' | 'avg-sdf' | 'max-sdf' | 'avg-iters';
let selectedMetric: AnalyticMetric = 'avg-sdf';
const metricTitles: Record<AnalyticMetric, string> = {
    'frame-length' : 'Frame Length (ms)',
    'avg-sdf' : 'Average SDF Calls',
    'max-sdf' : 'Max SDF Calls',
    'avg-iters' : 'Average Iterations',
}

// Check for selected metric
const metricSelect = document.getElementById('analytics-menu') as HTMLSelectElement | null;
if (metricSelect) {
    metricSelect.addEventListener('change', (e) => {
        const value = (e.target as HTMLSelectElement).value as AnalyticMetric;
        selectedMetric = value;
        
        // Reset the graph
        resetGraph();
        chart.updateOptions({
            title: {
                text: metricTitles[selectedMetric],
                align: 'left'
            }
        }, false, false);
    });
}

// Graph data/options (using ApexCharts)
let data: [number, number][] = [];
let minData: number = -1;
let maxData: number = -1;
// Flag to avoid weird graph behaviour
let skipNextSample = false;
const AXIS_SCALE_FACTOR = 1.01;
const DEFAULT_Y_MIN = 0;
const DEFAULT_Y_MAX = 100;

// Literally just so theming works 
let currentYMin = DEFAULT_Y_MIN;
let currentYMax = DEFAULT_Y_MAX;
let currentTickAmount = Math.min(DEFAULT_Y_MAX - DEFAULT_Y_MIN, 20);

function resetGraph() {
    data.length = 0;
    chart.updateSeries([{ data }]);
    minData = -1;
    maxData = -1;
    skipNextSample = true;
}

function handleAlgorithmChange(selectedAlgo: string) {
    // internal algorithm string for the worker
    switch (selectedAlgo) {
        case 'fixed-step':
            algorithm = 'fixed-step';
            break;
        case 'sphere-tracing':
        default:
            // HTML uses "sphere-tracing", worker expects "sphere-tracer"
            algorithm = 'sphere-tracer';
            break;
    }

    // keep both dropdowns in sync
    algoSelect.value = selectedAlgo;
    if (analyticsAlgoSelect) {
        analyticsAlgoSelect.value = selectedAlgo;
    }

    // reset graph data for new algorithm
    resetGraph();
}

algoSelect.addEventListener('change', (e) => {
    const value = (e.target as HTMLSelectElement).value;
    handleAlgorithmChange(value);
});

if (analyticsAlgoSelect) {
    analyticsAlgoSelect.addEventListener('change', (e) => {
        const value = (e.target as HTMLSelectElement).value;
        handleAlgorithmChange(value);
    });
}

// getting acceleration structure type (added analytics support)
let accelerationStructure: "None" | "Octree" = "None";
const octreeToggle = document.getElementById('octree-toggle') as HTMLInputElement | null;
const analyticsOctreeToggle = document.getElementById('analytics-octree-toggle') as HTMLInputElement | null;

function handleAccelerationToggle(checked: boolean) {
    accelerationStructure = checked ? "Octree" : "None";

    // keep both checkboxes in sync
    if (octreeToggle) octreeToggle.checked = checked;
    if (analyticsOctreeToggle) analyticsOctreeToggle.checked = checked;

    // acceleration changes performance → reset graph
    resetGraph();
}

// Playground checkbox
octreeToggle?.addEventListener('change', e => {
    handleAccelerationToggle((e.target as HTMLInputElement).checked);
});

// Analytics checkbox
analyticsOctreeToggle?.addEventListener('change', e => {
    handleAccelerationToggle((e.target as HTMLInputElement).checked);
});

// Timing for FPS
let lastFrame = performance.now();
// let frameCount = 0; // not used right now

const scene = new Scene();
const sceneSelect = document.getElementById('scene-select') as HTMLSelectElement;
const analyticsSceneSelect = document.getElementById('analytics-scene-select') as HTMLSelectElement | null;

// Initialise dropdowns with current scene
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
    // Reset graph data when the scene changes
    resetGraph();
}

// Handle scene dropdown changes (single source of truth)
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
const analyticsOutputBuffer = new Uint8ClampedArray(width * height * 4);

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

const CHART_FONT =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", ' +
  'Roboto, "Helvetica Neue", sans-serif';
// ApexCharts options
var options = {
    series: data,
    chart: {
        id: 'realtime',
        height: 350,
        type: 'line',
        fontFamily: CHART_FONT,
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
    stroke: { 
        curve: 'smooth', 
        width: 3
    },
    title: {
        text: metricTitles[selectedMetric],
        align: 'left'
    },
    markers: { size: 0 },
    xaxis: { 
        type: 'datetime',
        range: 12000,
        labels: { show: false }, 
        axisTicks: { show: false },
        title: {
            text: 'Time'
        }
    },
    yaxis: {
        min: DEFAULT_Y_MIN,
        max: DEFAULT_Y_MAX,
        labels: {
            formatter: (value: number) => value.toFixed(0)
        }
    },
    tooltip: {enabled: false }, // Disable hovering
    legend: { show: false },
};

var chart = new ApexCharts(document.querySelector("#chart"), options);
chart.render();

// helper (need to run it once first at start)
function applyChartTheme(isDark: boolean) {
    const color = isDark ? "#eaeaea" : "#1a1a1f";

    chart.updateOptions({
        chart: { foreColor: color },
        title: {
            style: { color }
        },
        xaxis: {
            title: {
                style: { color }
            }
        },
        yaxis: {
            min: currentYMin,
            max: currentYMax,
            tickAmount: currentTickAmount,
            forceNiceScale: false,
            labels: {
                formatter: (value: number) => value.toFixed(0),
            }
        }
    }, false, false);
}

// initial theme based on body class
const initialIsDark = document.body.classList.contains('dark-mode');
applyChartTheme(initialIsDark);

// then listen for future theme changes
window.addEventListener('theme-change', (e: Event) => {
    const isDark = (e as CustomEvent<boolean>).detail;  
    applyChartTheme(isDark);
});

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
            w.postMessage({ width, height, time, yStart, yEnd, camera: { pitch, yaw }, algorithm, scenePresetIndex: sceneInfo.index, accelerationStructure });
        });
    });

    await Promise.all(jobs);

    // Shade playground view
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

    // Shade analytics view (with its own shader)
    if (analyticsCtx) {
        analyticsShadingModel.shade(
            analyticsOutputBuffer,
            depthBuffer,
            normalBuffer,
            SDFevaluationBuffer,
            iterationsBuffer,
            width,
            height
        );
        const analyticsImageData = new ImageData(analyticsOutputBuffer, width, height);
        analyticsCtx.putImageData(analyticsImageData, 0, 0);
    }

    // FPS calculation
    const now = performance.now();
    const frameLength = now - lastFrame;

    fpsDisplay.textContent = `Frame length: ${frameLength.toPrecision(4)}`;
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

    // Use the selected metric.
    let chosenAnalytic: number;
    switch (selectedMetric) {
        case 'frame-length':
            chosenAnalytic = frameLength;
            break;
        case 'avg-iters':
            chosenAnalytic = averageIterations;
            break;
        case 'max-sdf':
            chosenAnalytic = maxSDFCalls;
            break;
        case 'avg-sdf':
        default:
            chosenAnalytic = averageSDFCalls;
            break;
    }

    if (skipNextSample) {
        skipNextSample = false;
    } else {
        const prevMin = minData;
        const prevMax = maxData;

        if (minData === -1 || chosenAnalytic < minData) {
            minData = chosenAnalytic;
        }

        if (maxData === -1 || chosenAnalytic > maxData) {
            maxData = chosenAnalytic;
        }
                
        const desiredYMin = Math.max(0, minData * (1 / AXIS_SCALE_FACTOR));
        const desiredYMax = maxData * AXIS_SCALE_FACTOR;

        // snap to "nice" integer bounds based on desired range
        const padding = (desiredYMax - desiredYMin) * 0.5 || 1;

        let yMin = Math.floor(desiredYMin - padding);
        let yMax = Math.ceil(desiredYMax + padding);

        if (yMax <= yMin) {
            yMax = yMin + 1;
        }

        // number of *segments* between ticks
        const span = yMax - yMin;
        // ensures that we have the same number of ticks as there are integers
        // between max and min
        const tickAmount = Math.min(span, 20);

        if (minData !== prevMin || maxData !== prevMax) {
            currentYMin = yMin;
            currentYMax = yMax;
            currentTickAmount = tickAmount;
            
            chart.updateOptions({
                yaxis: {
                    min: yMin,
                    max: yMax,
                    tickAmount,
                    forceNiceScale: false,
                    labels: {
                        formatter: (value: number) => value.toFixed(0)
                    }
                }
            }, false, false);
        }

        const cutoff = now - 12000;
        data.push([now, chosenAnalytic]);
        while (data.length && data[0][0] < cutoff) data.shift();

        chart.updateSeries([{ data }], false);

        console.log({
            selectedMetric,
            chosenAnalytic,
            minData,
            maxData,
            yMin,
            yMax,
            tickAmount,
        });
    }

    requestAnimationFrame(render);
}

window.addEventListener("keydown", e => {
    // Disable keyboard in analytics.
    const analyticsView = document.getElementById("analytics-view");
    const isAnalyticsActive = analyticsView?.classList.contains("active-view");
    if (isAnalyticsActive) return;

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

// Mobile DPAD camera control
const mobileStep = 0.1;
let mobilePressed = {
    "up": false,
    "down": false,
    "right": false,
    "left": false
}

// Up
const up = document.getElementById('up');
// up?.addEventListener('click', () => onPan(0, mobileStep));
up?.addEventListener('pointerdown', () => {
    mobilePressed["up"] = true;
    setInterval(() => {mobilePressed["up"] ? onPan(0, mobileStep) : null}, 100);
});
up?.addEventListener('pointerout', () => {
    mobilePressed["up"] = false;
});

// Down
const down = document.getElementById('down');
// down?.addEventListener('click', () => onPan(0, -mobileStep));
down?.addEventListener('pointerdown', () => {
    mobilePressed["down"] = true;
    setInterval(() => {mobilePressed["down"] ? onPan(0, -mobileStep) : null}, 100);
});
down?.addEventListener('pointerout', () => {
    mobilePressed["down"] = false;
});

// Left
const left = document.getElementById('left');
left?.addEventListener('pointerdown', () => {
    mobilePressed["left"] = true;
    setInterval(() => {mobilePressed["left"] ? onPan(mobileStep, 0) : null}, 100);
});
left?.addEventListener('pointerout', () => {
    mobilePressed["left"] = false;
});

// Right
const right = document.getElementById('right');
right?.addEventListener('pointerdown', () => {
    mobilePressed["right"] = true;
    setInterval(() => {mobilePressed["right"] ? onPan(-mobileStep, 0) : null}, 100);
});
right?.addEventListener('pointerout', () => {
    mobilePressed["right"] = false;
});


requestAnimationFrame(render);
