import test from 'node:test';
import assert from 'node:assert/strict';
import { CameraRig } from '../js/camera.js';

function makeRig(options = {}) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const receiver = { addEventListener() {}, removeEventListener() {} };
  globalThis.window = receiver;
  globalThis.document = { ...receiver, hidden: false, activeElement: { matches: () => false } };
  const captured = [];
  const surface = {
    addEventListener() {}, removeEventListener() {},
    setPointerCapture(id) { captured.push(id); },
    releasePointerCapture() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 800 }; }
  };
  const camera = new CameraRig(surface, options);
  return {
    camera, captured,
    dispose() {
      camera.dispose();
      if (originalWindow === undefined) delete globalThis.window;
      else globalThis.window = originalWindow;
      if (originalDocument === undefined) delete globalThis.document;
      else globalThis.document = originalDocument;
    }
  };
}
function touch(id, x, y) {
  return { pointerId: id, pointerType: 'touch', button: 0, clientX: x, clientY: y };
}

test('Two-finger pinch enlarges Omega and reassigns the active finger on release', () => {
  const { camera, dispose } = makeRig();
  try {
    camera.pointerDownEvent(touch(1, 100, 300));
    camera.pointerDownEvent(touch(2, 200, 300));
    const before = camera.targetZoom;
    camera.pointerMoveEvent(touch(2, 240, 300));
    assert.ok(camera.targetZoom > before, 'Pinching outward should increase zoom');
    assert.equal(camera.mode, 'orbit');
    assert.equal(camera.activeTouches.size, 2);
    camera.pointerUpEvent(touch(1, 100, 300));
    assert.equal(camera.activePointer, 2);
    camera.pointerMoveEvent(touch(2, 251, 301));
    assert.ok(Number.isFinite(camera.targetYaw));
    camera.pointerUpEvent(touch(2, 251, 301));
    assert.equal(camera.activePointer, null);
    assert.equal(camera.dragging, false);
    assert.equal(camera.activeTouches.size, 0);
  } finally { dispose(); }
});

test('Single finger rotates the galaxy and never escapes pitch bounds', () => {
  const { camera, dispose } = makeRig();
  try {
    camera.pointerDownEvent(touch(1, 100, 100));
    const yaw = camera.targetYaw;
    camera.pointerMoveEvent(touch(1, 200, 10000));
    assert.ok(camera.targetYaw > yaw);
    assert.ok(camera.targetPitch <= 1.22);
    camera.pointerUpEvent(touch(1, 200, 10000));
  } finally { dispose(); }
});

test('Right mouse clicks do not hijack camera movement', () => {
  const { camera, dispose } = makeRig();
  try {
    camera.pointerDownEvent({ ...touch(3, 50, 50), pointerType: 'mouse', button: 2 });
    assert.equal(camera.activeTouches.size, 0);
  } finally { dispose(); }
});

test('Zoom wheel clamps magnification and supports simulated reduced motion', () => {
  const { camera, dispose } = makeRig({ reduced: true });
  try {
    assert.equal(camera.autoRotate, false);
    camera.wheelEvent({ preventDefault() {}, deltaMode: 0, deltaY: -999999 });
    assert.equal(camera.targetZoom, 2.9);
    camera.wheelEvent({ preventDefault() {}, deltaMode: 0, deltaY: 999999 });
    assert.equal(camera.targetZoom, .48);
  } finally { dispose(); }
});

test('Disposing camera releases all pointer interaction state', () => {
  const { camera, dispose } = makeRig();
  camera.pointerDownEvent(touch(1, 20, 20));
  dispose();
  assert.equal(camera.enabled, false);
  assert.equal(camera.activeTouches.size, 0);
});
