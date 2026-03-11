<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec">
    <picture>
      <source srcset="assets/openspec_bg.png">
      <img src="assets/openspec_bg.png" alt="Логотип OpenSpec">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@fission-ai/openspec"><img alt="версія npm" src="https://img.shields.io/npm/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="Ліцензія: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <a href="https://discord.gg/YctCnvvshC"><img alt="Discord" src="https://img.shields.io/discord/1411657095639601154?style=flat-square&logo=discord&logoColor=white&label=Discord&suffix=%20online" /></a>
</p>

<details>
<summary><strong>Найулюбленіший фреймворк для специфікацій.</strong></summary>

[![Stars](https://img.shields.io/github/stars/Fission-AI/OpenSpec?style=flat-square&label=Stars)](https://github.com/Fission-AI/OpenSpec/stargazers)
[![Downloads](https://img.shields.io/npm/dm/@fission-ai/openspec?style=flat-square&label=Downloads/mo)](https://www.npmjs.com/package/@fission-ai/openspec)
[![Contributors](https://img.shields.io/github/contributors/Fission-AI/OpenSpec?style=flat-square&label=Contributors)](https://github.com/Fission-AI/OpenSpec/graphs/contributors)

</details>
<p></p>
Наша філософія:

```text
→ гнучко, а не жорстко
→ ітеративно, а не водоспадом
→ просто, а не складно
→ для brownfield, а не лише для greenfield
→ масштабується від персональних проєктів до enterprise
```

> [!TIP]
> **Новий воркфлоу вже доступний!** Ми перебудували OpenSpec на новий процес, орієнтований на артефакти.
>
> Запустіть `/opsx:propose "ваша ідея"` для старту. → [Дізнатися більше](docs/opsx.md)

<p align="center">
  Слідкуйте за <a href="https://x.com/0xTab">@0xTab в X</a> для оновлень · Приєднуйтеся до <a href="https://discord.gg/YctCnvvshC">OpenSpec Discord</a> для допомоги та запитань.
</p>

### Команди

Використовуєте OpenSpec у команді? [Напишіть сюди](mailto:teams@openspec.dev), щоб отримати доступ до нашого Slack-каналу.

<!-- TODO: Додати GIF-демо воркфлоу /opsx:propose → /opsx:archive -->

## Дивіться в дії

```text
Ви: /opsx:propose add-dark-mode
AI:  Створено openspec/changes/add-dark-mode/
     ✓ proposal.md — навіщо це робимо і що змінюється
     ✓ specs/       — вимоги та сценарії
     ✓ design.md    — технічний підхід
     ✓ tasks.md     — чекліст реалізації
     Готово до імплементації!

Ви: /opsx:apply
AI:  Виконую завдання...
     ✓ 1.1 Додати провайдер контексту теми
     ✓ 1.2 Створити компонент перемикача
     ✓ 2.1 Додати CSS-змінні
     ✓ 2.2 Підключити localStorage
     Усі завдання виконано!

Ви: /opsx:archive
AI:  Заархівовано в openspec/changes/archive/2025-01-23-add-dark-mode/
     Специфікації оновлено. Готово до наступної фічі.
```

<details>
<summary><strong>Панель OpenSpec</strong></summary>

<p align="center">
  <img src="assets/openspec_dashboard.png" alt="Попередній перегляд панелі OpenSpec" width="90%">
</p>

</details>

## Швидкий старт

**Потрібен Node.js 20.19.0 або новіший.**

Встановіть OpenSpec глобально:

```bash
npm install -g @fission-ai/openspec@latest
```

Якщо потрібно встановити напряму з вашого GitHub-репозиторію через npm:

```bash
npm install -g github:h0rn3t/OpenSpec
```

Або з конкретної гілки чи тега:

```bash
npm install -g github:h0rn3t/OpenSpec#main
```

Далі перейдіть у директорію проєкту та ініціалізуйте:

```bash
cd your-project
openspec init
```

Тепер скажіть вашому AI: `/opsx:propose <що-ви-хочете-побудувати>`

Якщо хочете розширений воркфлоу (`/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:sync`, `/opsx:bulk-archive`, `/opsx:onboard`), оберіть його через `openspec config profile` і застосуйте через `openspec update`.

> [!NOTE]
> Не впевнені, чи підтримується ваш інструмент? [Подивіться повний список](docs/supported-tools.md) — ми підтримуємо 20+ інструментів і цей список зростає.
>
> Також працює з pnpm, yarn, bun і nix. [Дивіться варіанти встановлення](docs/installation.md).

### Приклад для існуючого проєкту (brownfield)

Якщо у вас вже є кодова база і ви хочете правильно перейти на OpenSpec:

1. Ініціалізуйте OpenSpec в корені проєкту:

```bash
openspec init
```

2. Зафіксуйте поточний стан системи через baseline-change:

```bash
openspec new change baseline-current-system
```

Заповніть `openspec/changes/baseline-current-system/specs/*/spec.md` поточними вимогами (без імплементації), потім змерджіть у головні спеки:

Правильний приклад запиту до агента:

```text
Проаналізуй поточний код і зафіксуй baseline-специфікації для існуючого проєкту.
Працюй тільки в change `baseline-current-system`.
Створи або онови файли `openspec/changes/baseline-current-system/specs/*/spec.md` за фактичною поведінкою системи.
Не імплементуй нові фічі, не змінюй продакшн-код, лише специфікації.
Після завершення покажи список створених capability та короткий зміст кожної.
```

```bash
openspec archive baseline-current-system --yes
```

Після цього базовий стан буде в `openspec/specs/`:

```text
openspec/specs/
├── auth/spec.md
├── billing/spec.md
└── notifications/spec.md
```

3. Далі всі нові зміни ведіть через change-папки:

```text
openspec/changes/add-sso-login/
├── proposal.md
├── design.md
├── tasks.md
└── specs/
    └── auth/spec.md
```

4. Після реалізації та перевірки заархівуйте зміну:
- `openspec archive <change-id>` або `/opsx:archive`
- це оновлює основні спеки в `openspec/specs/` і переносить зміну в архів

Коротко: `openspec/specs/` — це поточна правда про систему, а `openspec/changes/*/specs/` — дельти для конкретних змін.

## Документація

→ **[Початок роботи](docs/getting-started.md)**: перші кроки<br>
→ **[Воркфлоу](docs/workflows.md)**: комбінації та патерни<br>
→ **[Команди](docs/commands.md)**: slash-команди та skills<br>
→ **[CLI](docs/cli.md)**: довідник по терміналу<br>
→ **[Підтримувані інструменти](docs/supported-tools.md)**: інтеграції та шляхи встановлення<br>
→ **[Концепції](docs/concepts.md)**: як це все поєднується<br>
→ **[Мультимовність](docs/multi-language.md)**: підтримка кількох мов<br>
→ **[Кастомізація](docs/customization.md)**: налаштуйте під себе


## Чому OpenSpec?

AI-помічники для коду потужні, але непередбачувані, коли вимоги живуть лише в історії чату. OpenSpec додає легкий шар специфікацій, щоб ви узгодили, що саме будуєте, ще до написання коду.

- **Узгоджуйте до реалізації** — людина й AI синхронізують специфікації до написання коду
- **Тримайте порядок** — кожна зміна має окрему папку з proposal, specs, design і tasks
- **Працюйте гнучко** — оновлюйте будь-який артефакт у будь-який момент, без жорстких етапів
- **Використовуйте свої інструменти** — працює з 20+ AI-асистентами через slash-команди

### Як ми виглядаємо на фоні інших

**проти [Spec Kit](https://github.com/github/spec-kit)** (GitHub) — Ґрунтовний, але важкий. Жорсткі фазові гейти, багато Markdown, налаштування Python. OpenSpec легший і дозволяє вільно ітерувати.

**проти [Kiro](https://kiro.dev)** (AWS) — Потужний, але ви прив’язані до їхньої IDE та обмежені моделями Claude. OpenSpec працює з інструментами, якими ви вже користуєтесь.

**проти "нічого"** — AI-розробка без специфікацій означає розмиті промпти й непередбачувані результати. OpenSpec дає передбачуваність без зайвої бюрократії.

## Оновлення OpenSpec

**Оновіть пакет**

```bash
npm install -g @fission-ai/openspec@latest
```

**Оновіть інструкції для агентів**

Запустіть це в кожному проєкті, щоб перевзгенерувати AI-інструкції і переконатися, що активні найновіші slash-команди:

```bash
openspec update
```

## Нотатки з використання

**Вибір моделі**: OpenSpec найкраще працює з моделями з високою якістю міркування. Ми рекомендуємо Opus 4.5 і GPT 5.2 як для планування, так і для реалізації.

**Гігієна контексту**: OpenSpec виграє від чистого context window. Очистіть контекст перед початком реалізації й підтримуйте хорошу гігієну контексту впродовж сесії.

## Внесок у проєкт

**Невеликі виправлення** — багфікси, виправлення друкарських помилок і малі покращення можна відправляти напряму через PR.

**Більші зміни** — для нових фіч, суттєвих рефакторингів або архітектурних змін спершу подайте пропозицію зміни OpenSpec, щоб ми узгодили намір і цілі до початку реалізації.

Коли пишете proposal, тримайте в голові філософію OpenSpec: ми підтримуємо широкий спектр користувачів з різними coding-агентами, моделями та сценаріями використання. Зміни мають добре працювати для всіх.

**AI-згенерований код вітається** — якщо він протестований і перевірений. У PR із AI-кодом вкажіть coding-агента та модель (наприклад: "Generated with Claude Code using claude-opus-4-5-20251101").

### Розробка

- Встановити залежності: `pnpm install`
- Збірка: `pnpm run build`
- Тести: `pnpm test`
- Локальна розробка CLI: `pnpm run dev` або `pnpm run dev:cli`
- Conventional commits (один рядок): `type(scope): subject`

## Інше

<details>
<summary><strong>Телеметрія</strong></summary>

OpenSpec збирає анонімну статистику використання.

Ми збираємо лише назви команд і версію, щоб розуміти патерни використання. Жодних аргументів, шляхів, вмісту чи PII. Автоматично вимикається в CI.

**Відмова:** `export OPENSPEC_TELEMETRY=0` або `export DO_NOT_TRACK=1`

</details>

<details>
<summary><strong>Мейнтейнери та радники</strong></summary>

Дивіться [MAINTAINERS.md](MAINTAINERS.md) для списку основних мейнтейнерів і радників, які допомагають розвивати проєкт.

</details>



## Ліцензія

MIT
