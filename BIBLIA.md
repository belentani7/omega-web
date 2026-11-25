# BIBLIA.md — omega-web

> Documento de doctrina del producto. Visión, misión, reglas, arquitectura, stack y decisiones de diseño.

## 1. Visión

omega-web es un universo WebGL interactivo con 92 modelos 3D, renderizado con Three.js, GSAP, Cannon.js y Howler.js. Forma parte del ecosistema integrado de proyectos bajo la organización GitHub belentani7.

## 2. Misión

Proveer una experiencia inmersiva 3D en el navegador, con galaxias, constelaciones y mundos navegables, construida con código mantenible y experiencia de usuario excepcional.

## 3. Stack Tecnológico

- **Node.js**: Runtime principal
- **Vite**: Build tool y dev server
- **Three.js R0.164.1**: Motor 3D WebGL
- **GSAP**: Animaciones
- **Cannon.js**: Física
- **Howler.js**: Audio
- **vite-plugin-glsl**: Shaders GLSL
- **vite-plugin-restart**: Recarga en cambios de archivos estáticos

## 4. Reglas de Desarrollo

- Protocolo spec-first: PRD → SRS → Design Doc → ADR → Plan → Tests GWT
- No commitear secretos, API keys, tokens ni credenciales
- Ejecutar gitleaks antes de cada push
- CODEOWNERS: @belentani7 revisión requerida
- Conventional commits: type(scope): summary
- Cada cambio es reversible, uno a uno

## 5. Tokens de Diseño (CANON)

- Negro vacío: #050505 (body bg)
- Violeta: #7A2BFF → #9B5CFF (gradiente)
- Rojo neón: #FF073A (acento primario)
- Oro: #D4AF37 (acento secundario)
- Cyan señal: #4de8e0 (acento terciario)

## 6. Impeccable (Diseño Frontend)

- Body text contrast >= 4.5:1
- No gradient text, no side-stripe borders, no eyebrow on every section
- No identical card grids, no nested cards
- Hero heading <= 6rem (96px)
- Touch targets >= 44px, focus indicators visible
- Estados vacío, error y carga diseñados
- Animaciones con prefers-reduced-motion

## 7. Seguridad

- .gitleaks.toml configurado con reglas del ecosistema Belentani
- CODEOWNERS @belentani7
- SECURITY.md con política de reporte

## 8. Decisiones de Arquitectura

- Repositorio independiente (monorepo no aplica)
- Despliegue por copia de archivos (cero build)
- Working trees respetados: no se sobrescriben cambios sin restaurar desde HEAD

## Convenciones de commit

`type(scope): resumen` — feat, fix, docs, chore, refactor, test, perf, style.
