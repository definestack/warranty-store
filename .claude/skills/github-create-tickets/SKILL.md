---
name: github-create-tickets
description: Create and synchronize GitHub Issues from feature requirements, OpenSpec changes, implementation plans, or task lists. Use when the user asks to create GitHub tickets or issues for development work.
---

# GitHub Ticket Creator

Create well-scoped GitHub Issues from planned development work.

GitHub Issues are the project's execution queue.

The skill converts requirements or implementation tasks into actionable,
traceable GitHub Issues without implementing the code.

## Goals

- Convert planned work into actionable GitHub Issues.
- Keep each issue independently understandable.
- Preserve the original requirements and intent.
- Include clear acceptance criteria.
- Identify genuine dependencies between issues.
- Avoid duplicate issues.
- Maintain traceability to the source requirements.
- Do not implement code.

## Input Sources

The source may be:

1. An OpenSpec change
2. An OpenSpec `tasks.md`
3. A feature requirement
4. An implementation plan
5. A user-provided task list

When OpenSpec is available, read the relevant artifacts:

- `proposal.md`
- specification files
- `design.md`
- `tasks.md`

Do not rely on `tasks.md` alone when the specification or design contains
important implementation context.

## Workflow

### 1. Determine the Repository

Identify the GitHub repository from the current project.

If the repository cannot be determined with confidence, ask the user for:

`owner/repository`

Never guess the repository.

### 2. Understand the Source

Before creating issues:

- Understand the feature or change.
- Identify logical implementation tasks.
- Identify acceptance criteria.
- Identify genuine dependencies.
- Preserve existing task identifiers where available.
- Do not invent requirements.
- Do not invent architectural decisions.

If the source is an OpenSpec change, preserve its task numbering.

### 3. Determine Issue Granularity

Create one issue per independently implementable task.

Good examples:

- Create Customer domain entity
- Add Customer repository
- Add customer creation API
- Add customer API validation
- Add customer API tests

Avoid overly broad issues such as "Implement customer management" unless the
entire feature genuinely represents one independently implementable unit.

Also avoid artificially tiny issues such as "Create Customer.cs file" or
"Add using statement". A developer should be able to understand the meaningful
outcome of an issue.

### 4. Check for Existing Issues

Before creating an issue, search GitHub for an existing issue representing
the same work.

Use:

- OpenSpec task identifier
- Feature/change name
- Task title
- Relevant keywords

An issue may already exist even if it does not have an OpenSpec reference.

Do not create duplicates.

If an existing issue clearly represents the task:

- Reuse it.
- Report it as already existing.
- Do not create another issue.

Do not modify the existing issue unless synchronization was explicitly
requested.

### 5. Create the Issue Title

Use concise, action-oriented titles.

Preferred:

- Add customer creation API
- Create Customer repository
- Add authentication validation
- Add login endpoint

Avoid:

- Task 1.3
- Changes required
- Implement stuff
- Work on authentication

The title should describe the outcome of the work.

### 6. Create the Issue Body

Use this structure:

## OpenSpec Task

`<task identifier>`

## Summary

<short description of what needs to be implemented>

## Context

<relevant context from the specification or design>

## Requirements

- <requirement>
- <requirement>
- <requirement>

## Acceptance Criteria

- [ ] <criterion>
- [ ] <criterion>
- [ ] <criterion>

## Dependencies

- Depends on #<issue>
- Depends on #<issue>

If there are no dependencies:

None

## Specification

**OpenSpec Change:** `<change name>`

**Task:** `<task identifier>`

**Specification:** `<direct GitHub link to the relevant specification artifact>`

**Design:** `<direct GitHub link to design.md, when applicable>`

**Tasks:** `<direct GitHub link to tasks.md, when applicable>`

For non-OpenSpec work, replace this section with an appropriate direct link
to the source requirement, design document, or implementation plan.

### Specification Reference Rule

Every GitHub Issue created from an OpenSpec change MUST contain a direct,
clickable GitHub link to the relevant specification artifact.

When a design artifact materially affects the task, also include a direct
link to the design artifact.

When the task is represented in `tasks.md`, include a direct link to the
tasks file as well.

Do not merely provide repository-relative paths when a GitHub URL can be
constructed.

The specification is the authoritative source for detailed feature intent
and behavior. The GitHub Issue is the execution unit and should summarize
the relevant requirements rather than duplicating the entire specification.

### Constructing GitHub Links

Determine the repository's GitHub URL and the branch/ref containing the
OpenSpec artifacts.

Use links in this form:

`https://github.com/<owner>/<repo>/blob/<ref>/<path>`

Prefer the repository's default branch when the OpenSpec change is already
committed there.

If the OpenSpec change exists only on the current working branch and the
branch is available on GitHub, use that branch.

If a valid GitHub URL cannot be determined, report the missing information
instead of inventing a URL.

### Important

Do not copy the entire OpenSpec specification into every issue.

