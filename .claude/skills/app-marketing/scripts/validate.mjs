#!/usr/bin/env node
/**
 * Validates generated/supplied Play Store assets and listing text against
 * `playstore-specs.json` (dimensions, aspect ratio, format, alpha, file
 * size, per-device-type screenshot counts, and listing field character
 * limits). App-agnostic: takes the specs file and asset/listing paths as
 * arguments rather than assuming AtPlace's layout.
 *
 * Usage:
 *   node validate.mjs --specs <playstore-specs.json> \
 *     --icon <file> \
 *     --feature-graphic <file> \
 *     --phone-screenshots <dir> [--tablet7-screenshots <dir>] [--tablet10-screenshots <dir>] \
 *     [--listing <listing.md>]
 *
 * Output: {"ok": bool, "checks": [{"name", "ok", "detail"}]}. Non-zero exit if any check fails.
 */
import { Jimp } from "jimp";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

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

function check(checks, name, ok, detail) {
  checks.push({ name, ok, detail });
}

/** True if any pixel's alpha is below 255 (i.e. the image isn't fully opaque). */
function hasAlpha(img) {
  const { data } = img.bitmap;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) return true;
  }
  return false;
}

async function validateSingleImage(checks, label, filePath, spec) {
  if (!existsSync(filePath)) {
    check(checks, `${label}: exists`, false, `Missing file: ${filePath}`);
    return;
  }
  check(checks, `${label}: exists`, true, filePath);

  const ext = path.extname(filePath).slice(1).toLowerCase();
  const formatOk = spec.format.includes(ext === "jpg" ? "jpg" : ext);
  check(checks, `${label}: format`, formatOk, `${ext} (allowed: ${spec.format.join(", ")})`);

  const bytes = statSync(filePath).size;
  if (spec.maxBytes) {
    check(checks, `${label}: file size`, bytes <= spec.maxBytes, `${bytes}B (max ${spec.maxBytes}B)`);
  }

  const img = await Jimp.read(filePath);
  const { width, height } = img.bitmap;

  if (spec.width && spec.height) {
    check(
      checks,
      `${label}: dimensions`,
      width === spec.width && height === spec.height,
      `${width}x${height} (expected ${spec.width}x${spec.height})`,
    );
  }

  const alpha = hasAlpha(img);
  if (spec.requireAlpha === false) {
    check(checks, `${label}: no alpha`, !alpha, alpha ? "image has transparency but none is allowed" : "opaque");
  }
}

async function validateScreenshotDir(checks, label, dir, deviceSpec, screenshotSpec) {
  if (!existsSync(dir)) {
    check(checks, `${label}: directory exists`, false, `Missing directory: ${dir}`);
    return;
  }
  const files = readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f));
  check(
    checks,
    `${label}: count`,
    files.length >= screenshotSpec.minPerDeviceType && files.length <= screenshotSpec.maxPerDeviceType,
    `${files.length} screenshots (need ${screenshotSpec.minPerDeviceType}-${screenshotSpec.maxPerDeviceType})`,
  );

  for (const file of files) {
    const filePath = path.join(dir, file);
    const ext = path.extname(file).slice(1).toLowerCase();
    const formatOk = screenshotSpec.format.includes(ext === "jpg" ? "jpg" : ext);
    check(checks, `${label}/${file}: format`, formatOk, ext);

    const img = await Jimp.read(filePath);
    const { width, height } = img.bitmap;
    const shortSide = Math.min(width, height);
    const longSide = Math.max(width, height);
    check(
      checks,
      `${label}/${file}: short side`,
      shortSide >= deviceSpec.minShortSidePx,
      `${shortSide}px (min ${deviceSpec.minShortSidePx}px)`,
    );
    check(
      checks,
      `${label}/${file}: long side`,
      longSide <= deviceSpec.maxLongSidePx,
      `${longSide}px (max ${deviceSpec.maxLongSidePx}px)`,
    );
    const ratio = longSide / shortSide;
    check(
      checks,
      `${label}/${file}: aspect ratio`,
      ratio <= screenshotSpec.maxAspectRatioLongToShort,
      `${ratio.toFixed(2)}:1 (max ${screenshotSpec.maxAspectRatioLongToShort}:1)`,
    );

    if (screenshotSpec.requireAlpha === false) {
      const img2 = await Jimp.read(filePath);
      const alpha = hasAlpha(img2);
      check(checks, `${label}/${file}: no alpha`, !alpha, alpha ? "has transparency" : "opaque");
    }
  }
}

