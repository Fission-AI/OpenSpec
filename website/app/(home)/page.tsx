import Link from 'next/link';
import {
  ArrowRight,
  Compass,
  FileText,
  GitBranch,
  Hammer,
  Archive,
  Layers,
  Sparkles,
} from 'lucide-react';
import { links } from '@/lib/shared';

export default function HomePage() {
  return (
    <main className="flex flex-col">
      <Hero />
      <Philosophy />
      <TwoFolders />
      <FiveIdeas />
      <TheLoop />
      <Why />
      <FinalCta />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-fd-border">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,theme(colors.fd-primary/8%),transparent_60%)]" />
      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-20 text-center sm:py-28">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs font-medium text-fd-muted-foreground">
          <Sparkles className="size-3.5 text-fd-primary" />
          The lightweight spec layer for AI coding
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          Agree first.
          <br />
          Then build confidently.
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-lg text-fd-muted-foreground">
          OpenSpec is a tiny agreement layer between you and your AI. You write
          down what a change should do, the AI drafts the details, you both look
          at the same plan, and <em>only then</em> does code get written. No more
          discovering halfway through that it built the wrong thing.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-semibold text-fd-primary-foreground transition-opacity hover:opacity-90"
          >
            Get started <ArrowRight className="size-4" />
          </Link>
          <Link
            href={links.github}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-fd-border bg-fd-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-fd-accent"
          >
            <GitBranch className="size-4" /> Star on GitHub
          </Link>
        </div>
        <Terminal />
      </div>
    </section>
  );
}

function Terminal() {
  return (
    <div className="mt-14 w-full max-w-2xl text-left">
      <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-fd-border px-4 py-3">
          <span className="size-3 rounded-full bg-red-400/80" />
          <span className="size-3 rounded-full bg-yellow-400/80" />
          <span className="size-3 rounded-full bg-green-400/80" />
          <span className="ml-3 text-xs text-fd-muted-foreground">
            your-project — AI chat
          </span>
        </div>
        <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
          <code>
            <span className="text-fd-primary">/opsx:propose</span> add-dark-mode
            {'\n'}
            <span className="text-fd-muted-foreground">
              {'  '}✓ proposal.md — why we are doing this, what changes{'\n'}
              {'  '}✓ specs/ — requirements and scenarios{'\n'}
              {'  '}✓ design.md — technical approach{'\n'}
              {'  '}✓ tasks.md — implementation checklist{'\n'}
            </span>
            {'\n'}
            <span className="text-fd-primary">/opsx:apply</span>
            {'\n'}
            <span className="text-fd-muted-foreground">
              {'  '}✓ working through tasks, checking each one off…{'\n'}
            </span>
            {'\n'}
            <span className="text-fd-primary">/opsx:archive</span>
            {'\n'}
            <span className="text-fd-muted-foreground">
              {'  '}✓ specs updated · change filed away · ready for the next one
            </span>
          </code>
        </pre>
      </div>
    </div>
  );
}

const PHILOSOPHY = [
  ['fluid', 'not rigid'],
  ['iterative', 'not waterfall'],
  ['easy', 'not complex'],
  ['brownfield', 'not just greenfield'],
];

