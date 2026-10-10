#!/usr/bin/env node
/**
 * Discovers facts about the target Expo/React Native app from its own repo:
 * app identity (name/slug/version/package/scheme), icon/permission config,
 * existing docs, and any screenshots already checked in. Emits JSON so
 * Claude (and `SKILL.md`'s workflow) can build an evidence-backed fact sheet
 * instead of guessing at features or platform support.
 *
 * App-agnostic: makes no assumption beyond "this is an Expo app with an
 * app.json or app.config.js at its root" (checked at a given --root, default
 * the current working directory, so this script can be copied into any repo
 * that follows the same convention).
 *
 * Usage: node discover.mjs [--root <path>]
 * Output: a single JSON object on stdout; non-zero exit + {error} on failure.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function parseArgs(argv) {
  const args = { root: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--root") args.root = path.resolve(argv[++i]);
  }
  return args;
}

const SCREENSHOT_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const SKIP_DIRS = new Set(["node_modules", "android", "ios", ".git", ".expo", "build", "dist"]);
const SCREENSHOT_SEARCH_ROOTS = ["docs", "screenshots", "fastlane", "store", "metadata"];

/** Recursively lists image files under `dir` (relative to `root`), skipping build/dependency dirs. */
function findImages(root, dir, out = []) {
  const abs = path.join(root, dir);
  if (!existsSync(abs)) return out;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findImages(root, rel, out);
    } else if (SCREENSHOT_EXT.has(path.extname(entry.name).toLowerCase())) {
      out.push(rel.replace(/\\/g, "/"));
    }
  }
  return out;
}

/** Loads the Expo config, trying app.json first, then app.config.js/.ts via dynamic import. */
async function loadExpoConfig(root) {
  const jsonPath = path.join(root, "app.json");
  if (existsSync(jsonPath)) {
    const parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
    return parsed.expo ?? parsed;
  }
  for (const name of ["app.config.js", "app.config.cjs", "app.config.mjs"]) {
    const configPath = path.join(root, name);
    if (!existsSync(configPath)) continue;
    const mod = await import(pathToFileURL(configPath).href);
    const value = mod.default ?? mod;
    const resolved = typeof value === "function" ? value({ config: {} }) : value;
    return resolved.expo ?? resolved;
  }
  return null;
}

function findDocFiles(root) {
  const candidates = ["README.md", "CLAUDE.md"];
  return candidates.filter((name) => existsSync(path.join(root, name)));
}

function findAdrAndDesignDocs(root) {
  const out = { adrs: [], designDocs: [] };
  const adrDir = path.join(root, "docs", "adr");
  const designDir = path.join(root, "docs", "design");
  if (existsSync(adrDir)) {
    out.adrs = readdirSync(adrDir).filter((f) => f.endsWith(".md"));
  }
  if (existsSync(designDir)) {
    out.designDocs = readdirSync(designDir);
  }
  return out;
}

function readPackageJson(root) {
  const pkgPath = path.join(root, "package.json");
  if (!existsSync(pkgPath)) return null;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  return { name: pkg.name, version: pkg.version, dependencies: Object.keys(pkg.dependencies ?? {}) };
}

/** What website/playstore outputs already exist, so the skill preserves/extends rather than clobbers. */
function existingOutputs(root) {
  const websiteDir = path.join(root, "docs", "website");
  const playstoreDir = path.join(root, "docs", "playstore");
  return {
    website: existsSync(websiteDir) ? readdirSync(websiteDir) : [],
    playstore: existsSync(playstoreDir) ? readdirSync(playstoreDir) : [],
  };
}

async function main() {
  const { root } = parseArgs(process.argv.slice(2));
  if (!existsSync(root)) {
    console.error(JSON.stringify({ error: `Root does not exist: ${root}` }));
    process.exitCode = 1;
    return;
  }

  const expo = await loadExpoConfig(root);
  if (!expo) {
    console.error(JSON.stringify({ error: "No app.json or app.config.(js|cjs|mjs) found at root" }));
    process.exitCode = 1;
    return;
  }

  const iconPath = expo.icon ? path.join(root, expo.icon) : null;
  const result = {
    root,
    app: {
      name: expo.name ?? null,
      slug: expo.slug ?? null,
      version: expo.version ?? null,
      scheme: expo.scheme ?? null,
      orientation: expo.orientation ?? null,
      userInterfaceStyle: expo.userInterfaceStyle ?? null,
      androidPackage: expo.android?.package ?? null,
      androidPermissions: expo.android?.permissions ?? [],
      adaptiveIconBackgroundColor: expo.android?.adaptiveIcon?.backgroundColor ?? null,
      plugins: (expo.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p)),
    },
    icon: {
      configuredPath: expo.icon ?? null,
      exists: iconPath ? existsSync(iconPath) : false,
      sizeBytes: iconPath && existsSync(iconPath) ? statSync(iconPath).size : null,
    },
    package: readPackageJson(root),
    docs: findDocFiles(root),
    ...(() => {
      const { adrs, designDocs } = findAdrAndDesignDocs(root);
      return { adrs, designDocs };
    })(),
    existingScreenshots: SCREENSHOT_SEARCH_ROOTS.flatMap((dir) => findImages(root, dir)),
    existingOutputs: existingOutputs(root),
    routes: findImages(root, "src/app").length >= 0 ? listRoutes(root) : [],
  };

  console.log(JSON.stringify(result, null, 2));
}

/** Lists route files under src/app (Expo Router convention) as evidence for "what screens exist". */
function listRoutes(root) {
  const appDir = path.join(root, "src", "app");
  if (!existsSync(appDir)) return [];
  const out = [];
  (function walk(dir) {
    const abs = path.join(root, dir);
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (/\.(tsx|jsx|ts|js)$/.test(entry.name) && !entry.name.includes(".test.")) {
        out.push(rel.replace(/\\/g, "/"));
      }
    }
  })("src/app");
  return out;
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err?.stack ?? err) }));
  process.exitCode = 1;
});
