#!/usr/bin/env node
/**
 * Image composition for Play Store / website assets: flattening alpha,
 * resizing the app icon, building a feature graphic, and (optionally)
 * framing a real screenshot with a caption. Uses `jimp` (a devDependency).
 *
 * App-agnostic: every app-specific value (brand color, app name, tagline,
 * icon path) is passed on the command line rather than hard-coded, so this
 * script can be copied into another repo unchanged.
 *
 * Subcommands:
 *   normalize --in <file> --out <file> [--background <#hex>]
 *       Flattens any alpha channel onto `--background` (default white) and
 *       writes an opaque PNG/JPEG (format inferred from --out's extension).
 *
 *   resize-icon --in <file> --out <file> [--size 512]
 *       Resizes (no cropping/stretching beyond aspect-preserving fit) the
 *       square source icon to the Play Store icon size.
 *
 *   feature-graphic --out <file> --name <appName> [--tagline <text>]
 *       [--icon <file>] [--background <#hex>]
 *       Composes a 1024x500 feature graphic: solid brand background, the
 *       app icon, and the app name/tagline as text. No fabricated UI.
 *
 *   frame --in <file> --out <file> [--caption <text>] [--background <#hex>]
 *       Pads a real screenshot onto a slightly larger canvas with a caption
 *       bar above it. The screenshot pixels themselves are never altered.
 *
 * Every subcommand prints {"ok": true, "out": "<path>"} or {"ok": false, "error": "..."}.
 */
import { Jimp, loadFont } from "jimp";
import { SANS_32_BLACK, SANS_64_BLACK, SANS_32_WHITE, SANS_64_WHITE } from "jimp/fonts";
import { mkdirSync } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const [sub, ...rest] = argv;
  const args = { _: sub };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith("--")) {
      const key = rest[i].slice(2);
      const next = rest[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

function hexToInt(hex, alpha = 0xff) {
  const clean = (hex ?? "#ffffff").replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return ((r << 24) | (g << 16) | (b << 8) | alpha) >>> 0;
}

/** Relative luminance (0-1) of a `#rrggbb` hex color, used to pick readable text color. */
function luminance(hex) {
  const clean = (hex ?? "#ffffff").replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ensureDir(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

/**
 * Forces every pixel fully opaque. Compositing a source with partially
 * transparent (anti-aliased) edge pixels onto an opaque background should
 * already yield full opacity, but Jimp's `composite` can leave a faint
 * alpha fringe at those edges — this is the backstop for every "this must
 * be a flat, opaque image" output (Play's feature graphic and normalized
 * screenshots forbid alpha outright).
 */
function flattenAlpha(img) {
  const { data } = img.bitmap;
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return img;
}

async function normalize(args) {
  if (!args.in || !args.out) return { ok: false, error: "Pass --in <file> --out <file>" };
  const img = await Jimp.read(path.resolve(args.in));
  const background = new Jimp({ width: img.bitmap.width, height: img.bitmap.height, color: hexToInt(args.background ?? "#ffffff") });
  background.composite(img, 0, 0);
  const outPath = path.resolve(args.out);
  ensureDir(outPath);
  flattenAlpha(background);
  await background.write(outPath);
  return { ok: true, out: outPath };
}

async function resizeIcon(args) {
  if (!args.in || !args.out) return { ok: false, error: "Pass --in <file> --out <file>" };
  const size = Number(args.size ?? 512);
  const img = await Jimp.read(path.resolve(args.in));
  img.resize({ w: size, h: size });
  const outPath = path.resolve(args.out);
  ensureDir(outPath);
  await img.write(outPath);
  return { ok: true, out: outPath, size };
}

const FEATURE_GRAPHIC_WIDTH = 1024;
const FEATURE_GRAPHIC_HEIGHT = 500;

async function featureGraphic(args) {
  if (!args.out || !args.name) return { ok: false, error: "Pass --out <file> --name <appName>" };
  const background = args.background ?? "#1A344E";
  const canvas = new Jimp({ width: FEATURE_GRAPHIC_WIDTH, height: FEATURE_GRAPHIC_HEIGHT, color: hexToInt(background) });
  const light = luminance(background) < 0.5;

  if (args.icon) {
    const icon = await Jimp.read(path.resolve(args.icon));
    const iconSize = 280;
    icon.resize({ w: iconSize, h: iconSize });
    canvas.composite(icon, 64, Math.round((FEATURE_GRAPHIC_HEIGHT - iconSize) / 2));
  }

  const nameFont = await loadFont(light ? SANS_64_WHITE : SANS_64_BLACK);
  const textX = args.icon ? 64 + 280 + 48 : 64;
  canvas.print({ font: nameFont, x: textX, y: 170, text: args.name, maxWidth: FEATURE_GRAPHIC_WIDTH - textX - 48 });

  if (args.tagline) {
    const taglineFont = await loadFont(light ? SANS_32_WHITE : SANS_32_BLACK);
    canvas.print({
      font: taglineFont,
      x: textX,
      y: 250,
      text: args.tagline,
      maxWidth: FEATURE_GRAPHIC_WIDTH - textX - 48,
    });
  }

  const outPath = path.resolve(args.out);
  ensureDir(outPath);
  flattenAlpha(canvas);
  await canvas.write(outPath);
  return { ok: true, out: outPath };
}

const FRAME_PADDING_X = 48;
const FRAME_CAPTION_HEIGHT = 140;
const FRAME_PADDING_BOTTOM = 32;

async function frame(args) {
  if (!args.in || !args.out) return { ok: false, error: "Pass --in <file> --out <file>" };
  const screenshot = await Jimp.read(path.resolve(args.in));
  const background = args.background ?? "#FAF6F0";
  const captionHeight = args.caption ? FRAME_CAPTION_HEIGHT : 0;
  const canvasWidth = screenshot.bitmap.width + FRAME_PADDING_X * 2;
  const canvasHeight = screenshot.bitmap.height + captionHeight + FRAME_PADDING_BOTTOM;
  const canvas = new Jimp({ width: canvasWidth, height: canvasHeight, color: hexToInt(background) });

  canvas.composite(screenshot, FRAME_PADDING_X, captionHeight);

  if (args.caption) {
    const light = luminance(background) < 0.5;
    const font = await loadFont(light ? SANS_32_WHITE : SANS_32_BLACK);
    canvas.print({
      font,
      x: FRAME_PADDING_X,
      y: 32,
      text: args.caption,
      maxWidth: canvasWidth - FRAME_PADDING_X * 2,
    });
  }

  const outPath = path.resolve(args.out);
  ensureDir(outPath);
  flattenAlpha(canvas);
  await canvas.write(outPath);
  return { ok: true, out: outPath };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let result;
  switch (args._) {
    case "normalize":
      result = await normalize(args);
      break;
    case "resize-icon":
      result = await resizeIcon(args);
      break;
    case "feature-graphic":
      result = await featureGraphic(args);
      break;
    case "frame":
      result = await frame(args);
      break;
    default:
      result = { ok: false, error: `Unknown subcommand: ${args._ ?? "(none)"}. Use normalize|resize-icon|feature-graphic|frame.` };
  }
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err?.stack ?? err) }));
  process.exitCode = 1;
});