function Philosophy() {
  return (
    <section className="border-b border-fd-border bg-fd-card/30">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px px-4 py-3 sm:grid-cols-4">
        {PHILOSOPHY.map(([a, b]) => (
          <div key={a} className="px-4 py-4 text-center">
            <div className="text-lg font-semibold tracking-tight">{a}</div>
            <div className="text-sm text-fd-muted-foreground">{b}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TwoFolders() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          The whole idea, in two folders
        </h2>
        <p className="mt-4 text-fd-muted-foreground">
          OpenSpec lives in one <code className="text-fd-primary">openspec/</code>{' '}
          directory in your repo. Two folders inside it carry the entire mental
          model.
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-fd-border bg-fd-card p-6">
          <div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-fd-primary/10 text-fd-primary">
            <FileText className="size-5" />
          </div>
          <h3 className="text-lg font-semibold">
            <code>specs/</code> — what is true
          </h3>
          <p className="mt-2 text-sm text-fd-muted-foreground">
            The source of truth. Plain-language requirements and scenarios that
            describe how your system behaves <em>right now</em>, organized by
            domain. This is the agreed-upon answer to &ldquo;what does this
            software do?&rdquo;
          </p>
        </div>
        <div className="rounded-xl border border-fd-border bg-fd-card p-6">
          <div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-fd-primary/10 text-fd-primary">
            <GitBranch className="size-5" />
          </div>
          <h3 className="text-lg font-semibold">
            <code>changes/</code> — what you are proposing
          </h3>
          <p className="mt-2 text-sm text-fd-muted-foreground">
            One folder per change. Each holds a proposal, a design, a task list,
            and a small spec delta. When the work is done, you archive it and the
            delta folds into the truth. The cycle closes.
          </p>
        </div>
      </div>
    </section>
  );
}

const IDEAS = [
  {
    icon: FileText,
    title: 'Specs are the truth',
    body: 'Requirements and scenarios describe how your system behaves today. One agreed-upon answer, in your repo, readable by humans and AI alike.',
  },
  {
    icon: GitBranch,
    title: 'A change is one unit of work',
    body: 'One feature, one folder. Proposal, design, tasks, and spec edits all live together. Easy to review, easy to reason about.',
  },
  {
    icon: Layers,
    title: 'Deltas, not rewrites',
    body: 'You describe what is changing — ADDED, MODIFIED, REMOVED — not the whole world. That is the trick that makes OpenSpec great at brownfield code.',
  },
  {
    icon: Compass,
    title: 'Enablers, not gates',
    body: 'Artifacts build on each other in a natural order, but nothing locks. Learn something mid-build? Edit the plan and keep going.',
  },
];

function FiveIdeas() {
  return (
    <section className="border-y border-fd-border bg-fd-card/30">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Learn four ideas, and the rest is detail
          </h2>
          <p className="mt-4 text-fd-muted-foreground">
            Everything in OpenSpec is built from a handful of simple concepts.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {IDEAS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-fd-border bg-fd-card p-6"
            >
              <Icon className="size-5 text-fd-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: Compass,
    cmd: '/opsx:explore',
    label: 'optional',
    body: 'A no-stakes thinking partner. It reads your code, weighs options, and turns a fuzzy idea into a concrete plan.',
  },
  {
    icon: FileText,
    cmd: '/opsx:propose',
    body: 'The AI drafts the proposal, spec deltas, design, and a task list. You read it and adjust before any code is written.',
  },
  {
    icon: Hammer,
    cmd: '/opsx:apply',
    body: 'The AI builds it, working through the tasks and checking each one off as it goes.',
  },
  {
    icon: Archive,
    cmd: '/opsx:archive',
    body: 'Spec deltas merge into the truth and the change is filed away with a date stamp. Ready for the next one.',
  },
];

function TheLoop() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">The loop you run</h2>
        <p className="mt-4 text-fd-muted-foreground">
          Two terminal commands to set up. After that, you live in your AI chat.
        </p>
      </div>
      <ol className="mt-12 grid gap-4 md:grid-cols-4">
        {STEPS.map(({ icon: Icon, cmd, label, body }, i) => (
          <li
            key={cmd}
            className="relative rounded-xl border border-fd-border bg-fd-card p-5"
          >
            <div className="flex items-center justify-between">
              <Icon className="size-5 text-fd-primary" />
              <span className="text-xs font-medium text-fd-muted-foreground">
                {label ?? `step ${i + 1}`}
              </span>
            </div>
            <code className="mt-3 block text-sm font-semibold text-fd-primary">
              {cmd}
            </code>
            <p className="mt-2 text-sm text-fd-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Why() {
  return (
    <section className="border-y border-fd-border bg-fd-card/30">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Why bother with the extra step?
          </h2>
          <p className="mt-4 text-fd-muted-foreground">
            OpenSpec adds one small step — a short plan before building. Here is
            what you get for it.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
          {[
            [
              'Catch wrong turns early',
              'Fixing a misunderstanding in a one-paragraph proposal is free. Fixing it after 400 lines of code is not.',
            ],
            [
              'The plan lives with the code',
              'Six months later, the spec tells you and the next AI session why the system works the way it does.',
            ],
            [
              'Changes are reviewable',
              'A change folder is a tidy package: read the proposal, skim the deltas, check the tasks. No chat archaeology.',
            ],
            [
              'It fits existing codebases',
              'Deltas mean you can specify a change to a 50,000-line app without first documenting the whole thing.',
            ],
          ].map(([title, body]) => (
            <div key={title} className="flex gap-3">
              <ArrowRight className="mt-1 size-4 shrink-0 text-fd-primary" />
              <div>
                <div className="font-semibold">{title}</div>
                <p className="mt-1 text-sm text-fd-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24 text-center">
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Ship your first change in five minutes
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-fd-muted-foreground">
        Works with 30+ AI assistants — Claude Code, Cursor, Codex, Windsurf,
        Gemini CLI, and more.
      </p>
      <div className="mt-8 inline-flex items-center gap-2 rounded-lg border border-fd-border bg-fd-card px-4 py-3 font-mono text-sm">
        <span className="text-fd-muted-foreground">$</span>
        npm install -g @fission-ai/openspec@latest
      </div>
      <div className="mt-8">
        <Link
          href="/docs/getting-started"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-fd-primary px-6 py-3 text-sm font-semibold text-fd-primary-foreground transition-opacity hover:opacity-90"
        >
          Read the getting-started guide <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
