# Робочі процеси

Цей посібник охоплює загальні шаблони робочого процесу для OpenSpec і коли використовувати кожен із них. Для базового налаштування див. [Початок роботи](getting-started.md). Довідку про команди див. у [Команди](commands.md).

## Філософія: дії, а не етапи

Традиційні робочі процеси змушують вас проходити етапи: планування, потім реалізація, потім готове. Але справжня робота не вписується в коробки.

OPSX використовує інший підхід:

```text
Traditional (phase-locked):

  PLANNING ────────► IMPLEMENTING ────────► DONE
      │                    │
      │   "Can't go back"  │
      └────────────────────┘

OPSX (fluid actions):

  proposal ──► specs ──► design ──► tasks ──► implement
```

**Ключові принципи:**

- **Дії, а не фази** - Команди – це те, що ви можете робити, а не етапи, на яких ви застрягли
- **Залежності - це активатори** - вони показують, що можливо, а не те, що потрібно далі

> **Налаштування:** робочі процеси OPSX керуються схемами, які визначають послідовності артефактів. Див. [Налаштування](customization.md), щоб дізнатися більше про створення власних схем.

## Два режими

### Швидкий шлях за замовчуванням (основний профіль)

Нові інсталяції за замовчуванням `core`, що забезпечує:
- `/opsx:propose`
- `/opsx:explore`
- `/opsx: застосувати`
- `/opsx:архів`

Типовий потік:

```text
/opsx:propose ──► /opsx:apply ──► /opsx:archive
```

### Розширений/повний робочий процес (спеціальний вибір)

Якщо вам потрібні явні команди скаффолду та побудови (`/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:sync`, `/opsx:bulk-archive`, `/opsx:onboard`), увімкніть їх за допомогою:

```bash
openspec config profile
openspec update
```

## Шаблони робочого процесу (розширений режим)

### Швидка функція

Коли ви знаєте, що хочете створити, і вам просто потрібно виконати:

```text
/opsx:new ──► /opsx:ff ──► /opsx:apply ──► /opsx:verify ──► /opsx:archive
```

**Приклад розмови:**

```text
You: /opsx:new add-logout-button

AI:  Created openspec/changes/add-logout-button/
     Ready to create: proposal

You: /opsx:ff

AI:  Creating all planning artifacts...
     ✓ proposal.md
     ✓ specs/
     ✓ design.md
     ✓ tasks.md
     Ready for implementation!

You: /opsx:apply

AI:  Working through tasks...
     ✓ Added logout button to header
     ✓ Implemented session clearing
     ✓ Added confirmation dialog
     All tasks complete!

You: /opsx:archive

AI:  ✓ Merged specs
     ✓ Archived change
```

**Найкраще для:** малих і середніх функцій, виправлень помилок, простих змін.

### Дослідницький

Якщо вимоги незрозумілі або вам потрібно спочатку їх дослідити:

```text
/opsx:explore ──► /opsx:new ──► /opsx:continue ──► ... ──► /opsx:apply
```

**Приклад розмови:**

```text
You: /opsx:explore

AI:  What would you like to explore?

You: I want to improve page load performance but I'm not sure
     where the bottlenecks are.

AI:  Let me help investigate...
     [Analyzes bundle sizes, identifies slow queries, reviews
     component render patterns]

     I found three main bottlenecks:
     1. Large unoptimized images
     2. Synchronous data fetching in ProductList
     3. Re-renders from context changes

     Which would you like to address first?

You: Let's tackle the data fetching issue.

You: /opsx:new optimize-product-list-fetching

AI:  Created change. Ready to create: proposal

You: /opsx:continue

AI:  Creating proposal based on our exploration...
     [Writes proposal incorporating investigation insights]

     Ready to create: specs, design
     Which would you like next?

You: /opsx:continue

AI:  Creating specs...
```

**Найкраще для:** Оптимізації продуктивності, налагодження, архітектурних рішень, незрозумілих вимог.

### Паралельні зміни

Працюйте над кількома змінами одночасно:

```text
Change A: /opsx:new ──► /opsx:ff ──► /opsx:apply (in progress)
                                         │
                                    context switch
                                         │
Change B: /opsx:new ──► /opsx:ff ──────► /opsx:apply
```

**Приклад розмови:**

```text
You: I'm working on add-dark-mode but got pulled into a bug fix

You: /opsx:new fix-login-redirect

AI:  Created openspec/changes/fix-login-redirect/

You: /opsx:ff

AI:  ✓ Created planning artifacts

You: /opsx:apply

AI:  Working on fix-login-redirect...
     [Implements the fix]
     All tasks complete!

You: /opsx:archive

AI:  ✓ Archived fix-login-redirect

You: Let's get back to dark mode

You: /opsx:apply add-dark-mode

AI:  Resuming add-dark-mode...
     Picking up at task 2.3: Update Header...
```

