# Довідник CLI

OpenSpec CLI (`openspec`) надає команди терміналу для налаштування проекту, перевірки, перевірки стану та керування. Ці команди доповнюють команди штучного інтелекту (наприклад, `/opsx:propose`), задокументовані в [Команди](commands.md).

## Резюме

| Категорія | Команди | Призначення |
|----------|----------|---------|
| **Налаштування** | `init`, `update` | Ініціалізація та оновлення OpenSpec у вашому проекті |
| **Перегляд** | `список`, `перегляд`, `показати` | Ознайомтеся зі змінами та характеристиками |
| **Перевірка** | `перевірити` | Перевірте зміни та специфікації на наявність проблем |
| **Життєвий цикл** | `архів` | Завершити завершені зміни |
| **Робочий процес** | `статус`, `інструкції`, `шаблони`, `схеми` | Підтримка робочого процесу, керованого артефактами |
| **Схеми** | `schema init`, `schema fork`, `schema validate`, `schema which` | Створення власних робочих процесів і керування ними |
| **Конфігурація** | `конфігурація` | Перегляд і зміна налаштувань |
| **Корисність** | `feedback`, `complement` | Зворотній зв'язок та інтеграція оболонки |

---

## Команди людини проти агента

Більшість команд CLI розроблено для **людини** в терміналі. Деякі команди також підтримують **використання агента/сценарію** через вивід JSON.

### Команди лише для людини

Ці команди є інтерактивними та призначені для використання в терміналі:

| Команда | Призначення |
|---------|---------|
| `ініціалізація openspec` | Ініціалізація проекту (інтерактивні підказки) |
| `перегляд openspec` | Інтерактивна панель |
| `редагування конфігурації openspec` | Відкрийте конфігурацію в редакторі |
| `відгуки openspec` | Надішліть відгук через GitHub |
| `завершення встановлення openspec` | Встановити оболонкові доробки |

### Команди, сумісні з агентом

Ці команди підтримують висновок `--json` для програмного використання агентами ШІ та сценаріями:

| Команда | Використання людиною | Використання агента |
|---------|-----------|-----------|
| `список відкритих специфікацій` | Перегляньте зміни/технічні характеристики | `--json` для структурованих даних |
| `openspec show <item>` | Читати вміст | `--json` для аналізу |
| `перевірка openspec` | Перевірте наявність проблем | `--all --json` для масової перевірки |
| `статус openspec` | Перегляньте прогрес артефакту | `--json` для структурованого статусу |
| `інструкції openspec` | Отримати наступні кроки | `--json` для інструкцій агента |
| `шаблони openspec` | Знайти шаблонні шляхи | `--json` для визначення шляху |
| `схеми openspec` | Список доступних схем | `--json` для виявлення схеми |

---

## Глобальні параметри

Ці параметри працюють з усіма командами:

| Варіант | Опис |
|--------|-------------|
| `--версія`, `-V` | Показати номер версії |
| `--no-color` | Вимкнути кольоровий вихід |
| `--help`, `-h` | Відобразити довідку для команди |

---

## Команди налаштування

### `ініціалізація openspec`

Ініціалізуйте OpenSpec у своєму проекті. Створює структуру папок і налаштовує інтеграцію інструментів AI.

Поведінка за замовчуванням використовує глобальні параметри конфігурації за замовчуванням: профіль `core`, доставка `both`, робочі процеси `propose, explore, apply, archive`.

```
openspec init [path] [options]
```

**Аргументи:**

