# Full drafting process (opt-in)

The evidence-first, checkpointed way to draft a page. Use this only when the user asks for the deep process; the default mode is SKILL.md alone.

## Orient (every session, before any writing)

1. Read the README at the root of the docs tree you're writing in. Where it states invariants or a page map, it wins over this skill.
2. Read the target page top to bottom, plus anything its comments cite.
3. Read the sibling pages this page links to or overlaps with, enough to know what must stay a link rather than become an explanation.
4. Write down the page's job in one line: who arrives, trying to do what, and what they leave able to do. If the page carries a job statement (docs-lab pages use a `>` blockquote under the title), test against it. If the unit you're about to write doesn't serve that job, stop and raise it instead of drafting around it.

## Work in small units

- The default unit is one `##` section. A page is several sittings, not one.
- For revisions to existing prose, the unit is the requested change, however many headings it touches.
- Draft the next unit only after the user has reviewed the current one. When the user asks for fixes, fix only that; don't smuggle in the next unit.

## Evidence before prose

Before drafting a unit, know where its claims come from.

- Run the terminal commands the unit will show when they're cheap: read-only commands anywhere, anything that mutates state in a scratch directory or not at all. Paste real output; trim it, never retouch it.
- Check names against source: flags, paths, config keys, and defaults come from `src/` and the CLI's own help, not from older docs. When docs and source disagree, source wins; note the conflict for the user.
- Never bridge a gap with a plausible-sounding sentence. A claim you couldn't check gets flagged at the checkpoint, not silently shipped. Don't let one expensive check stall the draft.

## Strip the slop

Invoke the `no-ai-slop` skill on the drafted unit and apply its edit pass. Docs prose gets no exemption: the patterns it names read as machine-written to exactly the audience these docs must win over.

## Does it do the job?

Reread the unit cold, as the reader the job line names, arriving with their actual problem. Answer three questions:

1. Can they act? Every step is runnable as written, and nothing depends on knowledge the page hasn't given or linked.
2. Do they know it worked? Where success could be in doubt, the unit shows something visible: output, a file, what the agent does next. Where the outcome is obvious, no success line is owed.
3. What can they do now that they couldn't before? If the honest answer is "they read some context", the unit is explaining instead of solving; cut it back to what serves the job or raise it with the user.

A unit that fails here gets fixed before the checkpoint, not annotated.

## Checkpoint

End the unit by showing the user:

- the file path and the unit written;
- the page's job in one line, and what this unit lets the reader do toward it;
- which claims you checked and how (commands run, files read);
- any claim still unchecked.

Then stop. The next unit starts when the user says so.