/** Parses `## Heading\n<body>` sections from a listing Markdown file into {heading: text}. */
function parseListingSections(markdown) {
  const sections = {};
  const parts = markdown.split(/^##\s+/m).slice(1);
  for (const part of parts) {
    const newlineIdx = part.indexOf("\n");
    const heading = part.slice(0, newlineIdx === -1 ? part.length : newlineIdx).trim();
    const body = newlineIdx === -1 ? "" : part.slice(newlineIdx + 1).trim();
    sections[heading] = body;
  }
  return sections;
}

const LISTING_FIELD_HEADINGS = {
  title: ["Title", "App Name"],
  shortDescription: ["Short Description"],
  fullDescription: ["Full Description"],
};

function validateListing(checks, listingPath, textSpec) {
  if (!existsSync(listingPath)) {
    check(checks, "listing: exists", false, `Missing file: ${listingPath}`);
    return;
  }
  check(checks, "listing: exists", true, listingPath);
  const markdown = readFileSync(listingPath, "utf8");
  const sections = parseListingSections(markdown);

  for (const [field, headings] of Object.entries(LISTING_FIELD_HEADINGS)) {
    const spec = textSpec[field];
    if (!spec) continue;
    const heading = headings.find((h) => sections[h] !== undefined);
    if (!heading) {
      check(checks, `listing: ${field} present`, false, `No "${headings.join('" or "')}" section found`);
      continue;
    }
    const length = sections[heading].length;
    check(
      checks,
      `listing: ${field} length`,
      length <= spec.maxChars,
      `${length} chars (max ${spec.maxChars}) in "${heading}"`,
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.specs) {
    console.error(JSON.stringify({ ok: false, error: "Pass --specs <playstore-specs.json>" }));
    process.exitCode = 1;
    return;
  }
  const specs = JSON.parse(readFileSync(path.resolve(args.specs), "utf8"));
  const checks = [];

  if (args.icon) await validateSingleImage(checks, "icon", path.resolve(args.icon), specs.icon);
  if (args["feature-graphic"]) {
    await validateSingleImage(checks, "feature-graphic", path.resolve(args["feature-graphic"]), specs.featureGraphic);
  }
  if (args["phone-screenshots"]) {
    await validateScreenshotDir(
      checks,
      "phone",
      path.resolve(args["phone-screenshots"]),
      specs.screenshots.deviceTypes.phone,
      specs.screenshots,
    );
  }
  if (args["tablet7-screenshots"]) {
    await validateScreenshotDir(
      checks,
      "tablet7",
      path.resolve(args["tablet7-screenshots"]),
      specs.screenshots.deviceTypes.sevenInchTablet,
      specs.screenshots,
    );
  }
  if (args["tablet10-screenshots"]) {
    await validateScreenshotDir(
      checks,
      "tablet10",
      path.resolve(args["tablet10-screenshots"]),
      specs.screenshots.deviceTypes.tenInchTablet,
      specs.screenshots,
    );
  }
  if (args.listing) validateListing(checks, path.resolve(args.listing), specs.text);

  const ok = checks.every((c) => c.ok);
  console.log(JSON.stringify({ ok, checks }, null, 2));
  if (!ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err?.stack ?? err) }));
  process.exitCode = 1;
});
