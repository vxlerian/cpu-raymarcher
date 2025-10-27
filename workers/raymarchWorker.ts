/* eslint-disable no-restricted-globals */
import { Scene } from '../util/scene';
import { SphereTracer } from '../test_algorithms/sphereTracer';

// Types exchanged with the main thread
type Job = {
  width: number;
  height: number;
  time: number;
  yStart: number;
  yEnd: number;
  camera: { pitch: number; yaw: number };
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
  const { width, height, time, yStart, yEnd, camera } = e.data;

  // Build a fresh scene and set camera orientation
  const scene = new Scene();
  scene.camera.setAngles(camera.pitch, camera.yaw);
  scene.updateInverseSceneTransforms();

  // Allocate tile-local buffers
  const tileHeight = Math.max(0, yEnd - yStart);
  const depth = new Uint8ClampedArray(width * tileHeight);
  const normal = new Uint8ClampedArray(width * tileHeight * 3);
  const sdfEval = new Uint16Array(width * tileHeight);
  const iters = new Uint16Array(width * tileHeight);

  // Run the algorithm for this tile... hardcoded to SphereTracer for now
  const alg = new SphereTracer();

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
