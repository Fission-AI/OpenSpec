# Поняття

Цей посібник пояснює основні ідеї OpenSpec і те, як вони поєднуються. Для практичного використання див. [Початок роботи](getting-started.md) і [Робочі процеси](workflows.md).

## Філософія

OpenSpec побудовано на чотирьох принципах:

```
fluid not rigid       — no phase gates, work on what makes sense
iterative not waterfall — learn as you build, refine as you go
easy not complex      — lightweight setup, minimal ceremony
brownfield-first      — works with existing codebases, not just greenfield
```

### Чому ці принципи важливі

**Рідка, а не жорстка.** Традиційні системи специфікацій блокують вас на етапи: спочатку ви плануєте, потім реалізуєте, а потім готово. OpenSpec є більш гнучким — ви можете створювати артефакти в будь-якому порядку, який підходить для вашої роботи.

**Ітерація, а не каскад.** Зміна вимог. Розуміння поглиблюється. Те, що здавалося хорошим підходом на початку, може не витримати, коли ви побачите кодову базу. OpenSpec приймає цю реальність.

**Легко, а не складно.** Деякі специфікації фреймворків вимагають тривалого налаштування, жорстких форматів або важких процесів. OpenSpec тримається подалі від вас. Ініціалізація за лічені секунди, почніть працювати негайно, налаштовуйте лише за потреби.

**Браунфілд перш за все.** Більшість роботи з програмним забезпеченням — це не створення з нуля — це модифікація існуючих систем. Розширений підхід OpenSpec дозволяє легко вказувати зміни в існуючій поведінці, а не просто описувати нові системи.

## Велика картина

OpenSpec організовує вашу роботу за двома основними напрямками:

```
┌─────────────────────────────────────────────────────────────────┐
│                        openspec/                                 │
│                                                                  │
│   ┌─────────────────────┐      ┌──────────────────────────────┐ │
│   │       specs/        │      │         changes/              │ │
│   │                     │      │                               │ │
│   │  Source of truth    │◄─────│  Proposed modifications       │ │
│   │  How your system    │ merge│  Each change = one folder     │ │
│   │  currently works    │      │  Contains artifacts + deltas  │ │
│   │                     │      │                               │ │
│   └─────────────────────┘      └──────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Технічні характеристики** є джерелом правди — вони описують, як зараз поводиться ваша система.

**Зміни** — це запропоновані модифікації — вони зберігаються в окремих папках, поки ви не будете готові їх об’єднати.

Цей поділ є ключовим. Ви можете працювати над кількома змінами паралельно без конфліктів. Ви можете переглянути зміни, перш ніж вони вплинуть на основні характеристики. А коли ви архівуєте зміну, її дельти чітко зливаються з джерелом правди.

## Специфікації

Специфікації описують поведінку вашої системи за допомогою структурованих вимог і сценаріїв.

### Структура

```
openspec/specs/
├── auth/
│   └── spec.md           # Authentication behavior
├── payments/
│   └── spec.md           # Payment processing
├── notifications/
│   └── spec.md           # Notification system
└── ui/
    └── spec.md           # UI behavior and themes
```

Упорядковуйте специфікації за доменом — логічні групи, які мають сенс для вашої системи. Загальні моделі:

- **За областю функцій**: `auth/`, `payments/`, `search/`
- **За компонентами**: `api/`, `frontend/`, `workers/`
- **За обмеженим контекстом**: `ordering/`, `fillment/`, `inventory/`

### Формат специфікації

Специфікація містить вимоги, і кожна вимога має сценарії:

```markdown
# Auth Specification

## Purpose
Authentication and session management for the application.

## Requirements

### Requirement: User Authentication
The system SHALL issue a JWT token upon successful login.

#### Scenario: Valid credentials
- GIVEN a user with valid credentials
- WHEN the user submits login form
- THEN a JWT token is returned
- AND the user is redirected to dashboard

#### Scenario: Invalid credentials
- GIVEN invalid credentials
- WHEN the user submits login form
- THEN an error message is displayed
- AND no token is issued

