# Перехід на OPSX

Цей посібник допоможе вам перейти від застарілого робочого процесу OpenSpec до OPSX. Міграція розроблена таким чином, щоб бути плавною — ваша поточна робота зберігається, а нова система пропонує більше гнучкості.

## What's Changing?

OPSX замінює старий робочий процес із фазовою синхронізацією на плавний підхід, заснований на дії. Ось ключове зміщення:

| Аспект | Спадщина | OPSX |
|--------|--------|------|
| **Команди** | `/openspec:пропозиція`, `/openspec:apply`, `/openspec:архів` | За замовчуванням: `/opsx:propose`, `/opsx:apply`, `/opsx:archive` (команди розширеного робочого процесу необов’язкові) |
| **Робочий процес** | Створити всі артефакти одночасно | Створюйте поступово або все відразу — на ваш вибір |
| **Повертаючись назад** | Незручні фазові ворота | Natural — оновлюйте будь-який артефакт у будь-який час |
| **Налаштування** | Стаціонарна структура | Керований схемою, повністю зламаний |
| **Конфігурація** | `CLAUDE.md` з маркерами + `project.md` | Очистіть конфігурацію в `openspec/config.yaml` |

**Зміна філософії: ** Робота не лінійна. OPSX перестає прикидатися.

---

## Перш ніж почати

### Ваша робота в безпеці

Процес міграції розроблено з урахуванням збереження:

- **Активні зміни в `openspec/changes/`** — Повністю збережено. Ви можете продовжити їх за допомогою команд OPSX.
- **Архівні зміни** — Недоторкані. Ваша історія залишається недоторканою.
- **Основні специфікації в `openspec/specs/`** — Не змінено. Це ваше джерело правди.
- **Ваш вміст у CLAUDE.md, AGENTS.md тощо** — збережено. Видаляються лише блоки маркерів OpenSpec; все що ти написав залишається.

### Що видаляється

Лише файли, керовані OpenSpec, які замінюються:

| Що | Чому |
|------|-----|
| Каталоги/файли застарілої команди похилої риски | Замінено новою системою навичок |
| `openspec/AGENTS.md` | Застарілий тригер робочого процесу |
| Маркери OpenSpec у `CLAUDE.md`, `AGENTS.md` тощо | Більше не потрібна |

**Розташування застарілих команд за інструментом** (приклади — ваш інструмент може відрізнятися):

- Код Клода: `.claude/commands/openspec/`
- Курсор: `.cursor/commands/openspec-*.md`
- Windsurf: `.windsurf/workflows/openspec-*.md`
- Cline: `.clinerules/workflows/openspec-*.md`
- Roo: `.roo/commands/openspec-*.md`
- GitHub Copilot: `.github/prompts/openspec-*.prompt.md` (лише розширення IDE; не підтримується в Copilot CLI)
- Та інші (Augment, Continue, Amazon Q тощо)

Міграція виявляє будь-які інструменти, які ви налаштували, і очищає їхні застарілі файли.

Список видалення може здатися довгим, але це всі файли, спочатку створені OpenSpec. Ваш власний вміст ніколи не видаляється.

### Що потребує вашої уваги

Один файл потребує ручної міграції:

**`openspec/project.md`** — Цей файл не видаляється автоматично, оскільки він може містити контекст проекту, який ви написали. Вам потрібно:

1. Перегляньте його вміст
2. Перемістіть корисний контекст до `openspec/config.yaml` (див. вказівки нижче)
3. Видаліть файл, коли будете готові

**Чому ми внесли цю зміну:**

Старий `project.md` був пасивним — агенти могли його прочитати, а могли й ні, могли забути прочитане. Ми виявили, що надійність була непостійною.

Новий контекст `config.yaml` **активно впроваджується в кожен запит на планування OpenSpec**. Це означає, що умови вашого проекту, стек технологій і правила завжди присутні, коли ШІ створює артефакти. Більш висока надійність.

