# Existing codebases

> Bring OpenSpec to a codebase with a lot of code and no specs: where to start, what to do with requirements written elsewhere, and when to write specs for existing code.

OpenSpec works in a brownfield codebase, one with a lot of code and no specs. [Set up your project](../start/setup.md), then take your next change through the [Quickstart](../start/quickstart.md).

## Start with your next change

`openspec init` creates an empty `openspec/specs/` folder, and you can leave it empty. A change describes only what it adds or modifies, so it doesn't need a spec for the rest of the system.

Pick a change you were going to make anyway. Your agent reads the code that change touches and plans against it. When you archive the change, its requirements become the first spec in `openspec/specs/`.

Every change after that adds the behavior it touched. The parts of the system you work on most get specs first.

## Use the requirements you already have

Keep your PRD, design doc, or wiki page where it is. Point your agent at it when a change needs it. In your AI chat:

```text
Propose a change to add account unlock by email.
The requirements are in docs/prd/account-security.md, section 4.
```

The agent writes that change's requirements from the section you named.

Don't convert the whole document into specs. `openspec/specs/` describes what your system does today, and a PRD describes what someone planned. Converting it fills the folder with requirements nobody has checked against the code.

## Write specs for existing code

Write a spec for an existing area when you're about to use it: before you add tests there, document it, or hand it to someone new. Don't write specs for the whole codebase before you start.

Each spec needs a review from someone who knows the code. People and agents treat whatever is in `openspec/specs/` as true, so a mistake in a spec ends up in the tests and code written from it.

In our test runs, agents got the main behavior right and overstated some edge cases. One spec said every bad token is rejected, when a token that isn't a string crashes the handler.

To write one, ask for a change that only documents the area. In your AI chat:

```text
Propose a change that documents how password reset works today.
Read the code and write the spec from what it does. Don't change any code.
If something looks like a bug, tell me and leave it out of the spec.
```

The agent writes the spec and tells you which bugs it suspects. Check the spec against the code, then ask your agent to apply and archive the change. There's no code to write, so the tasks only check the spec. Archiving puts the spec in `openspec/specs/`.