| Аргумент | Необхідно | Опис |
|----------|----------|-------------|
| `шлях` | Ні | Цільовий каталог (за замовчуванням: поточний каталог) |

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--інструменти <список>` | Налаштуйте інструменти AI неінтерактивно. Використовуйте `all`, `none` або список, розділений комами |
| `--force` | Автоматичне очищення застарілих файлів без запиту |
| `--profile <профіль>` | Перевизначити глобальний профіль для цього запуску ініціалізації (`core` або `custom`) |

`--profile custom` використовує будь-які робочі процеси, вибрані в глобальній конфігурації (`профіль конфігурації openspec`).

**Ідентифікатори підтримуваних інструментів (`--tools`):** `amazon-q`, `antigravity`, `auggie`, `claude`, `cline`, `codex`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `iflow`, `kilocode`, `kiro`, `opencode`, `pi`, `qoder`, `qwen`, `roocode`, `trae`, `windsurf`

**Приклади:**

```bash
# Interactive initialization
openspec init

# Initialize in a specific directory
openspec init ./my-project

# Non-interactive: configure for Claude and Cursor
openspec init --tools claude,cursor

# Configure for all supported tools
openspec init --tools all

# Override profile for this run
openspec init --profile core

# Skip prompts and auto-cleanup legacy files
openspec init --force
```

**Що це створює:**

```
openspec/
├── specs/              # Your specifications (source of truth)
├── changes/            # Proposed changes
└── config.yaml         # Project configuration

.claude/skills/         # Claude Code skills (if claude selected)
.cursor/skills/         # Cursor skills (if cursor selected)
.cursor/commands/       # Cursor OPSX commands (if delivery includes commands)
... (other tool configs)
```

---

### `оновлення openspec`

Оновіть файли інструкцій OpenSpec після оновлення CLI. Повторно генерує файли конфігурації інструменту AI, використовуючи ваш поточний глобальний профіль, вибрані робочі процеси та режим доставки.

```
openspec update [path] [options]
```

**Аргументи:**

| Аргумент | Необхідно | Опис |
|----------|----------|-------------|
| `шлях` | Ні | Цільовий каталог (за замовчуванням: поточний каталог) |

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--force` | Примусове оновлення, навіть якщо файли оновлені |

**Приклад:**

```bash
# Update instruction files after npm upgrade
npm update @fission-ai/openspec
openspec update
```

---

## Команди перегляду

### `список відкритих специфікацій`

Перелічіть зміни або специфікації у вашому проекті.

```
openspec list [options]
```

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--технічні характеристики` | Список специфікацій замість змін |
| `--зміни` | Список змін (за замовчуванням) |
| `--sort <порядок>` | Сортувати за `останнім` (за замовчуванням) або `ім'ям` |
| `--json` | Вивести як JSON |

**Приклади:**

```bash
# List all active changes
openspec list

# List all specs
openspec list --specs

# JSON output for scripts
openspec list --json
```

**Вихід (текст):**

```
Active changes:
  add-dark-mode     UI theme switching support
  fix-login-bug     Session timeout handling
```

---

### `перегляд openspec`

Відображення інтерактивної інформаційної панелі для вивчення характеристик і змін.

```
openspec view
```

Відкриває термінальний інтерфейс для навігації специфікаціями та змінами вашого проекту.

---

### `openspec show`

Відображення деталей зміни або специфікації.

```
openspec show [item-name] [options]
```

**Аргументи:**

| Аргумент | Необхідно | Опис |
|----------|----------|-------------|
| `назва-елементу` | Ні | Назва зміни або специфікація (запитує, якщо опущено) |

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--type <тип>` | Укажіть тип: `change` або `spec` (визначається автоматично, якщо однозначно) |
| `--json` | Вивести як JSON |
| `--no-interactive` | Вимкнути підказки |

**Окремі параметри змін:**

| Варіант | Опис |
|--------|-------------|
| `--deltas-only` | Показати лише дельта-специфікації (режим JSON) |

**Окремі параметри:**

| Варіант | Опис |
|--------|-------------|
| `--requirements` | Показати лише вимоги, виключити сценарії (режим JSON) |
| `--без сценаріїв` | Виключити вміст сценарію (режим JSON) |
| `-r, --requirement <id>` | Показати конкретну вимогу за індексом на основі 1 (режим JSON) |

**Приклади:**

```bash
# Interactive selection
openspec show

