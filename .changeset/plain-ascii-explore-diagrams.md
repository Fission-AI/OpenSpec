---
'@fission-ai/openspec': patch
---

Draw explore-mode diagrams with plain ASCII. The worked examples in the explore skill and `/opsx:explore` command used Unicode box-drawing, arrow, and marker glyphs, which many terminals render two columns wide — agents copied the style and their padded boxes and aligned tables came out with the right border detached.