### Requirement: Session Expiration
The system MUST expire sessions after 30 minutes of inactivity.

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 30 minutes pass without activity
- THEN the session is invalidated
- AND the user must re-authenticate
```

**Ключові елементи:**

| Елемент | Призначення |
|---------|---------|
| `## Призначення` | Опис високого рівня домену цієї специфікації |
| `### Вимога:` | Специфічна поведінка системи повинна мати |
| `#### Сценарій:` | Конкретний приклад вимоги в дії |
| ПОВИНЕН/ПОВИНЕН/ПОВИНЕН | Ключові слова RFC 2119, що вказують на силу вимог |

### Чому специфікації структури саме так

**Вимоги — це «що»** — вони вказують, що має робити система, не вказуючи впровадження.

**Сценарії — це «коли»** — вони надають конкретні приклади, які можна перевірити. Хороші сценарії:
- Підлягають перевірці (ви можете написати для них автоматичний тест)
- Охоплюйте як щасливий шлях, так і крайні випадки
- Використовуйте Given/When/Then або аналогічний структурований формат

**Ключові слова RFC 2119** (SHALL, MUST, SHOULD, MAY) передають намір:
- **ПОВИНЕН/ПОВИНЕН** — абсолютна вимога
- **СЛІД** — рекомендовано, але існують винятки
- **ТРАВЕНЬ** — необов'язковий

### Що таке специфікація (чи ні)

Специфікація — це **контракт про поведінку**, а не план впровадження.

Хороший вміст специфікацій:
- Спостережувана поведінка, на яку покладаються користувачі або подальші системи
- Входи, виходи та умови помилок
- Зовнішні обмеження (безпека, конфіденційність, надійність, сумісність)
- Сценарії, які можна протестувати або явно підтвердити

Уникайте в специфікаціях:
- Внутрішні імена класів/функцій
- Вибір бібліотеки або фреймворка
- Деталі поетапного впровадження
- Детальні плани виконання (вони належать до `design.md` або `tasks.md`)

Швидкий тест:
- Якщо реалізація може змінюватися без зміни видимої зовні поведінки, вона, ймовірно, не належить до специфікації.

### Keep It Lightweight: Progressive Rigor

OpenSpec прагне уникнути бюрократії. Використовуйте найлегший рівень, який усе ще робить зміну перевіреною.

**Спрощена специфікація (за замовчуванням):**
- Короткі вимоги до поведінки
- Чіткий обсяг і позацілі
- Кілька конкретних перевірок приймання

**Повна специфікація (для підвищеного ризику):**
- Зміни між командами або міжрепо
- Зміни API/контракту, міграція, питання безпеки/конфіденційності
- Зміни, де неоднозначність може спричинити дорогу переробку

Більшість змін має залишатися в спрощеному режимі.

### Співпраця людини та агента

У багатьох командах люди досліджують, а агенти створюють проекти артефактів. Запланована петля:

1. Людина забезпечує намір, контекст і обмеження.
2. Агент перетворює це на вимоги та сценарії поведінки.
3. Агент зберігає деталі реалізації в `design.md` і `tasks.md`, а не в `spec.md`.
4. Перевірка підтверджує структуру та ясність перед впровадженням.

Це робить характеристики читабельними для людей і узгодженими для агентів.

## Зміни

Зміна — це запропонована модифікація вашої системи, упакована у папку з усім необхідним для її розуміння та впровадження.

### Змінити структуру

```
openspec/changes/add-dark-mode/
├── proposal.md           # Why and what
├── design.md             # How (technical approach)
├── tasks.md              # Implementation checklist
├── .openspec.yaml        # Change metadata (optional)
└── specs/                # Delta specs
    └── ui/
        └── spec.md       # What's changing in ui/spec.md
```

Кожна зміна є самостійною. Він має:
- **Артефакти** — документи, які відображають наміри, дизайн і завдання
- **Дельта-специфікації** — специфікації того, що додається, змінюється або видаляється
- **Метадані** — додаткова конфігурація для цієї конкретної зміни

### Чому зміни є папками

Пакування зміни як папки має кілька переваг:

1. **Усе разом.** Пропозиція, дизайн, завдання та характеристики живуть в одному місці. Немає полювання через різні локації.

2. **Паралельна робота.** Кілька змін можуть існувати одночасно без конфліктів. Також триває робота над `add-dark-mode` і `fix-auth-bug`.

