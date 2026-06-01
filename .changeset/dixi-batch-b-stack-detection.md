---
"pscode": minor
---

Adiciona fundação do profile dixi com detecção automática de stack

Introduz `src/core/presets/dixi.ts` com os tipos `DixiStack`/`DixiStackFamily` e as funções `detectDixiStack`, `getDixiStackFamily`, `getDixiStackLabel` e `installDixiExtras`. Quando `pscode init --profile dixi` é executado, a stack do projeto é detectada automaticamente (Java/Maven, Java/Gradle, Next.js, React, Node.js, Python) e o arquivo `.pscode-dixi.yaml` é gravado na raiz do projeto com os campos `stack`, `family` e `detectedAt`. A função `installDixiExtras` é um placeholder extensível pelos batches C–J.
