// Run via Bash (not Edit/Write) as the final step of the impact-analysis skill,
// after reporting scope/severity/business-logic/breaking-change/migration risk.
// Creates the marker that the PreToolUse gate (pre-tool-use-impact-gate.js) checks for.
const fs = require('fs');
const path = require('path');

const dir = '.claude';
const markerPath = path.join(dir, '.impact-analysis-done');

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(markerPath, new Date().toISOString());
console.log('impact-analysis marker created');
