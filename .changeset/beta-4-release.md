---
"@thiagodiogo/pastelsdd": minor
---

### Release 1.0.0-beta.4

- Kimi CLI support — initialize Kimi as a skills-only tool via `.kimi/skills/`
- Sync workflow included in default core profile (new installs get `/pstl:sync` by default)
- Testing validation phase in apply workflow — after tasks complete, prompts for validation before moving card to "Ready to Deploy"
- Fix: preserve workspace planning detection when Windows short paths or symlink aliases resolve to a canonical root