3. **Очистити історію.** Після архівування зміни переміщуються до `changes/archive/` зі збереженням повного контексту. Ви можете озирнутися назад і зрозуміти не тільки що змінилося, а й чому.

4. **Зручний для перегляду.** Папку змін легко переглянути — відкрийте її, прочитайте пропозицію, перевірте дизайн, подивіться дельти специфікацій.

## Артефакти

Артефакти — це документи в межах зміни, які керують роботою.

### Потік артефактів

```
proposal ──────► specs ──────► design ──────► tasks ──────► implement
    │               │             │              │
   why            what           how          steps
 + scope        changes       approach      to take
```

Артефакти будуються один на одному. Кожен артефакт створює контекст для наступного.

### Типи артефактів

#### Пропозиція (`proposal.md`)

Пропозиція охоплює **намір**, **сферу дії** та **підхід** на високому рівні.

```markdown
# Proposal: Add Dark Mode

## Intent
Users have requested a dark mode option to reduce eye strain
during nighttime usage and match system preferences.

## Scope
In scope:
- Theme toggle in settings
- System preference detection
- Persist preference in localStorage

Out of scope:
- Custom color themes (future work)
- Per-page theme overrides

## Approach
Use CSS custom properties for theming with a React context
for state management. Detect system preference on first load,
allow manual override.
```

**Коли оновлювати пропозицію:**
- Зміни обсягу (звуження або розширення)
- Намір прояснює (краще розуміння проблеми)
- Принципово змінюється підхід

#### Специфікації (дельта-специфікації в `specs/`)

