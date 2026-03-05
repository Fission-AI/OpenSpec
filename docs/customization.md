# Налаштування

OpenSpec забезпечує три рівні налаштування:

| Рівень | Що він робить | Найкраще для |
|-------|--------------|----------|
| **Конфігурація проекту** | Встановити значення за замовчуванням, додати контекст/правила | Більшість команд |
| **Користувацькі схеми** | Визначте власні артефакти робочого процесу | Команди з унікальними процесами |
| **Глобальні перевизначення** | Спільний доступ до схем для всіх проектів | Досвідчені користувачі |

---

## Конфігурація проекту

Файл `openspec/config.yaml` — це найпростіший спосіб налаштувати OpenSpec для вашої команди. Це дозволяє:

- **Встановити схему за замовчуванням** - Пропускати `--schema` в кожній команді
- **Впровадження контексту проекту** - AI бачить ваш технічний стек, конвенції тощо.
- **Додати правила для кожного артефакту** - Спеціальні правила для конкретних артефактів

### Швидке налаштування

```bash
openspec init
```

Це допоможе вам створити конфігурацію в інтерактивному режимі. Або створіть його вручну:

```yaml
# openspec/config.yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js, PostgreSQL
  API style: RESTful, documented in docs/api.md
  Testing: Jest + React Testing Library
  We value backwards compatibility for all public APIs

rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
  specs:
    - Use Given/When/Then format
    - Reference existing patterns before inventing new ones
```

### Як це працює

**Схема за замовчуванням:**

```bash
# Without config
openspec new change my-feature --schema spec-driven

# With config - schema is automatic
openspec new change my-feature
```

**Впровадження контексту та правил:**

Під час генерації будь-якого артефакту ваш контекст і правила вводяться в підказку ШІ:

```xml
<context>
Tech stack: TypeScript, React, Node.js, PostgreSQL
...
</context>

<rules>
- Include rollback plan
- Identify affected teams
</rules>

<template>
[Schema's built-in template]
</template>
```

- **Контекст** з'являється в УСІХ артефактах
- **Правила** з’являються ЛИШЕ для відповідного артефакту

### Порядок вирішення схеми

Коли OpenSpec потребує схеми, він перевіряє в такому порядку:

1. Прапор CLI: `--schema <name>`
2. Змініть метадані (`.openspec.yaml` в папці змін)
3. Конфігурація проекту (`openspec/config.yaml`)
4. За замовчуванням (`керований специфікацією`)

---

## Спеціальні схеми

Якщо конфігурації проекту недостатньо, створіть власну схему з повністю індивідуальним робочим процесом. Спеціальні схеми містяться в каталозі `openspec/schemas/` вашого проекту та контролюються версіями за допомогою вашого коду.

```text
your-project/
├── openspec/
│   ├── config.yaml        # Project config
│   ├── schemas/           # Custom schemas live here
│   │   └── my-workflow/
│   │       ├── schema.yaml
│   │       └── templates/
│   └── changes/           # Your changes
└── src/
```

### Форк існуючої схеми

Найшвидший спосіб налаштувати — розгалужити вбудовану схему:

```bash
openspec schema fork spec-driven my-workflow
```

Це копіює всю схему, керовану специфікаціями, до `openspec/schemas/my-workflow/`, де ви можете її вільно редагувати.

**Що ви отримуєте:**

```text
openspec/schemas/my-workflow/
├── schema.yaml           # Workflow definition
└── templates/
    ├── proposal.md       # Template for proposal artifact
    ├── spec.md           # Template for specs
    ├── design.md         # Template for design
    └── tasks.md          # Template for tasks
```

Тепер відредагуйте `schema.yaml`, щоб змінити робочий процес, або відредагуйте шаблони, щоб змінити те, що генерує ШІ.

### Створіть схему з нуля

Для абсолютно нового робочого процесу:

```bash
# Interactive
openspec schema init research-first

# Non-interactive
openspec schema init rapid \
  --description "Rapid iteration workflow" \
  --artifacts "proposal,tasks" \
  --default
```

### Структура схеми

Схема визначає артефакти у вашому робочому процесі та те, як вони залежать один від одного:

