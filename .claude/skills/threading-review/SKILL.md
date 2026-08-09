---
name: threading-review
description: Review modified code for threading and concurrency issues.
---

Review all modified files for threading issues.

Checklist:
- Identify race conditions.
- Verify thread safety of shared state.
- Check lock usage and lock scope.
- Detect possible deadlocks.
- Verify async/await usage.
- Check cancellation token propagation.
- Identify blocking calls on async code.
- Review event raising across threads.
- Verify thread-safe collection usage.
- Highlight potential UI thread violations.

Do not change behavior unless necessary to fix a threading issue.