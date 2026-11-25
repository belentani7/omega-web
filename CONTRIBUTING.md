# Contribución — omega-web

Gracias por tu interés en contribuir a omega-web.

## Cómo contribuir

1. Lee `BIBLIA.md` antes de escribir cualquier código.
2. Crea una rama desde `main`: `git checkout -b feat/tu-cambio`
3. Haz un cambio a la vez, reversible.
4. Ejecuta `npm run build` para verificar que no rompes nada.
5. Ejecuta `gitleaks protect` antes de commitear.
6. Commitea con convencionales: `type(scope): resumen`
7. Abre un pull request hacia `main`.

## Reglas

- No commitear secretos.
- Cada cambio es reversible, uno a uno.
- RESPETA el protocolo spec-first: PRD → SRS → Design Doc → ADR → Plan → Tests GWT.
