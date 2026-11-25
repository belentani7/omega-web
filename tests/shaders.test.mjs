import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_SHADERS } from '../js/renderer.js';
import { WORLDS } from '../js/data.js';
import { GLSL_PRELUDE, GLSL_EPILOGUE, VERTEX_SHADER, compileWorldFragment } from '../js/glsl.js';

test('All eight world IDs map to unique GLSL programs', () => {
  assert.equal(Object.keys(WORLD_SHADERS).length, 8);
  const ids = WORLDS.map(world => world.id);
  assert.deepEqual(Object.keys(WORLD_SHADERS), ids);
});

test('Every fragment exports the shared renderWorld interface', () => {
  for (const [id, source] of Object.entries(WORLD_SHADERS)) {
    assert.match(source, /vec3\s+renderWorld\s*\(\s*vec2\s+uv\s*\)/, id);
    assert.ok(source.length > 1000, id + ' fragment is too small to be a procedural world.');
    assert.ok(!source.includes('#include "http'), id + ' may not use remote includes.');
    assert.ok(!source.includes('sampler2D'), id + ' is procedural, without image downloads.');
  }
});

test('Shader compiler refuses unknown world source', () => {
  assert.throws(() => compileWorldFragment('void main() {}'), /renderWorld/);
  assert.throws(() => compileWorldFragment(''), /renderWorld/);
});

test('GLSL source assembly preserves the prelude and postlude', () => {
  for (const source of Object.values(WORLD_SHADERS)) {
    const combined = compileWorldFragment(source);
    assert.ok(combined.startsWith(GLSL_PRELUDE));
    assert.ok(combined.endsWith(GLSL_EPILOGUE));
    assert.match(combined, /uniform vec2 u_resolution;/);
    assert.match(combined, /uniform vec4 u_camera;/);
    assert.match(combined, /void main\(\)/);
    assert.match(combined, /gl_FragColor=/);
  }
});

test('Vertex shader writes valid homogeneous clip coordinates', () => {
  assert.match(VERTEX_SHADER, /attribute vec2 a_position/);
  assert.match(VERTEX_SHADER, /gl_Position\s*=/);
  assert.match(VERTEX_SHADER, /vec4\(a_position,\s*0\.0,\s*1\.0\)/);
});

test('Shared GLSL noise and physical lighting primitives are present', () => {
  for (const fn of ['fbm2', 'fbm3', 'noise3', 'shadePBR', 'fresnel', 'sphereIntersect', 'waveHeight', 'lightningFilament', 'finishColor']) {
    assert.ok(GLSL_PRELUDE.includes(fn + '('), fn + ' absent');
  }
});

test('Galaxy uses five spiral arms and actual volumetric sampling', () => {
  assert.match(WORLD_SHADERS.galaxy, /spiralArm/);
  assert.match(WORLD_SHADERS.galaxy, /nebulaDensity/);
  assert.match(WORLD_SHADERS.galaxy, /galaxyDust/);
  assert.match(WORLD_SHADERS.galaxy, /for\s*\(int i=0;i<5;i\+\+\)/);
});

test('Black hole contains both event horizon and photon ring', () => {
  assert.match(WORLD_SHADERS.blackhole, /blackDiskMask/);
  assert.match(WORLD_SHADERS.blackhole, /photonRing/);
  assert.match(WORLD_SHADERS.blackhole, /diskEmission/);
  assert.match(WORLD_SHADERS.blackhole, /lensDistortion/);
});

test('Ocean uses Gerstner-displaced normals and Fresnel reflection', () => {
  assert.match(WORLD_SHADERS.ocean, /waveNormal/);
  assert.match(WORLD_SHADERS.ocean, /reflect\(rd,n\)/);
  assert.match(WORLD_SHADERS.ocean, /fresnel/);
});

test('Clouds have bounded raymarch loops with shadows', () => {
  assert.match(WORLD_SHADERS.clouds, /for\s*\(int i=0;i<54;i\+\+\)/);
  assert.match(WORLD_SHADERS.clouds, /cloudShadow/);
  assert.match(WORLD_SHADERS.clouds, /transmission/);
});

test('Storm contains a temporal flash and rainfall layers', () => {
  assert.match(WORLD_SHADERS.storm, /rainStreak/);
  assert.match(WORLD_SHADERS.storm, /lightningPulse/);
  assert.match(WORLD_SHADERS.storm, /stormCloud/);
});

test('Solar RTS uses seven orbit tracks', () => {
  assert.match(WORLD_SHADERS.solar, /for\s*\(int i=0;i<7;i\+\+\)/);
  assert.match(WORLD_SHADERS.solar, /orbitalTrack/);
  assert.match(WORLD_SHADERS.solar, /solarHud/);
});
