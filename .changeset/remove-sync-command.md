---
"pscode": minor
---

**BREAKING**: Remove o comando `pscode sync` e o workflow `/ps:sync`.

O comando `pscode sync` era um passo intermediário que propagava delta specs para as specs principais. Ele foi removido porque o `pscode complete` já executa esse sync automaticamente ao final, sem prompts ou flags opcionais — eliminando a ambiguidade de quando rodar o sync.

**Mudanças:**
- `pscode sync` não existe mais; scripts que chamam esse comando vão quebrar
- `pscode complete` agora sincroniza specs automaticamente sempre ao final (log "Sincronizando specs...")
- A opção `--skip-specs` foi removida do `pscode complete`
- O workflow `sync` foi removido de `ALL_WORKFLOWS` e de todos os profiles
- Os arquivos de skill `sync.md` nos adapters (claude, cursor, codex, gemini, github-copilot) não são mais gerados pelo `pscode update`

**Migração:** Use `pscode complete` — o sync de specs agora ocorre automaticamente, sem nenhum passo adicional.