**Компроміс:**

Оскільки контекст додається до кожного запиту, ви захочете бути лаконічним. Зосередьтеся на тому, що дійсно важливо:
- Технологічний стек і ключові угоди
- ШІ повинен знати неочевидні обмеження
- Правила, які раніше часто ігнорувалися

Не турбуйтеся про те, щоб він був ідеальним. Ми все ще вивчаємо, що тут найкраще працює, і під час експериментів ми вдосконалюватимемо роботу впровадження контексту.

---

## Запуск міграції

І `openspec init`, і `openspec update` виявляють застарілі файли та направляють вас через той самий процес очищення. Використовуйте те, що підходить для вашої ситуації:

- Нові встановлення за замовчуванням для профілю `core` (`propose`, `explore`, `apply`, `archive`).
- Переміщені інсталяції зберігають ваші попередньо встановлені робочі процеси, створюючи «спеціальний» профіль, коли це необхідно.

### Використання `openspec init`

Запустіть це, якщо ви хочете додати нові інструменти або змінити налаштування налаштованих інструментів:

```bash
openspec init
```

Команда init виявляє застарілі файли та проводить очищення:

```
Upgrading to the new OpenSpec

OpenSpec now uses agent skills, the emerging standard across coding
agents. This simplifies your setup while keeping everything working
as before.

Files to remove
No user content to preserve:
  • .claude/commands/openspec/
  • openspec/AGENTS.md

Files to update
OpenSpec markers will be removed, your content preserved:
  • CLAUDE.md
  • AGENTS.md

Needs your attention
  • openspec/project.md
    We won't delete this file. It may contain useful project context.

    The new openspec/config.yaml has a "context:" section for planning
    context. This is included in every OpenSpec request and works more
    reliably than the old project.md approach.

    Review project.md, move any useful content to config.yaml's context
    section, then delete the file when ready.

? Upgrade and clean up legacy files? (Y/n)
```

**Що відбувається, коли ти скажеш «так»:**

1. Застарілі каталоги команд із скісною рискою видаляються
2. Маркери OpenSpec видаляються з `CLAUDE.md`, `AGENTS.md` тощо (ваш вміст залишається)
3. `openspec/AGENTS.md` видалено
4. Нові навички встановлені в `.claude/skills/`
5. `openspec/config.yaml` створюється зі схемою за замовчуванням

### Використання `openspec update`

Запустіть це, якщо ви просто хочете перенести та оновити наявні інструменти до останньої версії:

```bash
openspec update
```

Команда оновлення також виявляє та очищає застарілі артефакти, а потім оновлює згенеровані навички/команди відповідно до вашого поточного профілю та налаштувань доставки.

### Неінтерактивні середовища / середовища CI

Для міграцій за сценарієм:

```bash
openspec init --force --tools claude
```

Прапорець `--force` пропускає підказки та автоматично приймає очищення.

---

## Перенесення project.md до config.yaml

Старий `openspec/project.md` був файлом розмітки довільної форми для контексту проекту. Новий `openspec/config.yaml` структурований і — критично — **впроваджений у кожен запит на планування**, тому ваші домовленості завжди присутні під час роботи ШІ.

### Раніше (project.md)

```markdown
# Project Context

This is a TypeScript monorepo using React and Node.js.
We use Jest for testing and follow strict ESLint rules.
Our API is RESTful and documented in docs/api.md.

## Conventions

- All public APIs must maintain backwards compatibility
- New features should include tests
- Use Given/When/Then format for specifications
```

### Після (config.yaml)

```yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js
  Testing: Jest with React Testing Library
  API: RESTful, documented in docs/api.md
  We maintain backwards compatibility for all public APIs

rules:
  proposal:
    - Include rollback plan for risky changes
  specs:
    - Use Given/When/Then format for scenarios
    - Reference existing patterns before inventing new ones
  design:
    - Include sequence diagrams for complex flows
```

### Ключові відмінності