# Show a specific change
openspec show add-dark-mode

# Show a specific spec
openspec show auth --type spec

# JSON output for parsing
openspec show add-dark-mode --json
```

---

## Команди перевірки

### `перевірка openspec`

Перевірте зміни та специфікації щодо структурних проблем.

```
openspec validate [item-name] [options]
```

**Аргументи:**

| Аргумент | Необхідно | Опис |
|----------|----------|-------------|
| `назва-елементу` | Ні | Конкретний елемент для перевірки (запитує, якщо опущено) |

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--все` | Підтвердити всі зміни та характеристики |
| `--зміни` | Підтвердити всі зміни |
| `--технічні характеристики` | Перевірити всі специфікації |
| `--type <тип>` | Укажіть тип, якщо ім’я неоднозначне: `change` або `spec` |
| `--строгий` | Увімкнути режим суворої перевірки |
| `--json` | Вивести як JSON |
| `--concurrency <n>` | Максимальна кількість паралельних перевірок (за замовчуванням: 6 або `OPENSPEC_CONCURRENCY` env) |
| `--no-interactive` | Вимкнути підказки |

**Приклади:**

```bash
# Interactive validation
openspec validate

# Validate a specific change
openspec validate add-dark-mode

# Validate all changes
openspec validate --changes

# Validate everything with JSON output (for CI/scripts)
openspec validate --all --json

# Strict validation with increased parallelism
openspec validate --all --strict --concurrency 12
```

**Вихід (текст):**

```
Validating add-dark-mode...
  ✓ proposal.md valid
  ✓ specs/ui/spec.md valid
  ⚠ design.md: missing "Technical Approach" section

1 warning found
```

**Вихід (JSON):**

```json
{
  "version": "1.0.0",
  "results": {
    "changes": [
      {
        "name": "add-dark-mode",
        "valid": true,
        "warnings": ["design.md: missing 'Technical Approach' section"]
      }
    ]
  },
  "summary": {
    "total": 1,
    "valid": 1,
    "invalid": 0
  }
}
```

---

## Команди життєвого циклу

### `архів openspec`

Архівуйте завершену зміну та об’єднайте дельта-специфікації в основні специфікації.

```
openspec archive [change-name] [options]
```

**Аргументи:**

| Аргумент | Необхідно | Опис |
|----------|----------|-------------|
| `змінити назву` | Ні | Змінити в архів (запитує, якщо пропущено) |

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `-y, --yes` | Пропустити запити на підтвердження |
| `--skip-specs` | Пропустити оновлення специфікацій (лише для змін інфраструктури/інструментів/документації) |
| `--no-validate` | Пропустити перевірку (потрібне підтвердження) |

**Приклади:**

```bash
# Interactive archive
openspec archive

# Archive specific change
openspec archive add-dark-mode

# Archive without prompts (CI/scripts)
openspec archive add-dark-mode --yes

# Archive a tooling change that doesn't affect specs
openspec archive update-ci-config --skip-specs
```

**Що він робить:**

1. Перевіряє зміни (якщо не `--no-validate`)
2. Запит на підтвердження (якщо не `--yes`)
3. Об’єднує дельта-специфікації в `openspec/specs/`
4. Переміщує папку змін до `openspec/changes/archive/YYYY-MM-DD-<name>/`

---

## Команди робочого процесу

Ці команди підтримують робочий процес OPSX, керований артефактами. Вони корисні як для людей, які перевіряють прогрес, так і для агентів, які визначають наступні кроки.

### `статус openspec`

Відображення статусу завершення артефакту для зміни.

```
openspec status [options]
```

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--змінити <id>` | Змінити ім'я (запитує, якщо пропущено) |
| `--схема <назва>` | Перевизначення схеми (автоматично визначено з конфігурації змін) |
| `--json` | Вивести як JSON |

**Приклади:**

```bash
# Interactive status check
openspec status

# Status for specific change
openspec status --change add-dark-mode

