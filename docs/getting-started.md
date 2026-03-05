# Початок роботи

У цьому посібнику пояснюється, як працює OpenSpec після встановлення та ініціалізації. Щоб отримати інструкції зі встановлення, перегляньте [основний файл README](../README.md#quick-start).

## Як це працює

OpenSpec допомагає вам і вашому помічнику з програмування штучного інтелекту домовитися про те, що потрібно створити, перш ніж буде написаний код.

**Швидкий шлях за замовчуванням (основний профіль):**

```text
/opsx:propose ──► /opsx:apply ──► /opsx:archive
```

**Розширений шлях (спеціальний вибір робочого процесу):**

```text
/opsx:new ──► /opsx:ff or /opsx:continue ──► /opsx:apply ──► /opsx:verify ──► /opsx:archive
```

Стандартним глобальним профілем є `core`, який включає `propose`, `explore`, `apply` та `archive`. Ви можете ввімкнути розширені команди робочого процесу за допомогою `профілю конфігурації openspec`, а потім `оновлення openspec`.

## Що створює OpenSpec

Після запуску `openspec init` ваш проект має таку структуру:

```
openspec/
├── specs/              # Source of truth (your system's behavior)
│   └── <domain>/
│       └── spec.md
├── changes/            # Proposed updates (one folder per change)
│   └── <change-name>/
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/      # Delta specs (what's changing)
│           └── <domain>/
│               └── spec.md
└── config.yaml         # Project configuration (optional)
```

**Два ключові каталоги:**

- **`specs/`** - Джерело правди. Ці специфікації описують, як зараз поводиться ваша система. Упорядковано за доменом (наприклад, `specs/auth/`, `specs/payments/`).

- **`changes/`** - Запропоновані зміни. Кожна зміна отримує окрему папку з усіма пов’язаними артефактами. Коли зміна завершена, її характеристики зливаються в головний каталог `specs/`.

## Розуміння артефактів

Кожна папка змін містить артефакти, які спрямовують роботу:

| Артефакт | Призначення |
|----------|---------|
| `proposal.md` | «Чому» і «що» – це фіксує намір, обсяг і підхід |
| `технічні характеристики/` | Специфікації Delta показують ДОДАНІ/ЗМІНЕНІ/ВИЛУЧЕНІ вимоги |
| `design.md` | «Як» - технічний підхід і архітектурні рішення |
| `tasks.md` | Контрольний список впровадження з прапорцями |

**Артефакти будуються один на одному:**

```
proposal ──► specs ──► design ──► tasks ──► implement
   ▲           ▲          ▲                    │
   └───────────┴──────────┴────────────────────┘
            update as you learn
```

Ви завжди можете повернутися назад і вдосконалити попередні артефакти, коли дізнаєтеся більше під час впровадження.

## Як працюють дельта-специфікації

Дельта-специфікації є ключовим поняттям в OpenSpec. Вони показують, що змінилося відносно ваших поточних характеристик.

### Формат

Специфікації Delta використовують розділи для вказівки типу зміни:

```markdown
# Delta for Auth

## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST require a second factor during login.

#### Scenario: OTP required
- GIVEN a user with 2FA enabled
- WHEN the user submits valid credentials
- THEN an OTP challenge is presented

## MODIFIED Requirements

### Requirement: Session Timeout
The system SHALL expire sessions after 30 minutes of inactivity.
(Previously: 60 minutes)

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 30 minutes pass without activity
- THEN the session is invalidated

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA)
```

### Що відбувається в архіві

Коли ви архівуєте зміни:

1. **ДОДАНІ** вимоги додаються до основної специфікації
2. **МОДИФІКОВАНІ** вимоги замінюють існуючу версію
3. **ВИДАЛЕНО** вимоги видалено з основної специфікації

Папка змін переміщується до `openspec/changes/archive/` для журналу аудиту.

## Приклад: ваша перша зміна

Розглянемо, як додати темний режим до програми.

### 1. Почати зміну (за замовчуванням)

```text
You: /opsx:propose add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md — why we're doing this, what's changing
     ✓ specs/       — requirements and scenarios
     ✓ design.md    — technical approach
     ✓ tasks.md     — implementation checklist
     Ready for implementation!
```

Якщо ви ввімкнули розширений профіль робочого процесу, ви також можете зробити це у два кроки: `/opsx:new`, потім `/opsx:ff` (або `/opsx:continue` поступово).

### 2. Що створюється

**proposal.md** - фіксує намір:

```markdown
# Proposal: Add Dark Mode

## Intent
Users have requested a dark mode option to reduce eye strain
during nighttime usage.

## Scope
- Add theme toggle in settings
- Support system preference detection
- Persist preference in localStorage

## Approach
Use CSS custom properties for theming with a React context
for state management.
```

**specs/ui/spec.md** - Delta показує нові вимоги:

```markdown
# Delta for UI

## ADDED Requirements

### Requirement: Theme Selection
The system SHALL allow users to choose between light and dark themes.

#### Scenario: Manual toggle
- GIVEN a user on any page
- WHEN the user clicks the theme toggle
- THEN the theme switches immediately
- AND the preference persists across sessions

#### Scenario: System preference
- GIVEN a user with no saved preference
- WHEN the application loads
- THEN the system's preferred color scheme is used
```

**tasks.md** - контрольний список впровадження:

```markdown
# Tasks

## 1. Theme Infrastructure
- [ ] 1.1 Create ThemeContext with light/dark state
- [ ] 1.2 Add CSS custom properties for colors
- [ ] 1.3 Implement localStorage persistence

## 2. UI Components
- [ ] 2.1 Create ThemeToggle component
- [ ] 2.2 Add toggle to settings page
- [ ] 2.3 Update Header to include quick toggle

## 3. Styling
- [ ] 3.1 Define dark theme color palette
- [ ] 3.2 Update components to use CSS variables
```

### 3. Реалізувати

```
You: /opsx:apply

AI:  Working through tasks...
     ✓ 1.1 Created ThemeContext with light/dark state
     ✓ 1.2 Added CSS custom properties to globals.css
     ✓ 1.3 Implemented localStorage persistence
     ✓ 2.1 Created ThemeToggle component
     ...
     All tasks complete!
```

Якщо під час реалізації ви виявите, що дизайн потребує коригування, просто оновіть артефакт і продовжуйте.

### 4. Архів

```
You: /opsx:archive

AI:  Archiving add-dark-mode...
     ✓ Merged specs into openspec/specs/ui/spec.md
     ✓ Moved to openspec/changes/archive/2025-01-24-add-dark-mode/
     Done! Ready for the next feature.
```

Ваші дельта-специфікації тепер є частиною основних специфікацій, документуючи, як працює ваша система.

## Перевірка та перегляд

Використовуйте CLI, щоб перевірити свої зміни:

```bash
# List active changes
openspec list

# View change details
openspec show add-dark-mode

# Validate spec formatting
openspec validate add-dark-mode

# Interactive dashboard
openspec view
```

## Наступні кроки

- [Робочі процеси](workflows.md) - Загальні шаблони та коли використовувати кожну команду
- [Команди](commands.md) - Повний довідник для всіх команд із косою рискою
- [Концепції] (concepts.md) - Глибше розуміння специфікацій, змін і схем
- [Налаштування](customization.md) - Зробіть так, щоб OpenSpec працював на ваш смак
