---
name: impact-analysis
description: Assess the blast radius of a planned change before implementation — flags larger changes, business-logic changes, and breaking changes so they can be surfaced before code is written. Run at the start of every task in this repository.
---

# Impact Analysis

## Purpose

Before touching any code, work out what a task actually affects and call out anything risky, so bigger or breaking changes are visible up front instead of discovered after the fact.

## When to run

Run this first, before writing or editing any code, for every task — not only when the user asks for a review. Trivial one-line copy/style tweaks with no logic or data implications can skip straight to a one-line note (see Output format).

## What to assess

- **Scope** — which layers are touched (`db/`, `services/`, `store/`, `screens/`, `components/`, `types/`) and roughly how many files/functions.
- **Data & schema** — any change to SQLite schema, migrations, AsyncStorage keys, or the shape of persisted data (e.g. `WarrantyItem`). Per CLAUDE.md: never drop user tables, always preserve existing data, new columns need sensible defaults.
- **Business logic** — warranty expiry calculation, reminder scheduling (30/7/0-day notifications), invoice image handling/compression, backup logic, or any other domain rule.
- **Breaking changes** — changes to exported function signatures, shared TypeScript types/interfaces, navigation routes/params, or anything that could break existing installed data, in-flight app state, or code that calls into the changed area.
- **Cross-cutting effects** — notifications, file storage paths/URIs, Zustand store shape (must stay reconstructable from SQLite), dependency additions.

## Severity levels

- **Low** — isolated UI tweak or copy change, no schema/logic change, no persisted-data implications.
- **Medium** — new business logic, new store/service function, non-breaking schema addition (new column with default), new dependency.
- **High** — schema change affecting existing data, breaking change to a public function/type, migration required, changes to notification scheduling logic, anything that could lose, corrupt, or silently misinterpret existing warranty data.

## Output format

Before implementation begins, report:

```
**Impact Analysis**
- Scope: <files/layers touched>
- Severity: Low / Medium / High
- Business logic changes: <list, or "None">
- Breaking changes: <list, or "None">
- Data/migration risk: <list, or "None">
- Recommendation: <proceed / confirm approach with user first / needs explicit migration plan>
```

For genuinely trivial Low-severity tasks, a single line ("Impact: low — isolated UI tweak, no schema/logic/breaking changes.") is enough; don't pad it into the full block.

## Rule of thumb

If severity is **Medium or High**, pause and confirm the approach with the user before making changes, per CLAUDE.md's migration and error-handling guidance. If severity is **Low**, state it briefly and proceed without waiting for confirmation.

## Unblocking edits (required last step)

This repo enforces the above with hooks (`.claude/settings.json`): every `Edit`/`Write`/`NotebookEdit` call is blocked by a `PreToolUse` hook until a marker file exists, and that marker is cleared automatically at the start of every new task by a `UserPromptSubmit` hook. After reporting the impact analysis (full block or one-line note), create the marker **via Bash, not Edit/Write**:

```bash
node .claude/hooks/mark-impact-analysis-done.js
```

Do this once per task, right after the report and before the first `Edit`/`Write`/`NotebookEdit` call. If an edit is denied with a message about impact analysis, it means this step was skipped or the marker was cleared by a new turn — run the analysis (or re-confirm it still holds) and recreate the marker before retrying.
