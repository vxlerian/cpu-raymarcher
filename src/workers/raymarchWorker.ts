/* eslint-disable no-restricted-globals */
import { Scene } from '../util/scene';
import { SphereTracer } from '../cpu_algorithms/sphereTracer';
import { FixedStep } from '../cpu_algorithms/fixedStep';
import { AdaptiveStep } from '../cpu_algorithms/adaptiveStep';
import { AdaptiveStepV2 } from '../cpu_algorithms/adaptiveStepV2';
import { AdaptiveStepV3 } from '../cpu_algorithms/adaptiveStepV3';

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
  accelerationStructure: string;
  overshootFactor?: number;
  stepSize?: number;
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
  const { width, height, time, yStart, yEnd, camera, algorithm, scenePresetIndex, accelerationStructure, overshootFactor, stepSize } = e.data;

  // Build a fresh scene and set camera orientation
  const scene = new Scene(accelerationStructure);
  scene.loadPreset(scenePresetIndex); // Load the current scene
  scene.camera.setAngles(camera.pitch, camera.yaw);

  // Allocate tile-local buffers
  const tileHeight = Math.max(0, yEnd - yStart);
  const depth = new Uint8ClampedArray(width * tileHeight);
  const normal = new Uint8ClampedArray(width * tileHeight * 3);
  const sdfEval = new Uint16Array(width * tileHeight);
  const iters = new Uint16Array(width * tileHeight);

  // Run the algorithm for this tile
  let alg;
  switch (algorithm) {
    case 'sphere-tracer':
      alg = new SphereTracer();
      break;
    case 'fixed-step':
      alg = new FixedStep(stepSize);
      break;
    case 'adaptive-step':
      alg = new AdaptiveStep();
      break;
    case 'adaptive-step-v2':
      alg = new AdaptiveStepV2(overshootFactor);
      break;
    case 'adaptive-step-v3':
      alg = new AdaptiveStepV3(overshootFactor);
      break;
    default:
      alg = new SphereTracer();
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
