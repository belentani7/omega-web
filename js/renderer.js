/**
 * Zero-dependency WebGL1 scene compositor with deterministic Canvas2D fallback.
 * Each world is a dynamic fragment shader sharing one trusted GLSL prelude.
 */
import { VERTEX_SHADER, compileWorldFragment } from './glsl.js';
import { createRng, clamp } from './math.js';
import { galaxy } from './worlds/galaxy.js';
import { planets } from './worlds/planets.js';
import { blackhole } from './worlds/blackhole.js';
import { ocean } from './worlds/ocean.js';
import { aurora } from './worlds/aurora.js';
import { clouds } from './worlds/clouds.js';
import { storm } from './worlds/storm.js';
import { solar } from './worlds/solar.js';

export const WORLD_SHADERS = Object.freeze({
  galaxy,
  planets,
  blackhole,
  ocean,
  aurora,
  clouds,
  storm,
  solar
});

const UNIFORMS = [
  'u_resolution',
  'u_pointer',
  'u_camera',
  'u_camera_position',
  'u_time',
  'u_frame',
  'u_quality',
  'u_reduced',
  'u_audio',
  'u_transition',
  'u_seed',
  'u_accent'
];

export class CosmosRenderer {
  constructor(canvas, options = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError('CosmosRenderer requires a canvas element.');
    }
    this.canvas = canvas;
    this.gl = null;
    this.ctx = null;
    this.fallbackCanvas = null;
    this.mode = 'pending';
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.frame = 0;
    this.world = 'galaxy';
    this.programs = new Map();
    this.worldColors = {
      galaxy: [1, .05, .27],
      planets: [1, .44, .21],
      blackhole: [1, .24, .28],
      ocean: [.1, .68, .91],
      aurora: [.3, .9, .5],
      clouds: [.56, .5, 1],
      storm: [.5, .45, .93],
      solar: [1, .76, .25]
    };
    this.active = null;
    this.buffer = null;
    this.onError = options.onError || (() => {});
    this.onMode = options.onMode || (() => {});
    this.contextLost = false;
    this.fallbackStars = [];
    this.backgroundGradient = null;
    this.transition = 1;
    this.transitionStart = 0;
    this.transitionDuration = 640;
    this.disposed = false;
    this.init();
  }

  init() {
    try {
      this.gl = this.canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false
      });
      if (!this.gl) {
        throw new Error('WebGL context is unavailable.');
      }
      this.initWebGL();
      this.mode = 'webgl';
      this.onMode('webgl');
    } catch (error) {
      this.report(error);
      this.gl = null;
      this.initCanvasFallback();
    }
    this.installContextHandlers();
  }

  installContextHandlers() {
    this.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.contextLost = true;
      this.active = null;
      this.programs.clear();
      this.gl = null;
      // Canvas2D cannot take over a canvas already bound to WebGL.
      // Draw on a separate non-interactive overlay; keep camera input on the original.
      this.initCanvasFallback();
      this.contextLost = false;
      this.resize(this.width, this.height, this.dpr);
      this.onError('GPU context lost. Canvas2D is active while recovering.');
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      try {
        this.gl = this.canvas.getContext('webgl');
        if (!this.gl) throw new Error('WebGL restoration failed.');
        this.contextLost = false;
        this.mode = 'webgl';
        this.initWebGL();
        this.ctx = null;
        this.fallbackCanvas?.remove();
        this.fallbackCanvas = null;
        this.onMode('webgl');
        this.resize(this.width, this.height, this.dpr);
      } catch (error) {
        this.report(error);
        this.gl = null;
        this.initCanvasFallback();
        this.resize(this.width, this.height, this.dpr);
      }
    });
  }

  initWebGL() {
    const gl = this.gl;
    if (!gl) return;
    this.programs.clear();
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]), gl.STATIC_DRAW);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    this.setWorld(this.world);
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Unknown GLSL compilation error.';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  createProgram(worldId) {
    const gl = this.gl;
    const source = WORLD_SHADERS[worldId];
    if (!source) throw new RangeError('Unknown world: ' + worldId);
    const vertex = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    let fragment;
    try {
      fragment = this.compileShader(gl.FRAGMENT_SHADER, compileWorldFragment(source));
    } catch (error) {
      gl.deleteShader(vertex);
      throw error;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'Unknown program linking error.';
      gl.deleteProgram(program);
      throw new Error(message);
    }
    const position = gl.getAttribLocation(program, 'a_position');
    const uniforms = Object.fromEntries(
      UNIFORMS.map(name => [name, gl.getUniformLocation(program, name)])
    );
    return { program, position, uniforms };
  }

  /** Last-resort WebGL program; it keeps navigation visible if an advanced shader fails. */
  createMinimalProgram() {
    const gl = this.gl;
    const vertex = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fallback = `
      precision mediump float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec3 u_accent;
      void main() {
        vec2 p = v_uv * 2.0 - 1.0;
        float radius = length(p);
        float glow = .03 / (.01 + radius * radius);
        float star = step(.9985, fract(sin(dot(floor(v_uv*vec2(850.0,480.0)),vec2(12.9898,78.233))) * 43758.5453));
        vec3 base = vec3(.006,.004,.016) + u_accent * glow * .3;
        base += vec3(.8,.83,1.0) * star * (.4+.2*sin(u_time));
        gl_FragColor = vec4(min(base,vec3(1.0)),1.0);
      }
    `;
    const fragment = this.compileShader(gl.FRAGMENT_SHADER, fallback);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'Unable to link fallback shader.';
      gl.deleteProgram(program);
      throw new Error(message);
    }
    const position = gl.getAttribLocation(program, 'a_position');
    const uniforms = Object.fromEntries(
      UNIFORMS.map(name => [name, gl.getUniformLocation(program, name)])
    );
    return { program, position, uniforms, fallback: true };
  }

  setWorld(worldId) {
    if (!(worldId in WORLD_SHADERS)) {
      throw new RangeError('Unknown world: ' + worldId);
    }
    this.world = worldId;
    this.transitionStart = performance.now();
    this.transition = 0;
    if (this.mode === 'canvas') return;
    if (!this.gl || this.contextLost) return;
    try {
      if (!this.programs.has(worldId)) {
        this.programs.set(worldId, this.createProgram(worldId));
      }
      this.active = this.programs.get(worldId);
    } catch (error) {
      this.report(error);
      this.active = null;
      this.onError('World shader could not compile: ' + worldId);
      if (this.programs.has('galaxy')) {
        this.active = this.programs.get('galaxy');
      } else {
        try {
          this.active = this.createMinimalProgram();
        } catch (fallbackError) {
          this.report(fallbackError);
        }
      }
    }
  }

  precompileAll() {
    const failures = [];
    if (!this.gl) return failures;
    for (const worldId of Object.keys(WORLD_SHADERS)) {
      try {
        if (!this.programs.has(worldId)) {
          this.programs.set(worldId, this.createProgram(worldId));
        }
      } catch (error) {
        failures.push({ worldId, error: String(error.message || error) });
      }
    }
    return failures;
  }

  resize(width, height, dpr = 1) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.dpr = clamp(dpr, .5, 2);
    const nextWidth = Math.min(4096, Math.ceil(this.width * this.dpr));
    const nextHeight = Math.min(4096, Math.ceil(this.height * this.dpr));
    if (this.canvas.width !== nextWidth || this.canvas.height !== nextHeight) {
      this.canvas.width = nextWidth;
      this.canvas.height = nextHeight;
    }
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.fallbackCanvas) {
      this.fallbackCanvas.width = nextWidth;
      this.fallbackCanvas.height = nextHeight;
      this.fallbackCanvas.style.width = this.width + 'px';
      this.fallbackCanvas.style.height = this.height + 'px';
    }
    if (this.ctx) this.backgroundGradient = null;
  }

  draw(frame) {
    if (this.disposed || this.contextLost) return;
    const elapsed = frame.now - this.transitionStart;
    this.transition = Math.min(1, Math.max(0, elapsed / this.transitionDuration));
    this.frame++;
    if (this.gl && this.active) {
      this.drawWebGL(frame);
    } else if (this.ctx) {
      this.drawCanvas(frame);
    }
  }

  drawWebGL(frame) {
    const gl = this.gl;
    const { program, position, uniforms } = this.active;
    const camera = frame.camera;
    const pointer = frame.pointer ?? { x: 0, y: 0 };
    const accent = this.worldColors[this.world];
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(uniforms.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform2f(uniforms.u_pointer, pointer.x, pointer.y);
    gl.uniform4f(uniforms.u_camera, camera.yaw, camera.pitch, camera.zoom, camera.radius);
    gl.uniform3f(uniforms.u_camera_position, camera.position?.x ?? 0, camera.position?.y ?? 0, camera.position?.z ?? 0);
    gl.uniform1f(uniforms.u_time, frame.time);
    gl.uniform1f(uniforms.u_frame, this.frame);
    gl.uniform1f(uniforms.u_quality, frame.quality);
    gl.uniform1f(uniforms.u_reduced, frame.reduced ? 1 : 0);
    gl.uniform1f(uniforms.u_audio, frame.audio ?? 0);
    gl.uniform1f(uniforms.u_transition, 1 - this.transition);
    gl.uniform1f(uniforms.u_seed, 432.07);
    gl.uniform3f(uniforms.u_accent, accent[0], accent[1], accent[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if ((this.frame & 63) === 0) {
      const error = gl.getError();
      if (error !== gl.NO_ERROR) this.report(new Error('WebGL error: ' + error));
    }
  }

  initCanvasFallback() {
    try {
      if (!this.fallbackCanvas) {
        this.fallbackCanvas = document.createElement('canvas');
        this.fallbackCanvas.id = 'omega-canvas-fallback';
        this.fallbackCanvas.setAttribute('aria-hidden', 'true');
        this.fallbackCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none';
        this.canvas.insertAdjacentElement('afterend', this.fallbackCanvas);
      }
      this.ctx = this.fallbackCanvas.getContext('2d', { alpha: false });
      if (!this.ctx) throw new Error('Canvas2D unavailable.');
      const rand = createRng(43207);
      this.fallbackStars = Array.from({ length: 1100 }, () => ({
        x: rand(),
        y: rand(),
        radius: rand() * 1.4 + .12,
        speed: rand() * .000025 + .000006,
        color: rand() < .2 ? '#ff5d86' : rand() < .5 ? '#83dbfa' : '#f5f3ff',
        opacity: rand() * .68 + .23
      }));
      this.mode = 'canvas';
      this.onMode('canvas');
    } catch (error) {
      this.ctx = null;
      this.mode = 'css';
      this.report(error);
      this.onMode('css');
    }
  }

  drawCanvas(frame) {
    const ctx = this.ctx;
    const w = this.fallbackCanvas?.width ?? this.canvas.width;
    const h = this.fallbackCanvas?.height ?? this.canvas.height;
    if (!this.backgroundGradient) {
      const gradient = ctx.createRadialGradient(w * .52, h * .43, 2, w * .52, h * .43, w * .7);
      gradient.addColorStop(0, '#24101e');
      gradient.addColorStop(.43, '#080410');
      gradient.addColorStop(1, '#020103');
      this.backgroundGradient = gradient;
    }
    ctx.fillStyle = this.backgroundGradient;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w * .52, h * .45);
    ctx.rotate(frame.camera.yaw * .10);
    const accent = this.worldColors[this.world];
    const red = Math.round(accent[0] * 255);
    const green = Math.round(accent[1] * 255);
    const blue = Math.round(accent[2] * 255);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.min(w, h) * .32);
    gradient.addColorStop(0, `rgba(${red},${green},${blue},.46)`);
    gradient.addColorStop(.2, `rgba(${red},${green},${blue},.14)`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    const radius = Math.min(w, h) * .4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    for (const star of this.fallbackStars) {
      const x = (star.x * w + frame.camera.yaw * 15 * this.dpr) % w;
      const y = (star.y * h + frame.time * 13 * star.speed * h) % h;
      const alpha = frame.reduced ? star.opacity : star.opacity * (.85 + .15 * Math.sin(frame.time * 1.3 + star.x * 40));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = star.color;
      ctx.fillRect(x, y, star.radius * this.dpr, star.radius * this.dpr);
    }
    ctx.globalAlpha = 1;
  }

  captureImage() {
    try {
      return this.canvas.toDataURL('image/png');
    } catch (error) {
      this.report(error);
      return null;
    }
  }

  report(error) {
    console.warn('[OMEGA RENDERER]', error);
    this.onError(error instanceof Error ? error.message : String(error));
  }

  dispose() {
    this.disposed = true;
    if (this.gl) {
      if (this.active?.fallback) this.gl.deleteProgram(this.active.program);
      for (const value of this.programs.values()) {
        this.gl.deleteProgram(value.program);
      }
      this.programs.clear();
      if (this.buffer) this.gl.deleteBuffer(this.buffer);
    }
    this.active = null;
    this.ctx = null;
    this.fallbackCanvas?.remove();
    this.fallbackCanvas = null;
    this.fallbackStars = [];
  }
}
