/** A deterministic hybrid camera: cinematic drift, free flight, and orbit. */
import { clamp, exponentialDamp, shortestAngle, vec3, TAU } from './math.js';

export const CAMERA_MODES = Object.freeze(['cinematic', 'orbit', 'free']);

export class CameraRig {
  constructor(element, options = {}) {
    this.element = element;
    this.mode = options.mode ?? 'cinematic';
    this.yaw = .16;
    this.pitch = .12;
    this.zoom = 1;
    this.radius = 4;
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
    this.targetZoom = this.zoom;
    this.targetRadius = this.radius;
    this.position = vec3(0, 0, -4);
    this.velocity = vec3();
    this.pointer = { x: 0, y: 0 };
    this.pointerTarget = { x: 0, y: 0 };
    this.keys = new Set();
    this.dragging = false;
    this.activePointer = null;
    this.activeTouches = new Map();
    this.pinchDistance = 0;
    this.lastPointer = { x: 0, y: 0 };
    this.pointerDown = { x: 0, y: 0 };
    this.distanceDragged = 0;
    this.enabled = true;
    this.reduced = !!options.reduced;
    this.autoRotate = !this.reduced;
    this.onInteraction = options.onInteraction ?? (() => {});
    this.onMode = options.onMode ?? (() => {});
    this.bound = [];
    this.install();
  }

  listen(target, name, listener, options) {
    target.addEventListener(name, listener, options);
    this.bound.push(() => target.removeEventListener(name, listener, options));
  }

  install() {
    this.listen(this.element, 'pointerdown', event => this.pointerDownEvent(event));
    this.listen(this.element, 'pointermove', event => this.pointerMoveEvent(event));
    this.listen(this.element, 'pointerup', event => this.pointerUpEvent(event));
    this.listen(this.element, 'pointercancel', event => this.pointerUpEvent(event));
    this.listen(this.element, 'wheel', event => this.wheelEvent(event), { passive: false });
    this.listen(window, 'keydown', event => this.keyDownEvent(event));
    this.listen(window, 'keyup', event => this.keyUpEvent(event));
    this.listen(window, 'blur', () => {
      this.keys.clear();
      this.dragging = false;
      this.activePointer = null;
      this.activeTouches.clear();
      this.pinchDistance = 0;
    });
    this.listen(document, 'visibilitychange', () => {
      if (document.hidden) { this.keys.clear(); this.activeTouches.clear(); this.dragging = false; this.activePointer = null; this.pinchDistance = 0; }
    });
  }

  gestureDistance() {
    const values = [...this.activeTouches.values()];
    if (values.length < 2) return 0;
    return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  }

  pointerDownEvent(event) {
    if (!this.enabled || (event.pointerType !== 'touch' && event.button !== 0)) return;
    const point = { x: event.clientX, y: event.clientY };
    this.activeTouches.set(event.pointerId, point);
    if (this.activePointer === null) {
      this.activePointer = event.pointerId;
      this.pointerDown = { ...point };
      this.lastPointer = { ...point };
      this.distanceDragged = 0;
    }
    this.dragging = true;
    if (this.activeTouches.size >= 2) this.pinchDistance = this.gestureDistance();
    try { this.element.setPointerCapture(event.pointerId); }
    catch { /* Browser can cancel a capture during gesture initiation. */ }
    this.onInteraction('pointerdown');
  }

