# OMEGA — punto de entrada histórico

Esta carpeta conserva la URL `/galaxias/omega/` que enlazan los cincuenta capítulos
clásicos (`omega/index.html?lang=…`). El contenido ya no se duplica aquí:

- `index.html` redirige a la raíz del sitio (`../../index.html`) conservando `lang`,
  `world`, `quality` y el ancla. Incluye `<link rel="canonical">` y una alternativa
  navegable sin JavaScript.
- El runtime vive en `js/` (raíz), el sistema visual en `css/omega.css` y las pruebas
  en `tests/`. Existe una sola copia de cada fichero; `tests/gi-host.test.mjs` lo
  verifica.

## Por qué se eliminó la copia

Hasta la restauración, `galaxias/omega/{js,css,tests}` era una réplica byte a byte de
la raíz. Dos copias idénticas implican doble mantenimiento y pruebas que solo pasaban
en una de las dos ubicaciones. Hoy la raíz es la única fuente de verdad y esta carpeta
es solo el puente de compatibilidad.

## Pruebas

Desde la raíz del repositorio:

```bash
npm test          # suite completa (incluye el host y el runtime clásico)
npm run verify    # check + lint + tests + build
```