| project.md | config.yaml |
|------------|-------------|
| Довільна розмітка | Структурований YAML |
| Одна крапка тексту | Окремий контекст і правила для кожного артефакту |
| Незрозуміло, коли він використовується | Контекст з'являється в УСІХ артефактах; правила з'являються лише у відповідних артефактах |
| Без вибору схеми | Явне поле `schema:` встановлює робочий процес за умовчанням |

### Що залишити, що кинути

Під час міграції будьте вибірковими. Запитайте себе: «Чи потрібно це ШІ для *кожного* запиту на планування?»

**Хороші кандидати для `контексту:`**
- Технологічний стек (мови, фреймворки, бази даних)
- Ключові архітектурні шаблони (монорепо, мікросервіси тощо)
- Неочевидні обмеження ("ми не можемо використовувати бібліотеку X, тому що...")
- Критичні конвенції, які часто ігноруються

**Натомість перейдіть до `правил:`**
- Специфічне форматування артефакту ("використовувати Given/When/Then у специфікаціях")
- Критерії перегляду ("пропозиції повинні включати плани відкату")
- Вони з’являються лише для відповідного артефакту, зберігаючи інші запити легшими

**Виключити повністю**
- Загальні найкращі практики, які ШІ вже знає
- Багатослівні пояснення, які можна було б узагальнити
- Історичний контекст, який не впливає на поточну роботу

### Етапи міграції

1. **Створіть config.yaml** (якщо ще не створено за допомогою init):
   ```yaml
   schema: spec-driven
   ```

2. **Додайте свій контекст** (будьте лаконічними — це стосується кожного запиту):
   ```yaml
   context: |
     Your project background goes here.
     Focus on what the AI genuinely needs to know.
   ```

3. **Додайте правила для кожного артефакту** (необов’язково):
   ```yaml
   rules:
     proposal:
       - Your proposal-specific guidance
     specs:
       - Your spec-writing rules
   ```

4. **Видаліть project.md**, коли ви перемістите все корисне.

**Не передумуйте над цим.** Почніть із головного та повторюйте. Якщо ви помітили, що штучному інтелекту бракує чогось важливого, додайте це. Якщо контекст здається роздутим, обріжте його. Це живий документ.

### Потрібна допомога? Використовуйте цю підказку

Якщо ви не впевнені, як дистилювати свій project.md, запитайте свого помічника зі штучного інтелекту:

```
I'm migrating from OpenSpec's old project.md to the new config.yaml format.

Here's my current project.md:
[paste your project.md content]

Please help me create a config.yaml with:
1. A concise `context:` section (this gets injected into every planning request, so keep it tight—focus on tech stack, key constraints, and conventions that often get ignored)
2. `rules:` for specific artifacts if any content is artifact-specific (e.g., "use Given/When/Then" belongs in specs rules, not global context)

Leave out anything generic that AI models already know. Be ruthless about brevity.
```

AI допоможе вам визначити, що є важливим, а що можна скоротити.

---

## Нові команди

Доступність команди залежить від профілю:

**За замовчуванням (основний профіль):**

| Команда | Призначення |
|---------|---------|
| `/opsx:пропонувати` | Створіть зміни та створіть артефакти планування за один крок |
| `/opsx:explore` | Продумайте ідеї без структури |
| `/opsx: застосувати` | Реалізувати завдання з tasks.md |
| `/opsx:архів` | Завершити та архівувати зміни |

**Розширений робочий процес (власний вибір):**

| Команда | Призначення |
|---------|---------|
| `/opsx:новий` | Розпочати новий каркас змін |
| `/opsx:продовжити` | Створити наступний артефакт (по одному) |
| `/opsx:ff` | Перемотування вперед — створюйте артефакти планування відразу |
| `/opsx:перевірити` | Перевірка реалізації відповідає специфікаціям |
| `/opsx:sync` | Попередній перегляд/злиття специфікацій без архівування |
| `/opsx:bulk-archive` | Архівувати кілька змін одночасно |
| `/opsx:onboard` | Керований наскрізний процес адаптації |

