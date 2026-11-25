# omega-web — universo BELENTANI

Sitio oficial de **Pedro Belentani**: ocho mundos procedurales, cincuenta capítulos
narrativos y una escena cinematográfica WebGL. Todo sin dependencias de runtime en la
experiencia principal.

**En línea:** <https://www.belentani.es/omega-web/>

## Qué contiene

| Ruta | Qué es | Tecnología |
|---|---|---|
| `index.html` | Experiencia **OMEGA**: ocho mundos, cinco firmas, cincuenta portales | ES Modules nativos, WebGL 1 con caída a Canvas 2D |
| `galaxias/` | Catálogo y los cincuenta capítulos originales (`galaxia-01` … `galaxia-50`) | HTML estático + `galaxias/core/galaxia.js` |
| `galaxias/omega/index.html` | Punto de entrada histórico, redirige a la raíz conservando `?lang` y `?world` | Redirección + alternativa `noscript` |
| `src/` | Escena cinematográfica sobre Three.js con modelos glTF y post-proceso | Vite + Three.js |
| `tools/` | Herramientas internas de verificación | Node.js ≥ 20 |
| `tests/` | Suite de pruebas con el runner nativo de Node | `node --test` |
| `docs.html` · `accesibilidad.html` · `privacidad.html` · `404.html` | Páginas de servicio reales (sin placeholders) | HTML + `css/site.css` |

## Inicio rápido

```bash
# Experiencia OMEGA (sin instalar nada: es estático)
node serve-dist.mjs . 8200        # http://localhost:8200/index.html

# Escena cinematográfica (Vite + Three.js)
npm install
npm run dev                       # servidor de desarrollo
npm run build                     # genera dist/
npm run verify                    # check + lint + tests + build
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm test` | Ejecuta la suite completa (`node --test tests/*.test.mjs`). |
| `npm run test:watch` | Suite en modo vigilancia. |
| `npm run lint` | ESLint 10 sobre `js/`, `tools/`, `tests/` y el runtime clásico. |
| `npm run check` | Encoding + HTML + enlaces + auditoría CSS. |
| `npm run verify` | Todo lo anterior + tests + build. Es el comando de entrega. |
| `npm run dev` / `npm run build` / `npm run preview` | Ciclo de Vite para `src/`. |
| `npm run serve` | Sirve `dist/` en el puerto 8200. |

## Herramientas internas

Cada herramienta documenta su uso con `--help` y acepta `--check` para integrarse en CI
(código de salida distinto de cero cuando hay trabajo pendiente).

| Herramienta | Qué garantiza |
|---|---|
| `node tools/fix-encoding.mjs` | Repara mojibake UTF-8/Windows-1252 y elimina BOM. Distingue texto portugués correcto. |
| `node tools/normalize-html.mjs` | Elimina andamiaje heredado y repunta enlaces locales a su ruta real. |
| `node tools/check-links.mjs` | Verifica los 68 documentos: ningún `href`/`src` interno roto. |
| `node tools/check-html.mjs` | Estructura del documento, ids únicos, un solo `<h1>` y el contrato de ids del host. |
| `node tools/audit-css.mjs` | Peso crudo/gzip, tokens CSS sin uso y selectores duplicados por ámbito. |

## Arquitectura de la experiencia OMEGA

Sin framework, sin build, sin red en tiempo de ejecución.

