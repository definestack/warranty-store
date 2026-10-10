#!/usr/bin/env node
/**
 * Controls an Android emulator for screenshot capture: preflight checks,
 * boot, demo-mode/permission/locale/theme setup, and teardown. App-agnostic
 * (the Android package to prep is passed with `--package`).
 *
 * Subcommands:
 *   doctor                           Check SDK/adb/emulator/AVDs/Java are available.
 *   list                             List available AVDs and attached devices.
 *   boot --avd <name> [--serial <s>] Boot an AVD (or attach to a running one) and
 *                                    wait for it to finish booting.
 *   prepare --package <pkg> [--permissions <csv>] [--serial <s>]
 *                                    Grant runtime permissions and enable clean
 *                                    "demo mode" status bar + disabled animations.
 *   geo --lat <n> --lon <n> [--serial <s>]
 *                                    Set a fixed mock GPS location.
 *   theme <light|dark> [--serial <s>]
 *                                    Switch system dark mode.
 *   teardown [--serial <s>] [--kill] Restore demo mode/animations; optionally
 *                                    kill the emulator (left running by default).
 *
 * Every subcommand prints one JSON object to stdout and exits non-zero on failure.
 */
import { adb, listDevices, resolveSdk, run, waitForBoot } from "./lib/adb.mjs";

function parseArgs(argv) {
  const [sub, ...rest] = argv;
  const args = { _: sub, positionals: [] };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith("--")) {
      const key = rest[i].slice(2);
      const next = rest[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      args.positionals.push(rest[i]);
    }
  }
  return args;
}

function printAndExit(obj, ok = true) {
  console.log(JSON.stringify(obj, null, 2));
  if (!ok) process.exitCode = 1;
}

async function doctor() {
  const sdk = resolveSdk();
  if (!sdk.ok) return printAndExit({ ok: false, error: sdk.error }, false);

  const java = await run(process.platform === "win32" ? "where" : "which", ["java"]);
  const devices = await listDevices(sdk);
  const avds = sdk.emulatorPath ? await run(sdk.emulatorPath, ["-list-avds"]) : { stdout: "" };
  const avdNames = avds.stdout.split("\n").map((l) => l.trim()).filter(Boolean);

  const problems = [];
  if (java.code !== 0) problems.push("Java not found on PATH (required by the Android SDK tools).");
  if (!sdk.emulatorPath) problems.push("emulator binary not found under $ANDROID_HOME/emulator.");
  if (avdNames.length === 0 && devices.length === 0) {
    problems.push("No AVDs configured and no device/emulator currently attached.");
  }

  printAndExit(
    {
      ok: problems.length === 0,
      sdkRoot: sdk.sdkRoot,
      javaFound: java.code === 0,
      avds: avdNames,
      attachedDevices: devices,
      problems,
    },
    problems.length === 0,
  );
}

async function list() {
  const sdk = resolveSdk();
  if (!sdk.ok) return printAndExit({ ok: false, error: sdk.error }, false);
  const devices = await listDevices(sdk);
  const avds = sdk.emulatorPath ? await run(sdk.emulatorPath, ["-list-avds"]) : { stdout: "" };
  printAndExit({
    ok: true,
    avds: avds.stdout.split("\n").map((l) => l.trim()).filter(Boolean),
    attachedDevices: devices,
  });
}

