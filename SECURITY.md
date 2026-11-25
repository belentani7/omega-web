# Política de Seguridad — omega-web

## Reportar vulnerabilidades

Contacta a @belentani7 antes de divulgar públicamente cualquier problema de seguridad en este repositorio.

## Escaneo de secretos

Este repositorio utiliza gitleaks para detectar credenciales expuestas. Ejecuta `gitleaks protect` antes de cada push.

## Reglas

- No commitear secretos, API keys, tokens ni credenciales
- .env nunca se commitea
- Ejecutar gitleaks antes de cada push