**Найкраще для:** Паралельних робочих потоків, термінових перерв, командної співпраці.

Якщо у вас є кілька завершених змін, використовуйте `/opsx:bulk-archive`:

```text
You: /opsx:bulk-archive

AI:  Found 3 completed changes:
     - add-dark-mode (all tasks done)
     - fix-login-redirect (all tasks done)
     - update-footer (all tasks done)

     Checking for spec conflicts...
     ⚠ add-dark-mode and update-footer both touch specs/ui/

     Inspecting codebase to resolve...
     Both changes are implemented. Will apply in chronological order.

     Archive all 3 changes?

You: Yes

AI:  ✓ Archived add-dark-mode
     ✓ Archived fix-login-redirect
     ✓ Archived update-footer
     Specs merged in order: add-dark-mode → update-footer
```

Масовий архів виявляє, коли кілька змін стосуються одних і тих самих специфікацій, і вирішує конфлікти, перевіряючи, що насправді реалізовано.

### Завершення зміни

Рекомендований потік завершення:

```text
/opsx:apply ──► /opsx:verify ──► /opsx:archive
                    │                 │
              validates          prompts to sync
              implementation     if needed
```

#### Перевірте: перевірте свою роботу

`/opsx:verify` перевіряє реалізацію щодо ваших артефактів у трьох вимірах:

```text
You: /opsx:verify

AI:  Verifying add-auth...

     COMPLETENESS
     ✓ All 12 tasks in tasks.md are checked
     ✓ All requirements in specs have corresponding code
     ⚠ Scenario "Session timeout after inactivity" not tested

     CORRECTNESS
     ✓ Implementation matches spec intent
     ✓ Edge cases from scenarios are handled
     ✓ Error states match spec definitions

     COHERENCE
     ✓ Design decisions reflected in code structure
     ✓ Naming conventions consistent with design.md
     ⚠ Design mentions "event-driven" but implementation uses polling

     SUMMARY
     ─────────────────────────────
     Critical issues: 0
     Warnings: 2
     Ready to archive: Yes (with warnings)

     Recommendations:
     1. Add test for session timeout scenario
     2. Consider refactoring to event-driven as designed, or update design.md
```

**Що перевіряє:**

| Розмір | Що він підтверджує |
|-----------|------------------|
| Повнота | Усі завдання виконано, усі вимоги виконано, сценарії охоплено |
| Правильність | Реалізація відповідає наміру специфікації, обробляються крайові випадки |
| Когерентність | Дизайнерські рішення, відображені в коді, узгоджені |

Перевірка не заблокує архів, але виявить проблеми, які ви можете спочатку вирішити.

#### Архів: завершити зміни

`/opsx:archive` завершує зміни та переміщує їх до архіву:

```text
You: /opsx:archive

AI:  Archiving add-auth...

     Artifact status:
     ✓ proposal.md exists
     ✓ specs/ exists
     ✓ design.md exists
     ✓ tasks.md exists (12/12 tasks complete)

     Delta specs: Not yet synced to main
     → Would you like to sync now?

You: Yes

AI:  ✓ Synced specs to openspec/specs/auth/spec.md
     ✓ Moved to openspec/changes/archive/2025-01-24-add-auth/

     Change archived successfully.
```

Архів підкаже, якщо характеристики не синхронізовано. Він не блокуватиме невиконані завдання, але попередить вас.

## Коли що використовувати

### `/opsx:ff` проти `/opsx:continue`

| Ситуація | Використовуйте |
|-----------|-----|
| Чіткі вимоги, готові будувати | `/opsx:ff` |
| Досліджуючи, хочу переглянути кожен крок | `/opsx:продовжити` |
| Хочете переглянути пропозицію перед специфікаціями | `/opsx:продовжити` |
| Тиск часу, потрібно рухатися швидко | `/opsx:ff` |
| Комплексні зміни, потрібно контролювати | `/opsx:продовжити` |

**Емпіричне правило:** якщо ви можете заздалегідь описати повний обсяг, використовуйте `/opsx:ff`. Якщо ви з’ясовуєте це по ходу роботи, використовуйте `/opsx:continue`.

### Коли оновлювати чи починати заново

Поширене запитання: коли можна оновлювати існуючу зміну, а коли слід починати нову?

**Оновіть наявну зміну, коли:**