- `js/app.js` — ciclo de vida, bucle de render, pausa por pestaña oculta, diagnóstico `window.BELENTANI_COSMOS`.
- `js/renderer.js` — ocho programas GLSL propios sobre un preludio compartido; si WebGL falta o se pierde, dibuja en un canvas 2D determinista.
- `js/camera.js` — deriva cinematográfica, órbita y vuelo libre con límites de zoom compartidos por rueda, pellizco y teclado.
- `js/quality.js` — perfiles `eco`/`high`/`ultra`, FPS objetivo y degradación por batería, `saveData` o ventanas lentas.
- `js/state.js` — estado de presentación saneado y direccionable por URL.
- `js/ui.js` — interfaz semántica: todo control visible ejecuta una acción real.
- `js/i18n.js` — portugués, español, inglés y catalán con validación de claves al arrancar.
- `js/audio.js` — acorde procedural a 432 Hz con osciladores; nunca suena sin gesto.
- `js/accessibility.js` — anuncios `aria-live`, trampa de foco y preferencias de movimiento/contraste.
- `css/omega.css` — sistema visual completo (topbar, navegación de mundos, HUD, telemetría, panel de galaxias, estados de carga y error).

## Identidad visual

Hay dos paletas con propósito distinto, y las dos están cubiertas por pruebas:

| Uso | Tokens | Fuente |
|---|---|---|
| Marca del artista (**CANON**) | negro `#050505`, violeta `#7A2BFF`→`#9B5CFF`, rojo `#FF073A`, oro `#D4AF37`, cyan `#4de8e0` | `js/canon-tokens.mjs` |
| Universo Judas Cosmos (**OMEGA**) | vacío `#020103`, rojo `#ff003c`, oro `#ffd45c`, cyan `#65f7ff` | `css/omega.css` |

Tipografías: pila del sistema y monoespaciada del sistema, sin fuentes remotas.

## Accesibilidad

Objetivo WCAG 2.2 AA: enlace de salto, navegación completa por teclado, foco visible,
`prefers-reduced-motion`, `forced-colors`, audio opcional, región `aria-live`, alternativa
Canvas 2D sin WebGL y catálogo funcional sin JavaScript. Detalle en `accesibilidad.html`.

## Verificación

`npm run verify` es la puerta de entrega y no requiere navegador: encoding, enlaces,
estructura HTML, tokens CSS, ESLint, 108 pruebas y build de producción con chunks
separados por familia de dependencia.

La auditoría Lighthouse no se puede ejecutar en este entorno (no hay Chromium ni
dependencias gráficas instalables). Las comprobaciones de rendimiento son por tanto
estáticas y reproducibles: peso de cada artefacto, gzip y número de peticiones iniciales.

## Publicación

GitHub Pages con dominio propio vía `CNAME`; el sitio vive en la raíz del repositorio.
`dist/` es un artefacto de build y no se versiona.

## Universo

| Nodo | Papel | Enlace |
|---|---|---|
| **Belentani Omega** | Sitio oficial (este) | <https://belentani.es> |
| The Judas Experience | La obra central, interactiva | [judas-experience](https://github.com/belentani7/belentani-judas-experience) |
| Judas Era — Omega Core | Versión Judas Era del organismo | [judas-era-omega](https://github.com/belentani7/belentani-judas-era-omega) |
| BELENTANI_OS // JUDAS-CORE | Creative OS web, el sistema | [judas-web](https://github.com/belentani7/belentani-judas-web) |
| Omega Immersive Portal | Portal inmersivo 3D | [immersive-portal](https://belentani-omega-immersive-portal.vercel.app) |
| Galería de Versiones | Todas las versiones, navegables | [omega-showcase](https://github.com/belentani7/belentani-omega-showcase) |
| BELENTANI / ARCHIVO VIVO | Archivo de la obra y el proceso | [artista-unified](https://github.com/belentani7/belentani-artista-unified) |
| Belentani — Judas Era | Portfolio visual estático | [es-neon](https://github.com/belentani7/belentani-es-neon) |
| NOIACORE LAB | Laboratorio: catálogo, agente, automatización | [belentani.vercel.app](https://belentani.vercel.app) |
| Belentani + NOIACORE | Perfil público y puerta al código | [belentani7](https://github.com/belentani7/belentani7) |

> Una obra, muchas puertas. Toda web nueva del universo enlaza este mapa;
> ninguna queda aislada.

## Licencia

MIT — ver `LICENSE`. © Belentani (obra y contenido).
