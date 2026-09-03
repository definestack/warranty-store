#!/usr/bin/env node
'use strict';

// Computes and applies the Android versionCode using the YYDOYBOD format
// documented in docs/versioning.md, keeping it strictly increasing across
// releases. Run via `npm run version:bump`.

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const VERSION_CODE_FILE = path.join(ROOT_DIR, 'version-code.txt');
const APP_JSON_FILE = path.join(ROOT_DIR, 'app.json');
const PACKAGE_JSON_FILE = path.join(ROOT_DIR, 'package.json');

const BUILD_SEGMENT_SIZE = 10000;

function dayOfYear(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((date - startOfYear) / msPerDay) + 1;
}

function computeNextVersionCode(date, lastCode) {
  const prefix = (date.getFullYear() % 100) * 1000 + dayOfYear(date);
  const todaysFirstBuild = prefix * BUILD_SEGMENT_SIZE + 1;
  return Math.max(todaysFirstBuild, lastCode + 1);
}

function readVersionCode() {
  const raw = fs.readFileSync(VERSION_CODE_FILE, 'utf8').trim();
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`version-code.txt does not contain a valid integer: "${raw}"`);
  }
  return value;
}

function writeVersionCode(versionCode) {
  fs.writeFileSync(VERSION_CODE_FILE, `${versionCode}\n`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function updateAppJsonVersionCode(versionCode) {
  const appJson = readJson(APP_JSON_FILE);
  appJson.expo.android = appJson.expo.android || {};
  appJson.expo.android.versionCode = versionCode;
  writeJson(APP_JSON_FILE, appJson);
  return appJson.expo.version;
}

function syncPackageJsonVersion(version) {
  const packageJson = readJson(PACKAGE_JSON_FILE);
  const previousVersion = packageJson.version;
  if (previousVersion !== version) {
    packageJson.version = version;
    writeJson(PACKAGE_JSON_FILE, packageJson);
  }
  return previousVersion;
}

function main() {
  const previousVersionCode = readVersionCode();
  const nextVersionCode = computeNextVersionCode(new Date(), previousVersionCode);

  writeVersionCode(nextVersionCode);
  const appVersion = updateAppJsonVersionCode(nextVersionCode);
  const previousPackageVersion = syncPackageJsonVersion(appVersion);

  console.log(`versionCode: ${previousVersionCode} -> ${nextVersionCode}`);
  console.log(`app.json: expo.android.versionCode = ${nextVersionCode}`);
  if (previousPackageVersion !== appVersion) {
    console.log(`package.json: version synced ${previousPackageVersion} -> ${appVersion}`);
  } else {
    console.log(`package.json: version already up to date (${appVersion})`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`version:bump failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { dayOfYear, computeNextVersionCode };