Специфікації Delta описують **що змінилося** відносно поточних специфікацій. Див. [Дельта-специфікації](#delta-specs) нижче.

#### Дизайн (`design.md`)

Дизайн відображає **технічний підхід** і **архітектурні рішення**.

````markdown
# Design: Add Dark Mode

## Technical Approach
Theme state managed via React Context to avoid prop drilling.
CSS custom properties enable runtime switching without class toggling.

## Architecture Decisions

### Decision: Context over Redux
Using React Context for theme state because:
- Simple binary state (light/dark)
- No complex state transitions
- Avoids adding Redux dependency

### Decision: CSS Custom Properties
Using CSS variables instead of CSS-in-JS because:
- Works with existing stylesheet
- No runtime overhead
- Browser-native solution

## Data Flow
```
ThemeProvider (контекст)
       │
       ▼
ThemeToggle ◄──► localStorage
       │
       ▼
Змінні CSS (застосовуються до :root)
```

## File Changes
- `src/contexts/ThemeContext.tsx` (new)
- `src/components/ThemeToggle.tsx` (new)
- `src/styles/globals.css` (modified)
````

**Коли оновлювати дизайн:**
- Реалізація показує, що підхід не працюватиме
- Знайдено краще рішення
- Зміна залежностей або обмежень

#### Завдання (`tasks.md`)

Завдання — це **чек-лист реалізації** — конкретні кроки з прапорцями.

```markdown
# Tasks

## 1. Theme Infrastructure
- [ ] 1.1 Create ThemeContext with light/dark state
- [ ] 1.2 Add CSS custom properties for colors
- [ ] 1.3 Implement localStorage persistence
- [ ] 1.4 Add system preference detection

## 2. UI Components
- [ ] 2.1 Create ThemeToggle component
- [ ] 2.2 Add toggle to settings page
- [ ] 2.3 Update Header to include quick toggle

## 3. Styling
- [ ] 3.1 Define dark theme color palette
- [ ] 3.2 Update components to use CSS variables
- [ ] 3.3 Test contrast ratios for accessibility
```

**Рекомендації щодо завдань:**
- Згрупуйте пов’язані завдання під заголовками
- Використовуйте ієрархічну нумерацію (1.1, 1.2 тощо)
- Зберігайте завдання достатньо малими, щоб їх можна було виконати за один сеанс
- Відзначайте завдання, коли ви їх виконуєте

## Дельта характеристики

Дельта-специфікації є ключовою концепцією, завдяки якій OpenSpec працює для розробки забудованих територій. Вони описують **що змінилося**, а не повторюють всю специфікацію.

### Формат

```markdown
# Delta for Auth

## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST support TOTP-based two-factor authentication.

#### Scenario: 2FA enrollment
- GIVEN a user without 2FA enabled
- WHEN the user enables 2FA in settings
- THEN a QR code is displayed for authenticator app setup
- AND the user must verify with a code before activation

#### Scenario: 2FA login
- GIVEN a user with 2FA enabled
- WHEN the user submits valid credentials
- THEN an OTP challenge is presented
- AND login completes only after valid OTP

## MODIFIED Requirements

### Requirement: Session Expiration
The system MUST expire sessions after 15 minutes of inactivity.
(Previously: 30 minutes)

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 15 minutes pass without activity
- THEN the session is invalidated

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA. Users should re-authenticate each session.)
```

### Дельта-секції

| Розділ | Значення | Що відбувається в архіві |
|---------|---------|------------------------|
| `## ДОДАНІ Вимоги` | Нова поведінка | Додано до основної специфікації |
| `## ЗМІНЕНІ Вимоги` | Змінена поведінка | Замінює існуючу вимогу |
| `## ВИДАЛЕНО Вимоги` | Застаріла поведінка | Видалено з основної специфікації |

### Чому Deltas замість повних специфікацій

**Чіткість.** Дельта показує, що саме змінюється. Читаючи повну специфікацію, вам доведеться подумки порівняти її з поточною версією.

**Уникнення конфліктів.** Дві зміни можуть стосуватися одного файлу специфікацій без конфлікту, якщо вони змінюють різні вимоги.

**Ефективність перегляду.** Рецензенти бачать зміни, а не незмінний контекст. Зосередьтеся на важливому.

**Браунфілд.** Більшість робіт змінює існуючу поведінку. Delta вносять першокласні модифікації, а не запізнілі.

## Схеми

Схеми визначають типи артефактів і їхні залежності для робочого процесу.

### Як працюють схеми

```yaml
# openspec/schemas/spec-driven/schema.yaml
name: spec-driven
artifacts:
  - id: proposal
    generates: proposal.md
    requires: []              # No dependencies, can create first

  - id: specs
    generates: specs/**/*.md
    requires: [proposal]      # Needs proposal before creating

  - id: design
    generates: design.md
    requires: [proposal]      # Can create in parallel with specs

  - id: tasks
    generates: tasks.md
    requires: [specs, design] # Needs both specs and design first
```

**Артефакти утворюють графік залежностей:**

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

**Залежності є механізмами, а не воротами.** Вони показують, що можна створити, а не те, що ви повинні створити далі. Ви можете пропустити дизайн, якщо він вам не потрібен. Ви можете створити специфікації до або після дизайну — обидва залежать лише від пропозиції.

### Вбудовані схеми

**на основі специфікацій** (за замовчуванням)

Стандартний робочий процес для розробки на основі специфікацій:

```
proposal → specs → design → tasks → implement
```

Найкраще для: більшість функцій працюють там, де потрібно узгодити специфікації перед впровадженням.

### Спеціальні схеми

Створюйте власні схеми для робочого процесу вашої команди:

```bash
# Create from scratch
openspec schema init research-first

# Or fork an existing one
openspec schema fork spec-driven research-first
```

**Приклад спеціальної схеми:**

```yaml
# openspec/schemas/research-first/schema.yaml
name: research-first
artifacts:
  - id: research
    generates: research.md
    requires: []           # Do research first

  - id: proposal
    generates: proposal.md
    requires: [research]   # Proposal informed by research

  - id: tasks
    generates: tasks.md
    requires: [proposal]   # Skip specs/design, go straight to tasks
```

Перегляньте [Налаштування](customization.md), щоб отримати повну інформацію про створення та використання власних схем.

## Архів

Архівування завершує зміну, об’єднуючи її дельта-специфікації в основні характеристики та зберігаючи зміни для історії.

### Що відбувається, коли ви архівуєте

```
Before archive:

openspec/
├── specs/
│   └── auth/
│       └── spec.md ◄────────────────┐
└── changes/                         │
    └── add-2fa/                     │
        ├── proposal.md              │
        ├── design.md                │ merge
        ├── tasks.md                 │
        └── specs/                   │
            └── auth/                │
                └── spec.md ─────────┘


After archive:

openspec/
├── specs/
│   └── auth/
│       └── spec.md        # Now includes 2FA requirements
└── changes/
    └── archive/
        └── 2025-01-24-add-2fa/    # Preserved for history
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            └── specs/
                └── auth/
                    └── spec.md
```

### Процес архівування

1. **Об’єднайте дельти.** Кожен розділ дельта-специфікації (ДОДАНО/ЗМІНЕНО/ВИЛУЧЕНО) застосовується до відповідної основної специфікації.

2. **Перемістити до архіву.** Папка змін переміститься до `changes/archive/` з префіксом дати для хронологічного впорядкування.

3. **Зберігайте контекст.** Усі артефакти залишаються недоторканими в архіві. Ви завжди можете озирнутися назад, щоб зрозуміти, чому були зроблені зміни.

### Чому архів важливий

**Чистий стан.** Активні зміни (`changes/`) показують лише незавершену роботу. Виконана робота зсувається з дороги.

**Аудиторський слід.** Архів зберігає повний контекст кожної зміни — не лише те, що змінилося, але й пропозицію, що пояснює, чому, дизайн, що пояснює, як, і завдання, що показують виконану роботу.

**Розвиток специфікацій.** Специфікації ростуть органічно, коли зміни архівуються. Кожен архів об’єднує свої дельти, створюючи з часом вичерпну специфікацію.

## Як це все поєднується

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OPENSPEC FLOW                                   │
│                                                                              │
│   ┌────────────────┐                                                         │
│   │  1. START      │  /opsx:propose (core) or /opsx:new (expanded)          │
│   │     CHANGE     │                                                         │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  2. CREATE     │  /opsx:ff or /opsx:continue (expanded workflow)         │
│   │     ARTIFACTS  │  Creates proposal → specs → design → tasks              │
│   │                │  (based on schema dependencies)                         │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  3. IMPLEMENT  │  /opsx:apply                                            │
│   │     TASKS      │  Work through tasks, checking them off                  │
│   │                │◄──── Update artifacts as you learn                      │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  4. VERIFY     │  /opsx:verify (optional)                                │
│   │     WORK       │  Check implementation matches specs                     │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐     ┌──────────────────────────────────────────────┐   │
│   │  5. ARCHIVE    │────►│  Delta specs merge into main specs           │   │
│   │     CHANGE     │     │  Change folder moves to archive/             │   │
│   └────────────────┘     │  Specs are now the updated source of truth   │   │
│                          └──────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Добрий цикл:**

1. Специфікації описують поточну поведінку
2. Зміни пропонують модифікації (як дельти)
3. Впровадження робить зміни реальними
4. Архів об’єднує дельти в специфікації
5. Специфікації тепер описують нову поведінку
6. Наступна зміна базується на оновлених специфікаціях

## Глосарій

| Термін | Визначення |
|------|------------|
| **Артефакт** | Документ у межах зміни (пропозиція, проект, завдання або дельта-специфікації) |
| **Архів** | Процес завершення зміни та об’єднання його дельт у основні специфікації |
| **Змінити** | Пропонована модифікація системи, упакована у вигляді папки з артефактами |
| **Дельта специфікація** | Специфікація, яка описує зміни (ДОДАНО/ЗМІНЕНО/ВИЛУЧЕНО) відносно поточних специфікацій |
| **Домен** | Логічне групування для специфікацій (наприклад, `auth/`, `payments/`) |
| **Вимога** | Специфічна поведінка системи повинна мати |
| **Сценарій** | Конкретний приклад вимоги, зазвичай у форматі Given/When/Then |
| **Схема** | Визначення типів артефактів та їх залежностей |
| **Специфікація** | Специфікація, що описує поведінку системи, містить вимоги та сценарії |
| **Джерело правди** | Каталог `openspec/specs/`, що містить поточну узгоджену поведінку |

## Наступні кроки

- [Початок роботи](getting-started.md) - Перші практичні кроки
- [Робочі процеси](workflows.md) - Загальні шаблони та коли їх використовувати
- [Команди](commands.md) - Повний довідник команд
- [Налаштування](customization.md) - Створення власних схем і налаштування вашого проекту