async function boot(args) {
  const sdk = resolveSdk();
  if (!sdk.ok) return printAndExit({ ok: false, error: sdk.error }, false);

  let serial = typeof args.serial === "string" ? args.serial : null;

  if (!serial) {
    if (!args.avd || typeof args.avd !== "string") {
      return printAndExit({ ok: false, error: "Pass --avd <name> or --serial <existing-device>" }, false);
    }
    if (!sdk.emulatorPath) return printAndExit({ ok: false, error: "emulator binary not found" }, false);
    const before = new Set(await listDevices(sdk));
    // Detached, long-lived process: the emulator keeps running after this
    // script exits so later `capture.mjs`/`teardown` calls can attach to it.
    const { spawn } = await import("node:child_process");
    const child = spawn(sdk.emulatorPath, ["-avd", args.avd, "-no-snapshot-save"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();

    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      const now = await listDevices(sdk);
      const fresh = now.find((d) => !before.has(d));
      if (fresh) {
        serial = fresh;
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!serial) return printAndExit({ ok: false, error: "Emulator did not attach within 60s" }, false);
  }

  const booted = await waitForBoot(sdk, serial, { timeoutMs: 180000 });
  if (!booted) return printAndExit({ ok: false, serial, error: "Boot did not complete within 180s" }, false);

  printAndExit({ ok: true, serial });
}

const DEFAULT_PERMISSIONS = [
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.POST_NOTIFICATIONS",
];

async function prepare(args) {
  const sdk = resolveSdk();
  if (!sdk.ok) return printAndExit({ ok: false, error: sdk.error }, false);
  if (!args.package || typeof args.package !== "string") {
    return printAndExit({ ok: false, error: "Pass --package <android.package.name>" }, false);
  }
  const serial = typeof args.serial === "string" ? args.serial : undefined;
  const permissions =
    typeof args.permissions === "string" ? args.permissions.split(",") : DEFAULT_PERMISSIONS;

  const results = [];
  for (const perm of permissions) {
    const res = await adb(sdk, ["shell", "pm", "grant", args.package, perm], { serial });
    results.push({ permission: perm, ok: res.code === 0, error: res.code === 0 ? null : res.stderr });
  }

  // Demo mode gives a clean, consistent status bar (full battery/signal, no
  // notification icons) so screenshots don't carry emulator-specific noise.
  await adb(sdk, ["shell", "settings", "put", "global", "sysui_demo_allowed", "1"], { serial });
  const demoCmds = [
    ["shell", "am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "enter"],
    ["shell", "am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "clock", "-e", "hhmm", "1200"],
    ["shell", "am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "battery", "-e", "plugged", "false", "-e", "level", "100"],
    ["shell", "am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "network", "-e", "wifi", "show", "-e", "level", "4"],
    ["shell", "am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "notifications", "-e", "visible", "false"],
  ];
  for (const cmd of demoCmds) await adb(sdk, cmd, { serial });

  // Disable animations so UI state settles immediately after a tap/navigation.
  for (const setting of ["window_animation_scale", "transition_animation_scale", "animator_duration_scale"]) {
    await adb(sdk, ["shell", "settings", "put", "global", setting, "0"], { serial });
  }

  printAndExit({ ok: results.every((r) => r.ok), permissions: results });
}

async function geo(args) {
  const sdk = resolveSdk();
  if (!sdk.ok) return printAndExit({ ok: false, error: sdk.error }, false);
  if (args.lat === undefined || args.lon === undefined) {
    return printAndExit({ ok: false, error: "Pass --lat <n> --lon <n>" }, false);
  }
  const serial = typeof args.serial === "string" ? args.serial : undefined;
  const res = await adb(sdk, ["emu", "geo", "fix", String(args.lon), String(args.lat)], { serial });
  printAndExit({ ok: res.code === 0, stdout: res.stdout, error: res.code === 0 ? null : res.stderr }, res.code === 0);
}

async function theme(args) {
  const sdk = resolveSdk();
  if (!sdk.ok) return printAndExit({ ok: false, error: sdk.error }, false);
  const target = args.positionals[0];
  const value = target === "dark" ? "yes" : target === "light" ? "no" : null;
  if (!value) return printAndExit({ ok: false, error: "Pass 'light' or 'dark'" }, false);
  const serial = typeof args.serial === "string" ? args.serial : undefined;
  const res = await adb(sdk, ["shell", "cmd", "uimode", "night", value], { serial });
  printAndExit({ ok: res.code === 0, mode: target, error: res.code === 0 ? null : res.stderr }, res.code === 0);
}

async function teardown(args) {
  const sdk = resolveSdk();
  if (!sdk.ok) return printAndExit({ ok: false, error: sdk.error }, false);
  const serial = typeof args.serial === "string" ? args.serial : undefined;

  await adb(sdk, ["shell", "am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "exit"], { serial });
  for (const setting of ["window_animation_scale", "transition_animation_scale", "animator_duration_scale"]) {
    await adb(sdk, ["shell", "settings", "put", "global", setting, "1"], { serial });
  }

  if (args.kill) {
    await adb(sdk, ["emu", "kill"], { serial });
  }

  printAndExit({ ok: true, killed: Boolean(args.kill) });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  switch (args._) {
    case "doctor":
      return doctor();
    case "list":
      return list();
    case "boot":
      return boot(args);
    case "prepare":
      return prepare(args);
    case "geo":
      return geo(args);
    case "theme":
      return theme(args);
    case "teardown":
      return teardown(args);
    default:
      printAndExit(
        { ok: false, error: `Unknown subcommand: ${args._ ?? "(none)"}. Use doctor|list|boot|prepare|geo|theme|teardown.` },
        false,
      );
  }
}

main().catch((err) => printAndExit({ ok: false, error: String(err?.stack ?? err) }, false));
