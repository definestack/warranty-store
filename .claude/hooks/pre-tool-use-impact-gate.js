// PreToolUse hook (matcher: Edit|Write|NotebookEdit).
// Blocks file edits until the impact-analysis skill has run for this task.
// The marker is cleared each turn by user-prompt-submit-clear-impact.js.
const fs = require('fs');
const path = require('path');

const markerPath = path.join('.claude', '.impact-analysis-done');

if (!fs.existsSync(markerPath)) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        'Impact analysis has not been run for this task yet. Run the impact-analysis skill ' +
        '(.claude/skills/impact-analysis/SKILL.md) first, report scope/severity/business-logic/' +
        'breaking-change/data-migration risk, then create the marker via Bash (not Edit/Write): ' +
        '`node .claude/hooks/mark-impact-analysis-done.js`. Retry this edit afterwards.',
    },
  }));
}
