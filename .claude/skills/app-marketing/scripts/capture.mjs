#!/usr/bin/env node
/**
 * Runs a shot list against a booted, prepared emulator/device and saves one
 * PNG per shot. App-agnostic: all app-specific detail (what to tap, which
 * deep link to open) lives in the shot list JSON, not in this script.
 *
 * Shot list schema (array of):
 *   {
 *     "name": "reminders-list",                 // used as <out>/<name>.png
 *     "theme": "light" | "dark",                // optional, default "light"
 *     "deepLink": "atplace://(tabs)/home",       // optional: `adb shell am start -a android.intent.action.VIEW -d <link>`
 *     "steps": [                                 // optional, run after deepLink (or instead of it)
 *       { "action": "tap", "text": "Add place" },     // match by text/desc/id (see lib/adb.mjs findNode)
 *       { "action": "tap", "desc": "Settings tab" },
 *       { "action": "back" },
 *       { "action": "wait", "ms": 1000 }
 *     ]
 *   }
 *
 * Each step's `tap` dumps the current UI (uiautomator), finds the node, and
 * taps its center — no hard-coded coordinates, so shots survive layout
 * changes. A step that can't find its target is reported as a failure for
 * that shot (the shot is still attempted so partial progress is visible);
 * Claude is expected to read the resulting PNG and re-run/adjust the shot
 * list if the capture doesn't show what was intended.
 *
 * Usage: node capture.mjs --shots <shots.json> --out <dir> [--package <pkg>] [--serial <s>]
 * Output: one JSON summary object on stdout: { results: [{name, ok, path, error}] }
 */
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { adb, dumpUi, findNode, pressBack, resolveSdk, screencap, tapNode, waitIdle } from "./lib/adb.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

async function runStep(sdk, serial, step) {
  if (step.action === "wait") {
    await new Promise((r) => setTimeout(r, step.ms ?? 1000));
    return { ok: true };
  }
  if (step.action === "back") {
    await pressBack(sdk, serial);
    await waitIdle(sdk, serial);
    return { ok: true };
  }
  if (step.action === "tap") {
    const dump = await dumpUi(sdk, serial);
    if (!dump.ok) return { ok: false, error: dump.error };
    const node = findNode(dump.nodes, { text: step.text, desc: step.desc, id: step.id });
    if (!node) {
      return {
        ok: false,
        error: `No node matched {text:${step.text ?? "-"}, desc:${step.desc ?? "-"}, id:${step.id ?? "-"}}`,
      };
    }
    await tapNode(sdk, serial, node);
    await waitIdle(sdk, serial);
    return { ok: true };
  }
  return { ok: false, error: `Unknown step action: ${step.action}` };
}

async function runShot(sdk, serial, shot, outDir) {
  if (shot.theme) {
    await adb(sdk, ["shell", "cmd", "uimode", "night", shot.theme === "dark" ? "yes" : "no"], { serial });
    await waitIdle(sdk, serial, { timeoutMs: 1000 });
  }

  if (shot.deepLink) {
    const res = await adb(
      sdk,
      ["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", shot.deepLink],
      { serial },
    );
    if (res.code !== 0) return { name: shot.name, ok: false, error: `deep link failed: ${res.stderr}` };
    await waitIdle(sdk, serial, { timeoutMs: 1500 });
  }

  for (const step of shot.steps ?? []) {
    const res = await runStep(sdk, serial, step);
    if (!res.ok) return { name: shot.name, ok: false, error: `step ${JSON.stringify(step)}: ${res.error}` };
  }

  const outPath = path.join(outDir, `${shot.name}.png`);
  const shot_result = await screencap(sdk, serial, outPath);
  if (!shot_result.ok) return { name: shot.name, ok: false, error: shot_result.error };
  return { name: shot.name, ok: true, path: outPath, bytes: shot_result.bytes };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.shots || !args.out) {
    console.error(JSON.stringify({ error: "Usage: capture.mjs --shots <shots.json> --out <dir> [--serial <s>]" }));
    process.exitCode = 1;
    return;
  }
  const sdk = resolveSdk();
  if (!sdk.ok) {
    console.error(JSON.stringify({ error: sdk.error }));
    process.exitCode = 1;
    return;
  }
  const serial = typeof args.serial === "string" ? args.serial : undefined;
  const shots = JSON.parse(readFileSync(path.resolve(args.shots), "utf8"));
  mkdirSync(path.resolve(args.out), { recursive: true });

  const results = [];
  for (const shot of shots) {
    results.push(await runShot(sdk, serial, shot, path.resolve(args.out)));
  }

  console.log(JSON.stringify({ results }, null, 2));
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err?.stack ?? err) }));
  process.exitCode = 1;
});
