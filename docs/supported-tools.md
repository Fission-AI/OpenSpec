# Підтримувані інструменти

OpenSpec працює з багатьма помічниками кодування ШІ. Коли ви запускаєте `openspec init`, OpenSpec налаштовує вибрані інструменти, використовуючи ваш активний профіль/робочий процес вибору та режим доставки.

## Як це працює

Для кожного вибраного інструменту OpenSpec може встановити:

1. **Навички** (якщо доставка включає в себе навички): `.../skills/openspec-*/SKILL.md`
2. **Команди** (якщо поставка включає команди): файли команд `opsx-*` для окремих інструментів

За замовчуванням OpenSpec використовує профіль `core`, який включає:
- `пропонувати`
- `дослідити`
- `застосувати`
- `архів`

Ви можете ввімкнути розширені робочі цикли (`new`, `continue`, `ff`, `verify`, `sync`, `bulk-archive`, `onboard`) через `openspec config profile`, а потім запустити `openspec update`.

## Довідник каталогу інструментів

| Інструмент (ID) | Схема шляху навичок | Шаблон шляху до команди |
|-----------|--------------------|--------------------|
| Amazon Q Developer (`amazon-q`) | `.amazonq/skills/openspec-*/SKILL.md` | `.amazonq/prompts/opsx-<id>.md` |
| Антигравітація (`antgravity`) | `.agent/skills/openspec-*/SKILL.md` | `.agent/workflows/opsx-<id>.md` |
| Оггі (`auggie`) | `.augment/skills/openspec-*/SKILL.md` | `.augment/commands/opsx-<id>.md` |
| Код Клода (`claude`) | `.claude/skills/openspec-*/SKILL.md` | `.claude/commands/opsx/<id>.md` |
| Клайн (`cline`) | `.cline/skills/openspec-*/SKILL.md` | `.clinerules/workflows/opsx-<id>.md` |
| CodeBuddy (`codebuddy`) | `.codebuddy/skills/openspec-*/SKILL.md` | `.codebuddy/commands/opsx/<id>.md` |
| Кодекс (`codex`) | `.codex/skills/openspec-*/SKILL.md` | `$CODEX_HOME/prompts/opsx-<id>.md`\* |
| Продовжити (`продовжити`) | `.continue/skills/openspec-*/SKILL.md` | `.continue/prompts/opsx-<id>.prompt` |
| CoStrict (`costrict`) | `.cospec/skills/openspec-*/SKILL.md` | `.cospec/openspec/commands/opsx-<id>.md` |
| Розчавити (`розчавити`) | `.crush/skills/openspec-*/SKILL.md` | `.crush/commands/opsx/<id>.md` |
| Курсор (`курсор`) | `.cursor/skills/openspec-*/SKILL.md` | `.cursor/commands/opsx-<id>.md` |
| Фабричний дроїд (`factory`) | `.factory/skills/openspec-*/SKILL.md` | `.factory/commands/opsx-<id>.md` |
| Gemini CLI (`gemini`) | `.gemini/skills/openspec-*/SKILL.md` | `.gemini/commands/opsx/<id>.toml` |
| GitHub Copilot (`github-copilot`) | `.github/skills/openspec-*/SKILL.md` | `.github/prompts/opsx-<id>.prompt.md`\*\* |
| iFlow (`iflow`) | `.iflow/skills/openspec-*/SKILL.md` | `.iflow/commands/opsx-<id>.md` |
| Кілокод (`kilocode`) | `.kilocode/skills/openspec-*/SKILL.md` | `.kilocode/workflows/opsx-<id>.md` |
| Кіро (`kiro`) | `.kiro/skills/openspec-*/SKILL.md` | `.kiro/prompts/opsx-<id>.prompt.md` |
| Mistral Vibe (`mistral-vibe`) | `.vibe/skills/openspec-*/SKILL.md` | Не створено (немає адаптера команд; використовуйте інструмент Skill або `/opsx:*`, якщо агент підтримує виклики навичок) |
| OpenCode (`відкритий код`) | `.opencode/skills/openspec-*/SKILL.md` | `.opencode/commands/opsx-<id>.md` |
| Пі (`пі`) | `.pi/skills/openspec-*/SKILL.md` | `.pi/prompts/opsx-<id>.md` |
| Кодер (`qoder`) | `.qoder/skills/openspec-*/SKILL.md` | `.qoder/commands/opsx/<id>.md` |
| Код Qwen (`qwen`) | `.qwen/skills/openspec-*/SKILL.md` | `.qwen/commands/opsx-<id>.toml` |
| RooCode (`roocode`) | `.roo/skills/openspec-*/SKILL.md` | `.roo/commands/opsx-<id>.md` |
| Трае (`trae`) | `.trae/skills/openspec-*/SKILL.md` | Не створено (немає адаптера команд; використовуйте виклики `/openspec-*` на основі навичок) |
| Віндсерфінг (`windsurf`) | `.windsurf/skills/openspec-*/SKILL.md` | `.windsurf/workflows/opsx-<id>.md` |

\* Команди Codex встановлюються в глобальну домашню сторінку Codex (`$CODEX_HOME/prompts/`, якщо встановлено, інакше `~/.codex/prompts/`), а не в каталозі вашого проекту.

\*\* Файли підказок GitHub Copilot розпізнаються як спеціальні команди з скісною рискою в розширеннях IDE (VS Code, JetBrains, Visual Studio). Copilot CLI наразі не використовує безпосередньо `.github/prompts/*.prompt.md`.

## Неінтерактивне налаштування

Для CI/CD або налаштування за сценарієм використовуйте `--tools` (та додатково `--profile`):

```bash
# Configure specific tools
openspec init --tools claude,cursor

# Configure all supported tools
openspec init --tools all

# Skip tool configuration
openspec init --tools none

# Override profile for this init run
openspec init --profile core
```

**Доступні ідентифікатори інструментів (`--tools`):** `amazon-q`, `antigravity`, `auggie`, `claude`, `cline`, `codex`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `iflow`, `kilocode`, `kiro`, `mistral-vibe`, `opencode`, `pi`, `qoder`, `qwen`, `roocode`, `trae`, `windsurf`

## Встановлення, що залежить від робочого процесу

OpenSpec встановлює артефакти робочого процесу на основі вибраних робочих процесів:

- **Основний профіль (за замовчуванням):** `propose`, `explore`, `apply`, `archive`
- **Користувацький вибір:** будь-яка підмножина всіх ідентифікаторів робочого процесу:
`propose`, `explore`, `new`, `continue`, `apply`, `ff`, `sync`, `archive`, `bulk-archive`, `verify`, `onboard`

Іншими словами, кількість навичок/команд залежить від профілю та доставки, а не фіксована.

## Згенеровані назви навичок

Якщо вибрати конфігурацію профілю/робочого процесу, OpenSpec генерує такі навички:

- `openspec-propose`
- `openspec-explore`
- `openspec-new-change`
- `openspec-continue-change`
- `openspec-apply-change`
- `openspec-ff-change`
- `openspec-sync-specs`
- `openspec-archive-change`
- `openspec-bulk-archive-change`
- `openspec-verify-change`
- `openspec-onboard`

Перегляньте [Команди](commands.md) для інформації про поведінку команди та [CLI](cli.md) для параметрів `init`/`update`.

## Пов'язані

- [Довідник CLI](cli.md) — команди терміналу
- [Команди](commands.md) — команди та навички з косою рискою
- [Початок роботи](getting-started.md) — перше налаштування