# JSON for agent use
openspec status --change add-dark-mode --json
```

**Вихід (текст):**

```
Change: add-dark-mode
Schema: spec-driven
Progress: 2/4 artifacts complete

[x] proposal
[ ] design
[x] specs
[-] tasks (blocked by: design)
```

**Вихід (JSON):**

```json
{
  "changeName": "add-dark-mode",
  "schemaName": "spec-driven",
  "isComplete": false,
  "applyRequires": ["tasks"],
  "artifacts": [
    {"id": "proposal", "outputPath": "proposal.md", "status": "done"},
    {"id": "design", "outputPath": "design.md", "status": "ready"},
    {"id": "specs", "outputPath": "specs/**/*.md", "status": "done"},
    {"id": "tasks", "outputPath": "tasks.md", "status": "blocked", "missingDeps": ["design"]}
  ]
}
```

---

### `інструкції openspec`

Отримайте розширені інструкції щодо створення артефакту або застосування завдань. Використовується агентами ШІ, щоб зрозуміти, що створити далі.

```
openspec instructions [artifact] [options]
```

**Аргументи:**

| Аргумент | Необхідно | Опис |
|----------|----------|-------------|
| `артефакт` | Ні | ID артефакту: `proposal`, `specs`, `design`, `tasks` або `apply` |

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--змінити <id>` | Змінити назву (потрібно в неінтерактивному режимі) |
| `--схема <назва>` | Перевизначення схеми |
| `--json` | Вивести як JSON |

**Особливий випадок:** використовуйте `apply` як артефакт, щоб отримати інструкції щодо виконання завдання.

**Приклади:**

```bash
# Get instructions for next artifact
openspec instructions --change add-dark-mode

# Get specific artifact instructions
openspec instructions design --change add-dark-mode

# Get apply/implementation instructions
openspec instructions apply --change add-dark-mode

# JSON for agent consumption
openspec instructions design --change add-dark-mode --json
```

**Вихід включає:**

- Вміст шаблону для артефакту
— Контекст проекту з конфігурації
— Вміст із артефактів залежностей
— Правила для кожного артефакту з конфігурації

---

### `шаблони openspec`

Показати розв’язані шляхи шаблону для всіх артефактів у схемі.

```
openspec templates [options]
```

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--схема <назва>` | Схема для перевірки (за замовчуванням: `spec-driven`) |
| `--json` | Вивести як JSON |

**Приклади:**

```bash
# Show template paths for default schema
openspec templates

# Show templates for custom schema
openspec templates --schema my-workflow

# JSON for programmatic use
openspec templates --json
```

**Вихід (текст):**

```
Schema: spec-driven

Templates:
  proposal  → ~/.openspec/schemas/spec-driven/templates/proposal.md
  specs     → ~/.openspec/schemas/spec-driven/templates/specs.md
  design    → ~/.openspec/schemas/spec-driven/templates/design.md
  tasks     → ~/.openspec/schemas/spec-driven/templates/tasks.md
```

---

### `схеми openspec`

Перелік доступних схем робочих процесів із їхніми описами та потоками артефактів.

```
openspec schemas [options]
```

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--json` | Вивести як JSON |

**Приклад:**

```bash
openspec schemas
```

**Вихід:**

```
Available schemas:

  spec-driven (package)
    The default spec-driven development workflow
    Flow: proposal → specs → design → tasks

  my-custom (project)
    Custom workflow for this project
    Flow: research → proposal → tasks
```

---

## Команди схеми

Команди для створення власних схем робочого процесу та керування ними.

### `ініціалізація схеми openspec`

Створіть нову локальну схему проекту.

```
openspec schema init <name> [options]
```

**Аргументи:**

