# Lite eligibility decision table

`atd-change-triage` evaluates every condition below. **Lite applies only when
ALL conditions pass. Any failure or uncertainty routes to the full `atd-sdlc`
schema.**

| # | Condition |
|---|-----------|
| 1 | Single repository and single component |
| 2 | Small, localized file impact |
| 3 | Restores existing intended behavior (no new behavior) |
| 4 | Existing acceptance criteria, specification, or test already defines the behavior |
| 5 | No API contract change |
| 6 | No database/schema/data migration |
| 7 | No authentication, authorization, security, privacy, or compliance impact |
| 8 | No cross-service integration behavior change |
| 9 | No new dependency |
| 10 | No deployment or infrastructure change |
| 11 | Straightforward automated regression test exists or is easy to add |
| 12 | Trivial rollback |
| 13 | No new functional or technical documentation needed (localized corrections to existing docs stay lite-eligible) |

Note on condition 13: "new documentation" means a new solution document or
durable doc set. Localized corrections to existing documentation remain
lite-eligible only while they do not reveal a full-workflow impact.

## Risk, never line count

Classification is risk-based. A one-line change is NOT automatically lite.
One-liners that always route full:

- **Authorization conditions** — a flipped `&&`/`||` in an access check.
- **SQL predicates** — a changed `WHERE` clause.
- **Financial calculations** — rounding, rates, totals.

## Bounded preflight (mandatory before recommending lite)

Conditions 1, 2, 4, 5–11 cannot be reliably determined from Jira text alone.
Before classifying, inspect the codebase — scoped to the ticket, lighter than
a full `analysis.md`, only enough to classify safely:

- Locate the owning component.
- Inspect the relevant entry points and call path.
- Identify existing tests or specifications covering the behavior.
- Check for API contract, data, security, dependency, integration, and
  deployment impact.

Anything not verifiable from the ticket or the inspected code is **uncertain**
and routes full.

## Monotonic override policy

- Triage recommends **lite** → developer may choose lite or strengthen to full.
- Triage recommends **full** → full is mandatory. A downgrade request is
  declined, quoting the failed or uncertain conditions.
- After creation, escalation is one-way: lite → full only (see the lite
  schema's analysis and apply instructions). Full → lite is never supported
  once planning artifacts exist.

## Audit trail

Every triage decision is recorded in a `triage.md` sidecar in the change
directory: the recommendation, each condition's evaluation, and the confirmed
choice. Escalations append their trigger and schema transition. Pilot metrics
(lite/full selection rate, escalation rate) are sourced from these records.