```yaml
# openspec/schemas/my-workflow/schema.yaml
name: my-workflow
version: 1
description: My team's custom workflow

artifacts:
  - id: proposal
    generates: proposal.md
    description: Initial proposal document
    template: proposal.md
    instruction: |
      Create a proposal that explains WHY this change is needed.
      Focus on the problem, not the solution.
    requires: []

  - id: design
    generates: design.md
    description: Technical design
    template: design.md
    instruction: |
      Create a design document explaining HOW to implement.
    requires:
      - proposal    # Can't create design until proposal exists

  - id: tasks
    generates: tasks.md
    description: Implementation checklist
    template: tasks.md
    requires:
      - design

apply:
  requires: [tasks]
  tracks: tasks.md
```

**Ключові поля:**

| Поле | Призначення |
|-------|---------|
| `id` | Унікальний ідентифікатор, який використовується в командах і правилах |
| `генерує` | Ім’я вихідного файлу (підтримує глобуси, наприклад `specs/**/*.md`) |
| `шаблон` | Файл шаблону в каталозі `templates/` |
| `інструкція` | Інструкції AI для створення цього артефакту |
| `вимагає` | Залежності - які артефакти повинні існувати першими |

### Шаблони

Шаблони — це файли розмітки, які керують ШІ. Вони вводяться в підказку під час створення цього артефакту.

```markdown
<!-- templates/proposal.md -->
## Why

<!-- Explain the motivation for this change. What problem does this solve? -->

## What Changes

<!-- Describe what will change. Be specific about new capabilities or modifications. -->

## Impact

<!-- Affected code, APIs, dependencies, systems -->
```

Шаблони можуть містити:
- Заголовки розділів, які має заповнити ШІ
- Коментарі HTML з інструкціями для ШІ
- Приклади форматів, що показують очікувану структуру

### Перевірте свою схему

Перш ніж використовувати спеціальну схему, перевірте її:

```bash
openspec schema validate my-workflow
```

Це перевіряє:
- Синтаксис `schema.yaml` правильний
- Усі шаблони, на які посилаються, існують
- Немає циклічних залежностей
- Ідентифікатори артефактів дійсні

### Використовуйте свою спеціальну схему

Після створення використовуйте свою схему з:

```bash
# Specify on command
openspec new change feature --schema my-workflow

# Or set as default in config.yaml
schema: my-workflow
```

### Розв'язання схеми налагодження

Не знаєте, яка схема використовується? Перевірте в:

```bash
# See where a specific schema resolves from
openspec schema which my-workflow

# List all available schemas
openspec schema which --all
```

Вихідні дані показують, чи це з вашого проекту, каталогу користувача чи пакета:

```text
Schema: my-workflow
Source: project
Path: /path/to/project/openspec/schemas/my-workflow
```

---

> **Примітка:** OpenSpec також підтримує схеми рівня користувача в `~/.local/share/openspec/schemas/` для спільного використання між проектами, але схеми рівня проекту в `openspec/schemas/` рекомендовані, оскільки вони керуються версією вашого коду.

---

## Приклади

### Робочий процес швидкої ітерації

Мінімальний робочий процес для швидких ітерацій:

```yaml
# openspec/schemas/rapid/schema.yaml
name: rapid
version: 1
description: Fast iteration with minimal overhead

artifacts:
  - id: proposal
    generates: proposal.md
    description: Quick proposal
    template: proposal.md
    instruction: |
      Create a brief proposal for this change.
      Focus on what and why, skip detailed specs.
    requires: []

  - id: tasks
    generates: tasks.md
    description: Implementation checklist
    template: tasks.md
    requires: [proposal]

apply:
  requires: [tasks]
  tracks: tasks.md
```

### Додавання артефакту огляду

Відгалужте значення за замовчуванням і додайте крок перегляду:

```bash
openspec schema fork spec-driven with-review
```

Потім відредагуйте `schema.yaml`, щоб додати:

```yaml
  - id: review
    generates: review.md
    description: Pre-implementation review checklist
    template: review.md
    instruction: |
      Create a review checklist based on the design.
      Include security, performance, and testing considerations.
    requires:
      - design

  - id: tasks
    # ... existing tasks config ...
    requires:
      - specs
      - design
      - review    # Now tasks require review too
```

---

## Дивіться також

- [Довідка CLI: команди схеми] (cli.md#schema-commands) - Повна документація команд