- Той самий задум, витончене виконання
- Область звужується (спочатку MVP, потім відпочинок)
- Виправлення на основі навчання (кодова база не така, як ви очікували)
- Налаштування дизайну на основі відкриттів реалізації

**Почніть нову зміну, коли:**

- Принципово змінився намір
- Сфера вибухнула до зовсім іншої роботи
- Оригінальна зміна може бути окремо позначена як "виконана".
- Патчі більше заплутають, ніж прояснить

```text
                     ┌─────────────────────────────────────┐
                     │     Is this the same work?          │
                     └──────────────┬──────────────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
          Same intent?      >50% overlap?      Can original
          Same problem?     Same scope?        be "done" without
                 │                  │          these changes?
                 │                  │                  │
       ┌────────┴────────┐  ┌──────┴──────┐   ┌───────┴───────┐
       │                 │  │             │   │               │
      YES               NO YES           NO  NO              YES
       │                 │  │             │   │               │
       ▼                 ▼  ▼             ▼   ▼               ▼
    UPDATE            NEW  UPDATE       NEW  UPDATE          NEW
```

**Приклад: «Додати темний режим»**

- «Потрібно також підтримувати спеціальні теми» → Нова зміна (розширений обсяг)
- «Виявлення системних налаштувань важче, ніж очікувалося» → Оновлення (таке саме призначення)
- «Спочатку відправимо перемикач, а потім додамо налаштування» → Оновити, потім архівувати, а потім нові зміни

## Найкращі практики

### Зосередьтеся на змінах

Одна логічна одиниця роботи на зміну. Якщо ви робите «додати функцію X, а також рефакторити Y», розгляньте дві окремі зміни.

**Чому це важливо:**
- Легше переглянути та зрозуміти
— Очищення історії архіву
- Можна відправляти самостійно
— Простіший відкат, якщо потрібно

### Використовуйте `/opsx:explore` для незрозумілих вимог

Перш ніж приступити до змін, вивчіть проблемний простір:

```text
You: /opsx:explore

AI:  What would you like to explore?

You: How should we handle rate limiting for our API?

AI:  Let me investigate your current setup and options...
     [Researches codebase, considers patterns]

     I see three approaches we could take:
     1. Middleware-based (simple, per-endpoint)
     2. Redis-backed (scalable, shared state)
     3. Token bucket per user (fair, complex)

     Your current stack suggests #1 or #2. What's your scale?
```

Дослідження прояснює мислення, перш ніж створювати артефакти.

### Перевірте перед архівуванням

Використовуйте `/opsx:verify`, щоб перевірити відповідність реалізації артефактам:

```text
You: /opsx:verify

AI:  Verifying add-dark-mode...

     ✓ All tasks in tasks.md are checked
     ✓ Requirements in specs have corresponding code
     ✓ Design decisions are reflected in implementation

     Ready to archive!
```

Виявляє невідповідності перед тим, як закрити зміну.

### Чітко змінюються назви

Хороші імена роблять `openspec list` корисним:

```text
Good:                          Avoid:
add-dark-mode                  feature-1
fix-login-redirect             update
optimize-product-query         changes
implement-2fa                  wip
```

## Короткий довідник команд

Щоб отримати повну інформацію про команди та параметри, перегляньте [Команди](commands.md).

| Команда | Призначення | Коли використовувати |
|---------|---------|-------------|
| `/opsx:пропонувати` | Створення змін + артефакти планування | Швидкий шлях за умовчанням (`core` профіль) |
| `/opsx:explore` | Продумайте ідеї | Нечіткі вимоги, розслідування |
| `/opsx:новий` | Розпочати зміну ешафоту | Розширений режим, явний контроль артефактів |
| `/opsx:продовжити` | Створити наступний артефакт | Розгорнутий режим, покрокове створення артефакту |
| `/opsx:ff` | Створити всі артефакти планування | Розгорнутий режим, чітка область |
| `/opsx: застосувати` | Реалізувати завдання | Готовий до написання коду |
| `/opsx:перевірити` | Підтвердити реалізацію | Розгорнутий режим, перед архівуванням |
| `/opsx:sync` | Об’єднати дельта-специфікації | Розгорнутий режим, необов'язковий |
| `/opsx:архів` | Завершити зміну | Всі роботи закінчені |
| `/opsx:bulk-archive` | Архівувати кілька змін | Розгорнутий режим, паралельна робота |

## Наступні кроки

- [Команди](commands.md) - Повний довідник команд із параметрами
- [Концепції] (concepts.md) - Глибоке занурення в характеристики, артефакти та схеми
- [Налаштування](customization.md) - Створення власних робочих процесів