| Аргумент | Необхідно | Опис |
|----------|----------|-------------|
| `ім'я` | Так | Назва схеми (кебаб-пенал) |

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--description <текст>` | Опис схеми |
| `--артефакти <список>` | Ідентифікатори артефактів, розділених комами (за замовчуванням: `proposal,specs,design,tasks`) |
| `--за умовчанням` | Встановити як схему проекту за замовчуванням |
| `--no-default` | Не пропонувати встановити за умовчанням |
| `--force` | Перезаписати існуючу схему |
| `--json` | Вивести як JSON |

**Приклади:**

```bash
# Interactive schema creation
openspec schema init research-first

# Non-interactive with specific artifacts
openspec schema init rapid \
  --description "Rapid iteration workflow" \
  --artifacts "proposal,tasks" \
  --default
```

**Що це створює:**

```
openspec/schemas/<name>/
├── schema.yaml           # Schema definition
└── templates/
    ├── proposal.md       # Template for each artifact
    ├── specs.md
    ├── design.md
    └── tasks.md
```

---

### `розгалуження схеми openspec`

Скопіюйте наявну схему до свого проекту для налаштування.

```
openspec schema fork <source> [name] [options]
```

**Аргументи:**

| Аргумент | Необхідно | Опис |
|----------|----------|-------------|
| `джерело` | Так | Схема для копіювання |
| `ім'я` | Ні | Нова назва схеми (за замовчуванням: `<source>-custom`) |

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--force` | Перезаписати існуюче призначення |
| `--json` | Вивести як JSON |

**Приклад:**

```bash
# Fork the built-in spec-driven schema
openspec schema fork spec-driven my-workflow
```

---

### `перевірка схеми openspec`

Перевірте структуру та шаблони схеми.

```
openspec schema validate [name] [options]
```

**Аргументи:**

| Аргумент | Необхідно | Опис |
|----------|----------|-------------|
| `ім'я` | Ні | Схема для перевірки (перевіряє всі, якщо пропущено) |

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--verbose` | Показати детальні кроки перевірки |
| `--json` | Вивести як JSON |

**Приклад:**

```bash
# Validate a specific schema
openspec schema validate my-workflow

# Validate all schemas
openspec schema validate
```

---

### `схема openspec which`

Показати, звідки вирішується схема (корисно для пріоритету налагодження).

```
openspec schema which [name] [options]
```

**Аргументи:**

| Аргумент | Необхідно | Опис |
|----------|----------|-------------|
| `ім'я` | Ні | Назва схеми |

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--все` | Перерахувати всі схеми з їх джерелами |
| `--json` | Вивести як JSON |

**Приклад:**

```bash
# Check where a schema comes from
openspec schema which spec-driven
```

**Вихід:**

```
spec-driven resolves from: package
  Source: /usr/local/lib/node_modules/@fission-ai/openspec/schemas/spec-driven
```

**Пріоритет схеми:**

1. Проект: `openspec/schemas/<name>/`
2. Користувач: `~/.local/share/openspec/schemas/<name>/`
3. Пакет: Вбудовані схеми

---

## Команди конфігурації

### `конфігурація openspec`

Перегляньте та змініть глобальну конфігурацію OpenSpec.

```
openspec config <subcommand> [options]
```

**Підкоманди:**

| Підкоманда | Опис |
|------------|-------------|
| `шлях` | Показати розташування конфігураційного файлу |
| `список` | Показати всі поточні налаштування |
| `отримати <ключ>` | Отримати конкретне значення |
| `встановити <ключ> <значення>` | Встановіть значення |
| `відмінити <ключ>` | Видалити ключ |
| `скинути` | Відновити значення за замовчуванням |
| `редагувати` | Відкрити в `$EDITOR` |
| `профіль [попереднє налаштування]` | Налаштуйте профіль робочого процесу в інтерактивному режимі або за допомогою попереднього |

**Приклади:**

```bash
# Show config file path
openspec config path

# List all settings
openspec config list

# Get a specific value
openspec config get telemetry.enabled

# Set a value
openspec config set telemetry.enabled false

# Set a string value explicitly
openspec config set user.name "My Name" --string

# Remove a custom setting
openspec config unset user.name

