---
"pscode": minor
---

Adiciona integração JIRA completa ao profile dixi (Batch K):

- Novos slash commands `/pstld:jira-draft` e `/pstld:jira-setup` instalados pelo `installDixiExtras` (total: 7 comandos pstld)
- Campo opcional `jiraIssueKey` no `.pscode.yaml` para vincular uma change a uma issue JIRA
- `pscode archive` detecta `jiraIssueKey` e `transitions.done` de `pastelsdd/jira.yaml`, informando a transição pendente (non-fatal)
- Template `pastelsdd/jira.yaml` gerado pelo `pscode init --profile dixi` inclui campo `transitions.done`