  pointerMoveEvent(event) {
    if (!this.enabled) return;
    const bounds = this.element.getBoundingClientRect();
    if (bounds.width > 0 && bounds.height > 0) {
      this.pointerTarget.x = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
      this.pointerTarget.y = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1);
    }
    if (!this.activeTouches.has(event.pointerId)) return;
    this.activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.activeTouches.size >= 2) {
      const distance = this.gestureDistance();
      if (this.pinchDistance > 0 && distance > 0) {
        this.targetZoom = clamp(this.targetZoom * distance / this.pinchDistance, .48, 2.9);
        if (this.mode === 'cinematic') this.setMode('orbit');
        this.onInteraction('pinch');
      }
      this.pinchDistance = distance;
      return;
    }
    if (!this.dragging || this.activePointer !== event.pointerId) return;
    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.distanceDragged += Math.abs(dx) + Math.abs(dy);
    this.lastPointer.x = event.clientX;
    this.lastPointer.y = event.clientY;
    this.targetYaw += dx * .005;
    this.targetPitch = clamp(this.targetPitch + dy * .0037, -1.22, 1.22);
    if (this.mode === 'cinematic') this.setMode('orbit');
    this.onInteraction('drag');
  }

  pointerUpEvent(event) {
    if (!this.activeTouches.has(event.pointerId)) return;
    this.activeTouches.delete(event.pointerId);
    this.pinchDistance = this.activeTouches.size >= 2 ? this.gestureDistance() : 0;
    if (event.pointerId === this.activePointer) {
      const remaining = this.activeTouches.entries().next().value;
      this.activePointer = remaining ? remaining[0] : null;
      if (remaining) this.lastPointer = { ...remaining[1] };
    }
    this.dragging = this.activeTouches.size > 0;
    try { this.element.releasePointerCapture(event.pointerId); }
    catch { /* Pointer may already have been released. */ }
    this.onInteraction('pointerup');
  }

  wheelEvent(event) {
    if (!this.enabled) return;
    event.preventDefault();
    const normalized = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    this.targetZoom = clamp(this.targetZoom * Math.exp(-normalized * .00125), .48, 2.9);
    if (this.mode === 'cinematic') this.setMode('orbit');
    this.onInteraction('zoom');
  }

  keyDownEvent(event) {
    if (!this.enabled || event.altKey || event.ctrlKey || event.metaKey) return;
    const element = document.activeElement;
    if (element?.matches('input,textarea,select,[contenteditable="true"]')) return;
    const key = event.key.toLowerCase();
    if ('wasdqerf'.includes(key) && key.length === 1) {
      this.keys.add(key);
      if (this.mode === 'cinematic') this.setMode('free');
      this.onInteraction('keyboard');
    }
    if (key === 'shift') this.keys.add(key);
  }

  keyUpEvent(event) {
    this.keys.delete(event.key.toLowerCase());
  }

  setMode(mode) {
    if (!CAMERA_MODES.includes(mode)) return false;
    if (this.mode === mode) return true;
    this.mode = mode;
    this.autoRotate = mode === 'cinematic' && !this.reduced;
    this.onMode(mode);
    return true;
  }

  cycleMode() {
    const index = CAMERA_MODES.indexOf(this.mode);
    const next = CAMERA_MODES[(index + 1) % CAMERA_MODES.length];
    this.setMode(next);
    return next;
  }

  update(deltaSeconds, timeSeconds) {
    const dt = clamp(deltaSeconds, 0, .05);
    const drift = this.autoRotate ? dt * .023 : 0;
    this.targetYaw += drift;
    const damping = this.reduced ? 35 : 8;
    this.yaw += shortestAngle(this.yaw, this.targetYaw) * (1 - Math.exp(-damping * dt));
    this.pitch = exponentialDamp(this.pitch, this.targetPitch, damping, dt);
    this.zoom = exponentialDamp(this.zoom, this.targetZoom, damping, dt);
    this.radius = exponentialDamp(this.radius, this.targetRadius, damping, dt);
    this.pointer.x = exponentialDamp(this.pointer.x, this.pointerTarget.x, 5, dt);
    this.pointer.y = exponentialDamp(this.pointer.y, this.pointerTarget.y, 5, dt);
    if (this.mode === 'cinematic' && !this.reduced) {
      this.pitch += Math.sin(timeSeconds * .12) * .0002;
    }
    if (this.mode === 'free') this.integrateFlight(dt);
  }

  integrateFlight(dt) {
    const speed = this.keys.has('shift') ? 3.3 : 1.2;
    const forward = Number(this.keys.has('w')) - Number(this.keys.has('s'));
    const sideways = Number(this.keys.has('d')) - Number(this.keys.has('a'));
    const altitude = Number(this.keys.has('e')) - Number(this.keys.has('q'));
    const rotate = Number(this.keys.has('r')) - Number(this.keys.has('f'));
    const cos = Math.cos(this.yaw);
    const sin = Math.sin(this.yaw);
    const ax = (sideways * cos + forward * sin) * speed;
    const az = (forward * cos - sideways * sin) * speed;
    this.velocity.x = exponentialDamp(this.velocity.x, ax, 9, dt);
    this.velocity.y = exponentialDamp(this.velocity.y, altitude * speed, 9, dt);
    this.velocity.z = exponentialDamp(this.velocity.z, az, 9, dt);
    this.position.x = clamp(this.position.x + this.velocity.x * dt, -15, 15);
    this.position.y = clamp(this.position.y + this.velocity.y * dt, -15, 15);
    this.position.z = clamp(this.position.z + this.velocity.z * dt, -25, 25);
    this.targetYaw += rotate * dt * .4;
    this.targetZoom = clamp(1 + this.position.z * .035, .48, 2.9);
    this.targetPitch = clamp(this.targetPitch + this.position.y * dt * .008, -1.22, 1.22);
  }

  reset(options = {}) {
    this.targetYaw = options.yaw ?? .16;
    this.targetPitch = options.pitch ?? .12;
    this.targetZoom = options.zoom ?? 1;
    this.targetRadius = options.radius ?? 4;
    this.position = vec3(0, 0, -4);
    this.velocity = vec3();
    if (options.mode) this.setMode(options.mode);
  }

  snapToWorld(index) {
    const offset = [0, .31, -.42, .18, -.25, .38, -.36, .05][index] ?? 0;
    this.targetYaw = offset;
    this.targetPitch = [.09,.16,.04,-.17,.18,.22,-.12,.16][index] ?? 0;
    this.targetZoom = [1,1.05,.82,.93,1.15,.99,1.04,1.05][index] ?? 1;
    if (this.reduced) {
      this.yaw = this.targetYaw;
      this.pitch = this.targetPitch;
      this.zoom = this.targetZoom;
    }
  }

  getSnapshot() {
    return {
      mode: this.mode,
      yaw: this.yaw,
      pitch: this.pitch,
      zoom: this.zoom,
      radius: this.radius,
      position: { ...this.position },
      pointer: { ...this.pointer },
      dragging: this.dragging
    };
  }

  dispose() {
    for (const remove of this.bound) remove();
    this.bound.length = 0;
    this.keys.clear();
    this.activeTouches.clear();
    this.enabled = false;
  }
}