# Reset all configuration
openspec config reset --all --yes

# Edit config in your editor
openspec config edit

# Configure profile with action-based wizard
openspec config profile

# Fast preset: switch workflows to core (keeps delivery mode)
openspec config profile core
```

`профіль конфігурації openspec` починається зі зведення поточного стану, а потім дозволяє вибрати:
- Зміна доставки + робочі процеси
- Змінити лише доставку
- Зміна лише робочих процесів
- Зберегти поточні налаштування (вихід)

Якщо ви зберігаєте поточні налаштування, зміни не записуються та не відображається запит на оновлення.
Якщо в конфігурації немає змін, але поточні файли проекту не синхронізовані з вашим глобальним профілем/доставкою, OpenSpec покаже попередження та запропонує виконати `openspec update`.
Натискання `Ctrl+C` також скасовує потік чисто (без трасування стека) і виходить із кодом `130`.
У контрольному списку робочого процесу `[x]` означає, що робочий процес вибрано в глобальній конфігурації. Щоб застосувати ці параметри до файлів проекту, запустіть `openspec update` (або виберіть `Застосувати зміни до цього проекту зараз?`, коли з’явиться запит у проекті).

**Інтерактивні приклади:**

```bash
# Delivery-only update
openspec config profile
# choose: Change delivery only
# choose delivery: Skills only

# Workflows-only update
openspec config profile
# choose: Change workflows only
# toggle workflows in the checklist, then confirm
```

---

## Службові команди

### `відгук openspec`

Надішліть відгук про OpenSpec. Створює проблему GitHub.

```
openspec feedback <message> [options]
```

**Аргументи:**

| Аргумент | Необхідно | Опис |
|----------|----------|-------------|
| `повідомлення` | Так | Повідомлення зворотного зв'язку |

**Опції:**

| Варіант | Опис |
|--------|-------------|
| `--body <текст>` | Детальний опис |

**Вимоги:** GitHub CLI (`gh`) має бути встановлено та автентифіковано.

**Приклад:**

```bash
openspec feedback "Add support for custom artifact types" \
  --body "I'd like to define my own artifact types beyond the built-in ones."
```

---

### `завершення openspec`

Керуйте завершеннями оболонки для OpenSpec CLI.

```
openspec completion <subcommand> [shell]
```

**Підкоманди:**

| Підкоманда | Опис |
|------------|-------------|
| `генерувати [оболонку]` | Сценарій завершення виведення в stdout |
| `встановити [оболонку]` | Установіть завершення для вашої оболонки |
| `видалити [оболонку]` | Видалити встановлені доробки |

**Підтримувані оболонки:** `bash`, `zsh`, `fish`, `powershell`

**Приклади:**

```bash
# Install completions (auto-detects shell)
openspec completion install

# Install for specific shell
openspec completion install zsh

# Generate script for manual installation
openspec completion generate bash > ~/.bash_completion.d/openspec

# Uninstall
openspec completion uninstall
```

---

## Коди виходу

| Код | Значення |
|------|---------|
| `0` | Успіх |
| `1` | Помилка (збій перевірки, відсутні файли тощо) |

---

## Змінні середовища

| Змінна | Опис |
|----------|-------------|
| `OPENSPEC_CONCURRENCY` | Паралельність за умовчанням для групової перевірки (за замовчуванням: 6) |
| `РЕДАКТОР` або `ВІЗУАЛЬНИЙ` | Редактор для `редагування конфігурації openspec` |
| `БЕЗ_КОЛЬОРУ` | Вимкнути кольорове виведення, якщо встановлено |

---

## Пов'язана документація

- [Команди](commands.md) - Команди штучного інтелекту (`/opsx:propose`, `/opsx:apply` тощо)
- [Робочі процеси](workflows.md) - Загальні шаблони та коли використовувати кожну команду
- [Налаштування](customization.md) - Створення власних схем і шаблонів
- [Початок роботи](getting-started.md) - Інструкція з першого налаштування