Увімкніть розширені команди за допомогою `профілю конфігурації openspec`, а потім запустіть `openspec update`.

### Відображення команд зі спадщини

| Спадщина | Еквівалент OPSX |
|--------|----------------|
| `/openspec:пропозиція` | `/opsx:propose` (за замовчуванням) або `/opsx:new` потім `/opsx:ff` (розширено) |
| `/openspec: застосувати` | `/opsx: застосувати` |
| `/openspec:архів` | `/opsx:архів` |

### Нові можливості

Ці можливості є частиною розширеного набору команд робочого процесу.

**Створення гранульованого артефакту:**
```
/opsx:continue
```
Створює по одному артефакту на основі залежностей. Використовуйте це, коли ви хочете переглянути кожен крок.

**Режим дослідження:**
```
/opsx:explore
```
Обміркуйте ідеї з партнером, перш ніж приступити до змін.

---

## Розуміння нової архітектури

### Від фазового синхронізації до рідкого

У застарілому робочому процесі примусова лінійна прогресія:

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   PLANNING   │ ───► │ IMPLEMENTING │ ───► │   ARCHIVING  │
│    PHASE     │      │    PHASE     │      │    PHASE     │
└──────────────┘      └──────────────┘      └──────────────┘

If you're in implementation and realize the design is wrong?
Too bad. Phase gates don't let you go back easily.
```

OPSX використовує дії, а не фази:

```
         ┌───────────────────────────────────────────────┐
         │           ACTIONS (not phases)                │
         │                                               │
         │     new ◄──► continue ◄──► apply ◄──► archive │
         │      │          │           │             │   │
         │      └──────────┴───────────┴─────────────┘   │
         │                    any order                  │
         └───────────────────────────────────────────────┘
```

### Граф залежностей

Артефакти утворюють орієнтований граф. Залежності є активаторами, а не воротами:

```
                        proposal
                       (root node)
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
           specs                       design
        (requires:                  (requires:
         proposal)                   proposal)
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
                         tasks
                     (requires:
                     specs, design)
```

Коли ви запускаєте `/opsx:continue`, він перевіряє, що готово, і пропонує наступний артефакт. Ви також можете створити кілька готових артефактів у будь-якому порядку.

### Навички проти команд

Застаріла система використовувала командні файли для окремих інструментів:

```
.claude/commands/openspec/
├── proposal.md
├── apply.md
└── archive.md
```

OPSX використовує новий стандарт **навичок**:

```
.claude/skills/
├── openspec-explore/SKILL.md
├── openspec-new-change/SKILL.md
├── openspec-continue-change/SKILL.md
├── openspec-apply-change/SKILL.md
└── ...
```

Навички розпізнаються кількома інструментами кодування штучного інтелекту та надають багатші метадані.

---

## Продовження існуючих змін

Ваші поточні зміни бездоганно працюють із командами OPSX.

**Маєте активну зміну в порівнянні зі старим робочим процесом?**

```
/opsx:apply add-my-feature
```

OPSX зчитує наявні артефакти та продовжує з того місця, де ви зупинилися.

**Бажаєте додати більше артефактів до існуючої зміни?**

```
/opsx:continue add-my-feature
```

Показує, що можна створити на основі того, що вже існує.

**Потрібно переглянути статус?**

```bash
openspec status --change add-my-feature
```

---

## Нова система конфігурації

### config.yaml Структура

```yaml
# Required: Default schema for new changes
schema: spec-driven

# Optional: Project context (max 50KB)
# Injected into ALL artifact instructions
context: |
  Your project background, tech stack,
  conventions, and constraints.

# Optional: Per-artifact rules
# Only injected into matching artifacts
rules:
  proposal:
    - Include rollback plan
  specs:
    - Use Given/When/Then format
  design:
    - Document fallback strategies
  tasks:
    - Break into 2-hour maximum chunks
