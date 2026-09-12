'use client';

import { useId, useMemo, useRef, useState } from 'react';

// Renders a `file-steps` fence (see lib/remark-file-steps.ts) as a
// click-through stepper: numbered steps, a note explaining the step, and an
// annotated file tree. Added lines (`+ ` gutter) carry the accent; removed
// lines (`- `) are struck. Inline annotations are anything after 3+ spaces.
// All steps render stacked in one grid cell so the tallest step fixes the
// height; arrow keys (plus Home/End) step through once the figure has focus.

interface StepLine {
  marker: '+' | '-' | ' ';
  text: string;
  note: string;
}

interface StepData {
  title: string;
  caption: string[];
  lines: StepLine[];
}

const ACCENT = 'text-[#A64F2C] dark:text-[#D89074]';

function parseSteps(content: string): StepData[] {
  const steps: StepData[] = [];

  for (const raw of content.split('\n')) {
    if (raw.startsWith('## ')) {
      steps.push({ title: raw.slice(3).trim(), caption: [], lines: [] });
      continue;
    }
    const step = steps[steps.length - 1];
    if (!step) continue;
    if (raw.startsWith('> ')) {
      step.caption.push(raw.slice(2).trim());
      continue;
    }
    if (!raw.trim()) {
      if (step.lines.length > 0) step.lines.push({ marker: ' ', text: '', note: '' });
      continue;
    }
    const marker = raw.startsWith('+ ') ? '+' : raw.startsWith('- ') ? '-' : ' ';
    const body = marker === ' ' ? (raw.startsWith('  ') ? raw.slice(2) : raw) : raw.slice(2);
    const split = body.match(/^(.*?\S)(\s{3,})(.*)$/);
    step.lines.push({
      marker,
      text: split ? split[1] + split[2] : body,
      note: split ? split[3] : '',
    });
  }

  for (const step of steps) {
    while (step.lines.length > 0 && step.lines[step.lines.length - 1].text === '') {
      step.lines.pop();
    }
  }
  return steps;
}

export function FileSteps({ content }: { content: string }) {
  const steps = useMemo(() => parseSteps(content), [content]);
  const [index, setIndex] = useState(0);
  const id = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  if (steps.length === 0) return null;

  const select = (next: number, focusTab: boolean) => {
    const clamped = Math.max(0, Math.min(steps.length - 1, next));
    setIndex(clamped);
    if (focusTab) tabRefs.current[clamped]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'PRE') return; // leave keyboard scrolling of the tree alone
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = index - 1;
    else if (e.key === 'ArrowRight') next = index + 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = steps.length - 1;
    if (next === null) return;
    e.preventDefault();
    select(next, target.closest('[role="tablist"]') !== null);
  };

  return (
    <figure
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="File steps, use arrow keys to change step"
      className="my-6 rounded-none border border-fd-border font-mono focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#A64F2C] dark:focus-visible:outline-[#D89074]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-fd-border px-4 py-2">
        <div className="flex items-center gap-1 text-xs" role="tablist" aria-label="Steps">
          {steps.map((s, i) => (
            <span key={i} className="flex items-center">
              {i > 0 && <span aria-hidden="true" className="px-1 text-fd-muted-foreground">/</span>}
              <button
                type="button"
                role="tab"
                id={`${id}-tab-${i}`}
                aria-controls={`${id}-panel-${i}`}
                aria-selected={i === index}
                aria-label={`Step ${i + 1}: ${s.title}`}
                tabIndex={i === index ? 0 : -1}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                onClick={() => select(i, false)}
                className={`rounded-none px-1.5 py-0.5 tabular-nums ${
                  i === index ? `${ACCENT} font-semibold` : 'text-fd-muted-foreground hover:text-fd-foreground'
                }`}
              >
                {i + 1}
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-widest">
          <button
            type="button"
            onClick={() => select(index - 1, false)}
            disabled={index === 0}
            className="rounded-none border border-fd-border px-2 py-0.5 text-fd-muted-foreground hover:text-fd-foreground disabled:cursor-default disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => select(index + 1, false)}
            disabled={index === steps.length - 1}
            className="rounded-none border border-fd-border px-2 py-0.5 text-fd-muted-foreground hover:text-fd-foreground disabled:cursor-default disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid">
        {steps.map((step, i) => (
          <div
            key={i}
            role="tabpanel"
            id={`${id}-panel-${i}`}
            aria-labelledby={`${id}-tab-${i}`}
            aria-hidden={i !== index}
            className={`col-start-1 row-start-1 px-4 py-3 ${i === index ? '' : 'invisible'}`}
          >
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em]">
              <span className={ACCENT}>Step {i + 1}</span>
              <span aria-hidden="true" className="px-2 text-fd-muted-foreground">·</span>
              <span className="text-fd-foreground">{step.title}</span>
            </div>

            {step.caption.length > 0 && (
              <p className="mt-2 max-w-prose text-[0.8rem] leading-6 text-fd-foreground">
                {step.caption.join(' ')}
              </p>
            )}

            <pre className="mt-3 overflow-x-auto text-[0.8rem] leading-6">
              {step.lines.map((line, j) => (
                <div
                  key={j}
                  className={
                    line.marker === '+'
                      ? ACCENT
                      : line.marker === '-'
                        ? 'text-fd-muted-foreground line-through'
                        : 'text-fd-foreground'
                  }
                >
                  <span aria-hidden="true" className="select-none pr-2 opacity-70">
                    {line.marker === ' ' ? ' ' : line.marker}
                  </span>
                  {line.text}
                  {line.note && <span className="text-fd-muted-foreground">{line.note}</span>}
                </div>
              ))}
            </pre>
          </div>
        ))}
      </div>
    </figure>
  );
}
