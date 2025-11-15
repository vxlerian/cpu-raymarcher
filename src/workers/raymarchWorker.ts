/* eslint-disable no-restricted-globals */
import { Scene } from '../util/scene';
import { SphereTracer } from '../cpu_algorithms/sphereTracer';
import { FixedStep } from '../cpu_algorithms/fixedStep';
import { SphereTracerBVH } from '../cpu_algorithms/sphereTracerBVH';
import { FixedStepBVH } from '../cpu_algorithms/fixedStepBVH';

// Types exchanged with the main thread
type Job = {
  width: number;
  height: number;
  time: number;
  yStart: number;
  yEnd: number;
  camera: { pitch: number; yaw: number };
  algorithm: string;
  scenePresetIndex: number;
  optimization: string;
};

type Result = {
  yStart: number;
  yEnd: number;
  depth: Uint8ClampedArray;
  normal: Uint8ClampedArray;
  sdfEval: Uint16Array;
  iters: Uint16Array;
};

self.onmessage = (e: MessageEvent<Job>) => {
  const { width, height, time, yStart, yEnd, camera, algorithm, scenePresetIndex, optimization } = e.data;

  // Build a fresh scene and set camera orientation
  const scene = new Scene();
  scene.loadPreset(scenePresetIndex); // Load the current scene
  scene.camera.setAngles(camera.pitch, camera.yaw);

  // Allocate tile-local buffers
  const tileHeight = Math.max(0, yEnd - yStart);
  const depth = new Uint8ClampedArray(width * tileHeight);
  const normal = new Uint8ClampedArray(width * tileHeight * 3);
  const sdfEval = new Uint16Array(width * tileHeight);
  const iters = new Uint16Array(width * tileHeight);

  // Select raymarcher based on algorithm and optimization
  let alg;
  const algorithmKey = `${algorithm}-${optimization}`;
  
  switch (algorithmKey) {
    case 'sphere-tracer-bvh':
      alg = new SphereTracerBVH();
      break;
    case 'fixed-step-bvh':
      alg = new FixedStepBVH();
      break;
    case 'sphere-tracer-none':
      alg = new SphereTracer();
      break;
    case 'fixed-step-none':
      alg = new FixedStep();
      break;
    default:
      // Default to non-optimized version if not recognized
      if (algorithm === 'fixed-step') {
        alg = new FixedStep();
      } else {
        alg = new SphereTracer();
      }
  }

  alg.runRaymarcher(
    scene,
    depth,
    normal,
    sdfEval,
    iters,
    width,
    height,
    time,
    yStart,
    yEnd
  );

  const msg: Result = { yStart, yEnd, depth, normal, sdfEval, iters };

  // transfer buffers to avoid copying large arrays
  (self as unknown as Worker).postMessage(msg, [
    depth.buffer,
    normal.buffer,
    sdfEval.buffer,
    iters.buffer,
  ]);
};
