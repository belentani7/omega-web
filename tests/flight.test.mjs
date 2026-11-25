import test from 'node:test';
import assert from 'node:assert/strict';
import { CameraRig } from '../js/camera.js';
import { CosmosRenderer, WORLD_SHADERS } from '../js/renderer.js';
import { GLSL_PRELUDE, compileWorldFragment } from '../js/glsl.js';

test('All eight worlds receive translated flight coordinates through the shared shader', () => {
  assert.match(GLSL_PRELUDE, /uniform vec3 u_camera_position;/);
  assert.match(GLSL_PRELUDE, /normalizedUV\(\)/);
  assert.match(GLSL_PRELUDE, /u_camera_position\.xy\s*\*\s*\.035/);
  for (const shader of Object.values(WORLD_SHADERS)) {
    const fragment = compileWorldFragment(shader);
    assert.match(fragment, /uniform vec3 u_camera_position;/);
    assert.match(fragment, /vec3\s+renderWorld\s*\(/);
  }
});

test('Renderer binds camera XYZ to u_camera_position in a real draw path', () => {
  const calls = [];
  const gl = {
    TRIANGLES: 4, ARRAY_BUFFER: 0x8892, FLOAT: 5126, NO_ERROR: 0,
    viewport() {}, useProgram() {}, bindBuffer() {},
    enableVertexAttribArray() {}, vertexAttribPointer() {},
    uniform1f() {}, uniform2f() {}, uniform4f() {},
    uniform3f(location, ...values) { calls.push({ location, values }); },
    drawArrays() {}, getError() { return 0; }
  };
  const uniforms = Object.fromEntries([
    'u_resolution','u_pointer','u_camera','u_camera_position','u_time',
    'u_frame','u_quality','u_reduced','u_audio','u_transition',
    'u_seed','u_accent'
  ].map(key => [key, key]));
  const mock = {
    gl, canvas: { width: 640, height: 480 }, frame: 1, buffer: {},
    active: { program: {}, position: 0, uniforms },
    world: 'galaxy', worldColors: { galaxy: [1, .05, .27] },
    transition: 1, report(error) { throw error; }
  };
  CosmosRenderer.prototype.drawWebGL.call(mock, {
    camera: { yaw: 0, pitch: 0, zoom: 1, radius: 4,
      position: { x: 1.25, y: -.8, z: 2.5 } },
    pointer: { x: 0, y: 0 }, now: 1000, time: 1,
    quality: .7, reduced: false, audio: 0
  });
  assert.deepEqual(calls.find(call => call.location === 'u_camera_position')?.values,
    [1.25, -.8, 2.5]);
});

test('Actual CameraRig side/vertical/forward flight changes scene position', () => {
  const rig = Object.create(CameraRig.prototype);
  rig.keys = new Set(['d', 'e', 'w']);
  rig.yaw = 0;
  rig.targetYaw = 0;
  rig.targetPitch = 0;
  rig.targetZoom = 1;
  rig.velocity = { x: 0, y: 0, z: 0 };
  rig.position = { x: 0, y: 0, z: -4 };
  rig.integrateFlight(.05);
  assert.ok(rig.position.x > 0);
  assert.ok(rig.position.y > 0);
  assert.ok(rig.position.z > -4);
  const snapshot = rig.getSnapshot();
  assert.equal(snapshot.position.x, rig.position.x);
  assert.equal(snapshot.position.y, rig.position.y);
});

test('A failed WebGL context uses a separate canvas and cleans up correctly', () => {
  const beforeCanvas = globalThis.HTMLCanvasElement;
  const beforeDocument = globalThis.document;
  class StubCanvas {
    constructor() { this.width = 0; this.height = 0; this.style = {}; this.inserted = []; this.removed = false; }
    getContext(kind) {
      if (kind === 'webgl') return null;
      if (kind === '2d') return {
        clearRect() {}, fillRect() {},
        createRadialGradient() { return { addColorStop() {} }; }
      };
      return null;
    }
    addEventListener() {}
    setAttribute() {}
    insertAdjacentElement(_, child) { this.inserted.push(child); }
    remove() { this.removed = true; }
  }
  globalThis.HTMLCanvasElement = StubCanvas;
  globalThis.document = { createElement: () => new StubCanvas() };
  let renderer;
  try {
    renderer = new CosmosRenderer(new StubCanvas(), { onError() {} });
    assert.equal(renderer.mode, 'canvas');
    assert.equal(renderer.canvas.inserted.length, 1);
    assert.notEqual(renderer.fallbackCanvas, renderer.canvas);
    renderer.resize(390, 800, 1.4);
    assert.equal(renderer.fallbackCanvas.width, 546);
    assert.equal(renderer.fallbackCanvas.height, 1120);
    const overlay = renderer.fallbackCanvas;
    renderer.dispose();
    assert.equal(overlay.removed, true);
    assert.equal(renderer.fallbackCanvas, null);
  } finally {
    renderer?.dispose();
    if (beforeCanvas === undefined) delete globalThis.HTMLCanvasElement;
    else globalThis.HTMLCanvasElement = beforeCanvas;
    if (beforeDocument === undefined) delete globalThis.document;
    else globalThis.document = beforeDocument;
  }
});
