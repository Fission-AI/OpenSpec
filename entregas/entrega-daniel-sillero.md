# Práctica 1

## openspec --version

```text
1.4.1
```

## ls (contenido del directorio OpenSpecTest)

```text
Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----        16/06/2026     15:18                .changeset
d-----        16/06/2026     15:18                .devcontainer
d-----        16/06/2026     15:18                .github
d-----        16/06/2026     15:18                assets
d-----        16/06/2026     15:18                bin
d-----        16/06/2026     15:18                docs
d-----        16/06/2026     15:18                openspec
d-----        16/06/2026     15:18                schemas
d-----        16/06/2026     15:18                scripts
d-----        16/06/2026     15:18                src
d-----        16/06/2026     15:18                test
-a----        16/06/2026     15:18             49 .actrc
-a----        16/06/2026     15:18            291 .coderabbit.yaml
-a----        16/06/2026     15:18           2465 .gitignore
-a----        16/06/2026     15:18              0 AGENTS.md
-a----        16/06/2026     15:18            867 build.js
-a----        16/06/2026     15:18          30237 CHANGELOG.md
-a----        16/06/2026     15:18           1381 eslint.config.js
-a----        16/06/2026     15:18            594 flake.lock
-a----        16/06/2026     15:18           3068 flake.nix
-a----        16/06/2026     15:18           1101 LICENSE
-a----        16/06/2026     15:18            462 MAINTAINERS.md
-a----        16/06/2026     15:18           8547 openspec-parallel-merge-plan.md
-a----        16/06/2026     15:18         176699 package-lock.json
-a----        16/06/2026     15:18           2180 package.json
-a----        16/06/2026     15:18         105167 pnpm-lock.yaml
-a----        16/06/2026     15:18           8144 README.md
-a----        16/06/2026     15:18          20347 README_OLD.md
-a----        16/06/2026     15:18            550 tsconfig.json
-a----        16/06/2026     15:18           1404 vitest.config.ts
-a----        16/06/2026     15:18            495 vitest.setup.ts
```


*Micro-tarea:* [descripción en una línea]
*Pilar 1 — Herramienta:* ¿Cuál eliges?
Claude Code porque es la IA para desarrollo que utilizo
*Pilar 2 — Contexto:* ¿Qué información estás aportando? (lenguaje, framework, restricciones, ejemplos…)
 Html + javascript

 Requerimiento — Email Validator
Objetivo

Crear una pequeña herramienta web que permita comprobar si un email introducido por el usuario tiene un formato válido.

La herramienta debe estar construida con HTML, CSS básico y JavaScript puro, sin frameworks ni librerías externas.

Alcance

La aplicación será una página sencilla de una sola pantalla donde el usuario podrá:

Escribir un email en un campo de texto.
Pulsar un botón para validar el email.
Ver un mensaje indicando si el email es válido o no.
Requisitos funcionales
RF-01 — Campo de entrada

La página debe mostrar un campo de texto donde el usuario pueda introducir un email.

El campo debe tener un placeholder claro, por ejemplo:

Introduce tu email
RF-02 — Botón de validación

La página debe incluir un botón con el texto:

Validar email

Al pulsar el botón, se ejecutará la validación del email introducido.

RF-03 — Validación de email

La aplicación debe comprobar que el email tiene un formato razonablemente válido.

La validación debe aceptar emails como:

usuario@email.com
nombre.apellido@empresa.es
test123@dominio.org

Y debe rechazar emails como:

usuarioemail.com
usuario@
@dominio.com
usuario dominio.com
usuario@dominio

No es necesario implementar una validación completa según el estándar RFC de emails. El objetivo es una validación práctica y sencilla para un ejercicio frontend.

RF-04 — Mensaje de resultado

Después de validar, la página debe mostrar un mensaje visible para el usuario.

Si el email es válido, debe mostrar:

El email es válido.

Si el email no es válido, debe mostrar:

El email no tiene un formato válido.
RF-05 — Limpieza del valor introducido

Antes de validar, el sistema debe eliminar espacios al inicio y al final del texto introducido.

Por ejemplo:

  usuario@email.com  

Debe tratarse como:

usuario@email.com
Requisitos técnicos
La solución debe estar en un único archivo HTML.
Debe usar HTML para la estructura.
Debe usar CSS básico para mejorar mínimamente la presentación.
Debe usar JavaScript puro para la lógica de validación.
No debe usar frameworks como React, Vue, Angular o similares.
No debe usar librerías externas.
El código debe ser simple, legible y fácil de entender.
El JavaScript puede estar incluido dentro del propio HTML mediante una etiqueta <script>.
Criterios de aceptación

La tarea se considerará completada cuando:

La página se pueda abrir directamente en un navegador.
El usuario pueda introducir un email.
El usuario pueda pulsar un botón para validar.
La aplicación muestre un mensaje de éxito si el email es válido.
La aplicación muestre un mensaje de error si el email no es válido.
La validación funcione correctamente con los ejemplos indicados.
Todo el código esté en un único archivo HTML.

*Pilar 3 — Prompt:* ¿Cómo lo estructuras? (estilo, formato de salida, ejemplos…)
 Quiero crear una micro-tarea llamada Mail Validator.

Objetivo:
Crear una herramienta web sencilla que permita comprobar si un email introducido por el usuario tiene un formato válido.

Tecnologías:
- HTML
- CSS básico
- JavaScript puro

Restricciones:
- Todo debe estar en un único archivo HTML.
- No usar frameworks.
- No usar librerías externas.
- No hace falta validación completa RFC.
- La validación debe ser práctica y sencilla.

Funcionalidad:
- Mostrar un título.
- Mostrar un input para introducir el email.
- Mostrar un botón para validar.
- Al pulsar el botón, validar el email.
- Mostrar un mensaje si el email es válido.
- Mostrar un mensaje si el email no es válido.
- Limpiar espacios al inicio y final antes de validar.

Casos válidos:
- usuario@email.com
- nombre.apellido@empresa.es
- test123@dominio.org

Casos inválidos:
- usuarioemail.com
- usuario@
- @dominio.com
- usuario dominio.com
- usuario@dominio

Criterios de aceptación:
- La página se puede abrir directamente en navegador.
- El usuario puede introducir un email.
- El usuario puede validar pulsando un botón.
- Se muestra un mensaje positivo si es válido.
- Se muestra un mensaje de error si es inválido.
- Todo está en un único archivo HTML.

Genera la propuesta OpenSpec, las tareas y la spec necesarias para este cambio.
*Resultado:* ¿Funcionó a la primera o tuviste que iterar?
 Funciono a la primera

He usado OpenSpec 1.4.1 con el perfil core.

Comandos usados en Claude Code:

```text
/opsx:propose
/opsx:apply



