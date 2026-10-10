#!/usr/bin/env node
/**
 * Shared Android SDK / adb helpers for the `app-marketing` skill's emulator
 * and capture scripts. App-agnostic: nothing here assumes AtPlace, so this
 * whole `scripts/` directory can be copied into another repo unchanged.
 *
 * All process spawning uses `spawn` with argument arrays (never a shell
 * string), so this works the same on Windows (where `adb`/`emulator` resolve
 * to `adb.exe`/`emulator.exe`) and POSIX.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/** Resolves ANDROID_HOME/ANDROID_SDK_ROOT and the adb/emulator binaries inside it. */
export function resolveSdk() {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdkRoot || !existsSync(sdkRoot)) {
    return {
      ok: false,
      error:
        "ANDROID_HOME/ANDROID_SDK_ROOT is not set or does not exist. Install Android Studio's SDK " +
        "and set one of those environment variables to its path.",
    };
  }
  const isWin = process.platform === "win32";
  const adbPath = path.join(sdkRoot, "platform-tools", isWin ? "adb.exe" : "adb");
  const emulatorPath = path.join(sdkRoot, "emulator", isWin ? "emulator.exe" : "emulator");
  if (!existsSync(adbPath)) {
    return { ok: false, error: `adb not found at ${adbPath}. Install Android SDK Platform-Tools.` };
  }
  return { ok: true, sdkRoot, adbPath, emulatorPath: existsSync(emulatorPath) ? emulatorPath : null };
}

/** Runs a command, collecting stdout/stderr, resolving instead of throwing on a non-zero exit. */
export function run(command, args, { timeoutMs = 30000, input } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ code: null, stdout, stderr: stderr + "\n[timed out]", timedOut: true });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: String(err), timedOut: false });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut: false });
    });
    if (input !== undefined) child.stdin.write(input);
    if (child.stdin.writable) child.stdin.end();
  });
}

/** Runs `adb [-s serial] <args>`, returning {code, stdout, stderr}. */
export function adb(sdk, args, opts = {}) {
  const prefixed = opts.serial ? ["-s", opts.serial, ...args] : args;
  return run(sdk.adbPath, prefixed, opts);
}

/** Lists currently attached/booted device serials (excludes "offline"/"unauthorized"). */
export async function listDevices(sdk) {
  const { stdout } = await adb(sdk, ["devices"]);
  return stdout
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.endsWith("\tdevice"))
    .map((line) => line.split("\t")[0]);
}

/** Polls `getprop sys.boot_completed` until it reports 1, or times out. */
export async function waitForBoot(sdk, serial, { timeoutMs = 180000, intervalMs = 2000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { stdout } = await adb(sdk, ["shell", "getprop", "sys.boot_completed"], { serial });
    if (stdout.trim() === "1") return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * Parses a `uiautomator dump` XML tree into a flat array of nodes with
 * {text, desc (content-desc), id (resource-id), clickable, bounds: {x1,y1,x2,y2}}.
 * Intentionally a small regex-based scan rather than a full XML parser (no
 * new dependency) — uiautomator's node attributes never contain nested tags.
 */
export function parseUiDump(xml) {
  const nodes = [];
  const nodeRe = /<node\b[^>]*>/g;
  let match;
  while ((match = nodeRe.exec(xml))) {
    const tag = match[0];
    const attr = (name) => {
      const m = tag.match(new RegExp(`${name}="([^"]*)"`));
      return m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#10;/g, "\n") : "";
    };
    const boundsStr = attr("bounds");
    const boundsMatch = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!boundsMatch) continue;
    nodes.push({
      text: attr("text"),
      desc: attr("content-desc"),
      id: attr("resource-id"),
      clickable: attr("clickable") === "true",
      bounds: {
        x1: Number(boundsMatch[1]),
        y1: Number(boundsMatch[2]),
        x2: Number(boundsMatch[3]),
        y2: Number(boundsMatch[4]),
      },
    });
  }
  return nodes;
}

/** Dumps the current UI hierarchy on-device and pulls it back, returning parsed nodes. */
export async function dumpUi(sdk, serial) {
  const dumpPath = "/sdcard/app-marketing-ui-dump.xml";
  const dump = await adb(sdk, ["shell", "uiautomator", "dump", dumpPath], { serial, timeoutMs: 15000 });
  if (dump.code !== 0) {
    return { ok: false, error: dump.stderr || dump.stdout || "uiautomator dump failed" };
  }
  const cat = await adb(sdk, ["shell", "cat", dumpPath], { serial, timeoutMs: 15000 });
  if (cat.code !== 0 || !cat.stdout.includes("<node")) {
    return { ok: false, error: "Could not read UI dump XML from device" };
  }
  return { ok: true, nodes: parseUiDump(cat.stdout) };
}

/**
 * Finds the first node matching any of {text, desc, id} (exact match, case
 * sensitive — Android resource/content-desc strings are stable, unlike
 * coordinates which shift whenever layout changes).
 */
export function findNode(nodes, { text, desc, id } = {}) {
  return nodes.find(
    (n) =>
      (text !== undefined && n.text === text) ||
      (desc !== undefined && n.desc === desc) ||
      (id !== undefined && n.id === id),
  );
}

/** Taps the center of a node's bounds. */
export async function tapNode(sdk, serial, node) {
  const cx = Math.round((node.bounds.x1 + node.bounds.x2) / 2);
  const cy = Math.round((node.bounds.y1 + node.bounds.y2) / 2);
  return adb(sdk, ["shell", "input", "tap", String(cx), String(cy)], { serial, timeoutMs: 10000 });
}

/** Presses the device back button. */
export function pressBack(sdk, serial) {
  return adb(sdk, ["shell", "input", "keyevent", "KEYCODE_BACK"], { serial, timeoutMs: 10000 });
}

/** Captures the current screen to a local PNG file via `exec-out screencap`. */
export function screencap(sdk, serial, outPath) {
  return new Promise((resolve) => {
    const prefixed = serial ? ["-s", serial, "exec-out", "screencap", "-p"] : ["exec-out", "screencap", "-p"];
    const child = spawn(sdk.adbPath, prefixed, { windowsHide: true });
    const chunks = [];
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, error: "screencap timed out" });
    }, 20000);
    child.stdout.on("data", (c) => chunks.push(c));
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: String(err) });
    });
    child.on("close", async (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({ ok: false, error: stderr || `screencap exited ${code}` });
        return;
      }
      const buffer = Buffer.concat(chunks);
      const { writeFile } = await import("node:fs/promises");
      await writeFile(outPath, buffer);
      resolve({ ok: true, path: outPath, bytes: buffer.length });
    });
  });
}

/** Waits for the UI to stop changing (best-effort "idle"): polls dumpsys window animation state. */
export async function waitIdle(sdk, serial, { timeoutMs = 5000 } = {}) {
  // No universal "idle" signal across Android versions; a short fixed settle
  // delay after the last action is simpler and more portable than parsing
  // `dumpsys window` animation flags, which vary by OEM/version.
  await new Promise((r) => setTimeout(r, Math.min(timeoutMs, 1500)));
}
