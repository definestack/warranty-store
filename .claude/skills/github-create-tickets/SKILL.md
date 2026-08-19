---
name: github-create-tickets
description: Create and synchronize GitHub Issues from feature requirements, OpenSpec changes, implementation plans, or task lists. Use when the user asks to create GitHub tickets or issues for development work.
---

# GitHub Ticket Creator

Turn development requirements into well-scoped GitHub Issues. Issues are the project's
execution queue; the source requirements remain the authoritative record of intent.

This is not an implementation skill. It plans work — it never writes the code.

## Sources

The source may be an OpenSpec change, an OpenSpec `tasks.md`, a feature requirement, an
implementation plan, or a plain list of tasks.

When the source is an OpenSpec change, read `proposal.md`, the spec files, `design.md`,
and `tasks.md`. Do not work from `tasks.md` alone — the *why* and the acceptance criteria
usually live in the proposal and specs, and issues written without them lose the intent.

## Workflow

### 1. Determine the repository

Read it from the current project (`gh repo view`). If it cannot be determined, ask the
user for `owner/repository`. Never guess.

### 2. Understand the work

Identify the logical tasks, their real dependencies, and the acceptance criteria implied
by the source. Preserve OpenSpec task numbering (`1.1`, `1.2`, `2.1`). Do not invent
requirements.

### 3. Check for existing issues

Search before creating anything, using the task identifier, the change name, the task
title, and relevant keywords. An issue may already exist without any OpenSpec reference.

- If an issue clearly represents the task: reuse it, report it as already existing, and
  leave it unchanged unless synchronization was explicitly requested.
- If an issue only partially matches and the scope is unclear: report the ambiguity. Do
  not assume it is the same task, and do not create a second issue until the user decides.

Doing this properly is what makes the skill safe to run repeatedly — a second run over an
already-ticketed change should create nothing.

### 4. Decide granularity

One issue per independently implementable task — work that can be built, reviewed, and
merged on its own without leaving the repository in a broken state.

Do not split work into artificially tiny issues, and do not bundle a whole feature into
one vague ticket. A small change may legitimately be a single issue; say so rather than
manufacturing a split.

### 5. Write the title

Concise and action-oriented: `Add customer creation API`, `Create Customer repository`.

Not `Task 1.3`, not `Implement stuff`. Follow the repository's existing title convention
if it has one.

### 6. Write the body

```markdown
## Source Task

`<task identifier>`

## Summary

<what needs to be implemented>

## Context

<why this matters; constraints from the spec or design that affect implementation>

## Requirements

- <requirement>

## Acceptance Criteria

- [ ] <observable outcome>

## Dependencies

Depends on #<issue>          <!-- or: None -->

## Source

Change: <name>
Task: <identifier>
Specification: <link>
```

Include enough for someone to implement without reading the full specification, but do not
copy the specification into the issue. Link to it instead — the spec stays authoritative
for feature intent, the issue is the unit of execution.

**Acceptance criteria** must be observable outcomes: *"API returns 201 when a customer is
created"*, *"Duplicate emails are rejected"*. Not *"API works"* or *"Code is good"*. Derive
them from the source requirements; never invent behavior just to make the list longer.

**Labels**: use existing repository labels only. Check what exists (`gh label list`) rather
than assuming. Prefer `feature`, `enhancement`, `bug`, `refactor`, `testing`,
`documentation` when present. Omit rather than approximate, and never create a label unless
the user explicitly asks.

**Dependencies**: only when a task genuinely requires another's output. Sequential
numbering is not dependency — `1.2` following `1.1` proves nothing. If two tasks touch
different files and each leaves the build green, they are independent; say so.

### 7. Link to the source

When the source is OpenSpec, always link the specification directly:

`https://github.com/<owner>/<repo>/blob/<ref>/<path>`

Choose `<ref>` in this order:

1. The default branch, if the artifacts are already committed there.
2. The current working branch, if it is pushed and available on GitHub.
3. Neither — the artifacts exist only locally. Do not invent a URL. Either create the
   issues without links and say why, or ask the user whether to push first.

Note in the issue when links point at a working branch, since they break if that branch is
deleted after merge.

### 8. Create the issues

One issue per task identified in step 4, skipping any covered by step 3. Apply the title,
body, and labels above.

### 9. Backfill dependencies

Issue numbers are unknown until every issue exists, so resolve cross-references in a second
pass: update each issue's Dependencies section with the real numbers. Update only the
issues this run created — never the issues they depend on.

### 10. Synchronize the source tasks

When the source is an OpenSpec `tasks.md`, annotate each task with its issue:

```markdown
- [ ] 1.1 Create User entity
      GitHub: #101
```

Do **not** check the boxes. An issue means the work is planned, not done.

Edit `tasks.md` in the working tree and leave it there. Committing is the user's call —
this skill does not commit or push.

### 11. Report

```text
Created:
- #101 — Create User entity

Already existed:
- #104 — Add login endpoint

Dependencies:
- #102 depends on #101

Source:
- tasks.md updated with issue references
```

If nothing was created, say so plainly and list the existing issue for each task.

## Modes

**Preview / dry run** — when the user asks to preview, plan first, do a dry run, or see
what would be created: create and modify nothing. Show a table of task, proposed title,
dependencies, and whether a matching issue already exists. Then ask whether to proceed.

**Synchronization** — when the user explicitly asks to sync existing issues with a changed
source: compare existing issues against the current tasks, update descriptions where the
requirements have changed, preserve manually added content unless it contradicts the
source, never close issues, and report every change made. Normal creation must not modify
existing issues.

## Never

- Implement, commit, or push code.
- Close issues, or modify issues unrelated to this run.
- Create duplicate issues.
- Create labels without explicit permission.
- Invent requirements, acceptance criteria, or dependencies.
- Mark source tasks complete because an issue exists.
