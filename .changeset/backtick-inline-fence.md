---
'@fission-ai/openspec': patch
---

Stop treating a line that starts with triple-backtick inline code (```` ```npm test``` ````) as a code fence opener, which hid every requirement after it.
