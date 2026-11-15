# BELENTANI / JUDAS COSMOS — OMEGA

Eight immersive worlds, one shared shader renderer, five identity signatures, ten stations, and **fifty existing galaxy stories**. This site is an extension of `belentani7/belentani_Omega`, not a new repository.

## Entry

The standalone experience starts at `/galaxias/omega/index.html` and is intended to be linked from the existing `/galaxias/index.html` matrix. Existing `/galaxias/galaxia-01.html` through `galaxia-50.html` remain untouched. The earlier `/galaxias/inmersivo.html` is preserved for historical comparison.

## Design

The design references the original BELENTANI Judas Cosmos document: black `#020103`, neon red `#ff003c`, gold `#ffd45c`, cyan `#65f7ff`, and root frequency 432 Hz. The eight worlds are *procedural artistic visualizations*, not NASA-accurate scientific simulations. The audio button synthesizes an unobtrusive chord; it does not pretend to play an unreleased or copyrighted track.

## Worlds

1. Galaxy — five-armed procedural nebula and dust emission.
2. Planets — five orbiting bodies with procedural color, atmospheres, rings, and rotating cloud structures.
3. Black Hole — photon ring, accretion disk and approximate lensing.
4. Ocean — analytic Gerstner waves, surface Fresnel and specular moonlight.
5. Aurora — multiple animated vertical curtains and sky scattering.
6. Clouds — stratified volumetric density, extinction, illumination and shadow sampling.
7. Storm — procedural rain layers, deterministic lightning, and turbulent clouds.
8. Solar — schematic solar-navigation display, orbital tracks and moving satellites.

## Technical architecture

`index.html` is intentionally small. `css/omega.css` is the visual system. `js/app.js` manages the lifecycle, event listeners and render loop; `js/renderer.js` provides WebGL1 and Canvas2D fallback. `js/glsl.js` owns the shared physically inspired fragment utilities. Individual world shaders live in `js/worlds/*.js`. `js/data.js` is the **single source of truth** for the existing fifty routes and their five-by-ten identity matrix. `js/i18n.js` contains the four supported languages. `js/quality.js` throttles rendering and adjusts DPR. `js/camera.js` handles gestures and keyboard flight. `js/audio.js` contains opt-in procedural WebAudio. `js/overlay.js` creates noninteractive cinematic markers. `js/state.js` stores only benign local presentation settings and visited world IDs.

No runtime dependency, no build step, no account, no analytics SDK, no API key, and no constructor platform are required. The page works on the static site under the existing artist-controlled domain.

## Interaction

- Pointer drag: orbit.
- Wheel: zoom.
- WASD: free flight; E/Q: up/down; R/F: camera rotation; Shift: faster movement.
- Left/Right: previous/next world.
- Escape: close galaxy drawer or recenter.
- Buttons: enter next world, switch to free flight, toggle 432 Hz audio, pause, fullscreen, open the old matrix.
- The **50 galaxy links** open each preserved original chapter using relative URLs and the current language parameter.

## Accessibility and resilience

Semantically labeled controls, native links for chapters, a skip link, keyboard navigation, localized text, `prefers-reduced-motion`, focus outlines, and native Canvas2D fallback are included. Audio requires a click. Local state is tolerant of blocked storage. The renderer does not depend on remotely hosted shaders, fonts, images, or music. Production hardware performance is not asserted without real-device testing.

## Test

From the `galaxias/omega` folder run `npm test` or `node --test tests/*.test.mjs`. The test suite validates routes, translations, state sanitization, vector math, shader contracts, and model integrity using Node's built-in test runner.

To render locally, serve the repository root with `python3 -m http.server 8765` and open `http://localhost:8765/galaxias/omega/`. For an isolated GPU smoke test, open `/galaxias/omega/tests/browser-smoke.html` with the same server and a WebGL-enabled browser.

## Release safety

Never overwrite the original fifty `galaxia-XX.html` chapters. Review the native project deployment mapping before publishing any domain change. Never report an unverified deployment as live. Existing files and routes are the canon; this immersive interface is a new **entry point**, not a replacement of their content.