The GitHub Issue should contain enough context for implementation while the
full specification remains the authoritative source for feature intent.

Always provide the direct specification link when the source is OpenSpec.

### 7. Acceptance Criteria

Acceptance criteria must describe observable outcomes.

Good examples:

- [ ] API returns 201 when a customer is successfully created.
- [ ] Duplicate customer email addresses are rejected.
- [ ] Invalid email addresses return a validation error.
- [ ] Automated tests cover success and failure cases.

Avoid vague criteria:

- [ ] API works
- [ ] Code is good
- [ ] Add proper validation

Derive acceptance criteria from the source requirements.

Do not introduce new behavior merely to make the criteria more detailed.

### 8. Labels

Use existing repository labels when appropriate.

Prefer labels such as:

- feature
- enhancement
- bug
- refactor
- testing
- documentation

Do not assume a label exists.

Do not create new labels unless the user explicitly asks for them.

If no appropriate existing label is available, omit the label.

### 9. Dependencies

Determine dependencies from the actual implementation requirements.

For example:

1.1 Create User entity
1.2 Create User repository
1.3 Create authentication service

If the repository requires the entity:

#102 depends on #101

If the authentication service requires the repository:

#103 depends on #102

Do not assume task ordering automatically means dependency.

Only establish a dependency when the later task genuinely requires the earlier
task.

### 10. Create Issues

Create one GitHub Issue for each task that does not already have a
corresponding issue.

For each issue:

- Create exactly one issue.
- Use the approved title format.
- Include summary and context.
- Include requirements.
- Include acceptance criteria.
- Include known dependencies.
- Include source traceability.
- Apply appropriate existing labels.

Do not:

- Implement code.
- Close issues.
- Modify unrelated issues.
- Invent requirements.
- Invent dependencies.

### 11. Handle Dependencies After Creation

Dependency issue numbers may not be known until all issues have been created.

For example:

Create User entity      -> #101
Create User repository  -> #102
Authentication service  -> #103

After creation, update the relevant issue bodies:

## Dependencies

Depends on #101

and:

## Dependencies

Depends on #102

Do not modify dependency issues themselves.

### 12. Synchronize OpenSpec Tasks

If the source is an OpenSpec `tasks.md`, update the corresponding tasks with
their GitHub Issue numbers.

Before:

- [ ] 1.1 Create User entity
- [ ] 1.2 Create User repository
- [ ] 1.3 Create authentication service

After:

- [ ] 1.1 Create User entity
      GitHub: #101

- [ ] 1.2 Create User repository
      GitHub: #102

- [ ] 1.3 Create authentication service
      GitHub: #103

Do NOT mark the tasks as completed.

Creating an issue means the work has been planned, not completed.

### 13. Existing Issue Handling

If a corresponding issue already exists:

- Do not create another issue.
- Report the existing issue.
- Associate it with the source task if possible.
- Leave the existing issue unchanged unless synchronization was requested.

If an existing issue appears to partially match the task but its scope is
unclear, do not assume it is the same task. Report the ambiguity.

### 14. Idempotency

Running this skill multiple times must not create duplicate issues.

For example, if:

1.1 -> #101
1.2 -> #102
1.3 -> #103

already exists, running the skill again should result in:

No new issues created.

Existing:
1.1 -> #101
1.2 -> #102
1.3 -> #103

The skill should safely support repeated execution.

### 15. Preview / Dry Run

If the user requests:

- preview
- dry run
- plan first
- show me what will be created

do NOT create or modify GitHub Issues.

Instead show a table containing:

- task
- proposed issue title
- dependencies
- whether a matching issue already exists

Then ask the user whether to proceed.

### 16. Synchronization Mode

If the user explicitly asks to synchronize existing issues with the
OpenSpec change:

- Compare existing issues with the current OpenSpec tasks.
- Update issue descriptions where the source requirements have changed.
- Preserve manually added information unless it conflicts with the current
  specification.
- Do not close issues automatically.
- Report all changes made.

Normal ticket creation must NOT modify existing issues.

### 17. Final Report

After creating or synchronizing issues, provide a concise report.

Example:

Created:
- #101 — Create User entity
- #102 — Create User repository
- #103 — Add authentication service

Already existed:
- #104 — Add login endpoint

Dependencies:
- #102 -> #101
- #103 -> #102
- #104 -> #103

OpenSpec:
- tasks.md updated with GitHub issue references.

If no issues were created:

No new GitHub issues were created.

All OpenSpec tasks already have corresponding GitHub issues.

## Safety Rules

Never:

- Implement code.
- Commit code.
- Push code.
- Close issues.
- Create duplicate issues.
- Invent requirements.
- Invent acceptance criteria that change behavior.
- Invent dependencies.
- Create labels without permission.
- Modify unrelated issues.
- Mark OpenSpec tasks complete merely because issues were created.

The purpose of this skill is strictly:

Requirements / OpenSpec
        |
        v
GitHub Issues

It is not an implementation skill.
