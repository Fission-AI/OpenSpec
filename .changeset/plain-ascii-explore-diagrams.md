---
'@fission-ai/openspec': patch
---

Draw explore-mode diagrams with plain ASCII. The worked examples in the explore skill and `/opsx:explore` command used Unicode box-drawing, arrow, and marker glyphs, whose display width varies across terminals, fonts, and locales. Agents copied the style, causing padded boxes and aligned tables to drift.
