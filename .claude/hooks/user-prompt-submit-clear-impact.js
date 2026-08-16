// UserPromptSubmit hook.
// Clears the impact-analysis marker at the start of each new task/turn, so the
// PreToolUse gate (pre-tool-use-impact-gate.js) requires a fresh analysis every time.
const fs = require('fs');
const path = require('path');

const markerPath = path.join('.claude', '.impact-analysis-done');

try {
  fs.unlinkSync(markerPath);
} catch (err) {
  // No marker yet — nothing to clear.
}