```

### Розв'язання схеми

Визначаючи, яку схему використовувати, OPSX перевіряє в порядку:

1. **Прапор CLI**: `--schema <name>` (найвищий пріоритет)
2. **Змінити метадані**: `.openspec.yaml` у каталозі змін
3. **Конфігурація проекту**: `openspec/config.yaml`
4. **За замовчуванням**: `керований специфікаціями`

### Доступні схеми

| Схема | Артефакти | Найкраще для |
|--------|----------|----------|
| `керований специфікацією` | пропозиція → специфікації → дизайн → завдання | Більшість проектів |

Список усіх доступних схем:

```bash
openspec schemas
```

### Спеціальні схеми

Створіть власний робочий процес:

```bash
openspec schema init my-workflow
```

Або форк існуючого:

```bash
openspec schema fork spec-driven my-workflow
```

Дивіться [Налаштування](customization.md) для отримання додаткової інформації.

---

## Усунення несправностей

### "Застарілі файли виявлено в неінтерактивному режимі"

Ви працюєте в CI або неінтерактивному середовищі. Використання:

```bash
openspec init --force
```

### Команди не з'являються після міграції

Перезапустіть IDE. Навички виявляються під час запуску.

### "Невідомий ідентифікатор артефакту в правилах"

Переконайтеся, що ваші ключі `rules:` збігаються з ідентифікаторами артефактів вашої схеми:

- **на основі специфікацій**: `пропозиція`, `специфікації`, `дизайн`, `завдання`

Запустіть це, щоб побачити дійсні ідентифікатори артефактів:

```bash
openspec schemas --json
```

### Конфігурація не застосована

1. Переконайтеся, що файл знаходиться в `openspec/config.yaml` (а не `.yml`)
2. Перевірте синтаксис YAML
3. Зміни конфігурації набувають чинності негайно — перезавантаження не потрібне

### project.md не перенесено

Система навмисно зберігає `project.md`, оскільки він може містити ваш власний вміст. Перегляньте його вручну, перемістіть корисні частини до `config.yaml`, а потім видаліть його.

### Хочете побачити, що буде очищено?

Запустіть init і відхиліть підказку очищення — ви побачите повний підсумок виявлення без будь-яких змін.

---

## Коротка довідка

### Файли після міграції

```
project/
├── openspec/
│   ├── specs/                    # Unchanged
│   ├── changes/                  # Unchanged
│   │   └── archive/              # Unchanged
│   └── config.yaml               # NEW: Project configuration
├── .claude/
│   └── skills/                   # NEW: OPSX skills
│       ├── openspec-propose/     # default core profile
│       ├── openspec-explore/
│       ├── openspec-apply-change/
│       └── ...                   # expanded profile adds new/continue/ff/etc.
├── CLAUDE.md                     # OpenSpec markers removed, your content preserved
└── AGENTS.md                     # OpenSpec markers removed, your content preserved
```

### Що пішло

- `.claude/commands/openspec/` — замінено на `.claude/skills/`
- `openspec/AGENTS.md` — застарілий
- `openspec/project.md` — перейдіть до `config.yaml`, потім видаліть
- Блоки маркерів OpenSpec у `CLAUDE.md`, `AGENTS.md` тощо.

### Шпаргалка команд

```text
/opsx:propose      Start quickly (default core profile)
/opsx:apply        Implement tasks
/opsx:archive      Finish and archive

# Expanded workflow (if enabled):
/opsx:new          Scaffold a change
/opsx:continue     Create next artifact
/opsx:ff           Create planning artifacts
```

---

## Отримання допомоги

- **Discord**: [discord.gg/YctCnvvshC](https://discord.gg/YctCnvvshC)
- **Проблеми GitHub**: [github.com/Fission-AI/OpenSpec/issues](https://github.com/Fission-AI/OpenSpec/issues)
- **Документація**: [docs/opsx.md](opsx.md) для повної довідки OPSX
