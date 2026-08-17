---
name: dead-code-scan
description: Review modified code for unused or obsolete code.
---

Review all modified files for dead code.

Checklist:

- Remove unused methods, classes, fields, properties, local variables, and using directives.
- Remove unreachable code.
- Remove obsolete or commented-out code unless intentionally retained.
- Identify redundant code introduced during refactoring.
- Explain any code that appears unused but should be retained (e.g., reflection, DI, XAML binding, serialization, source generators).

Do not make functional changes unrelated to dead code.
