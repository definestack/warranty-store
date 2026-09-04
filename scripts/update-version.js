#!/usr/bin/env node

/**
 * Updates versionCode using YYDOYBOD format and syncs version into app.json
 *
 * YYDOYBOD format:
 *   YY   - Two-digit year (e.g., 26 for 2026)
 *   DOY  - Day of year, zero-padded (001-366)
 *   BOD  - Build of day, zero-padded, starting at 0001
 *
 * Example: 262610001
 *   26 = 2026
 *   261 = 261st day of year
 *   0001 = 1st build on that day
 *
 * Strictly increasing: each build must have a higher versionCode than the last.
 * If building multiple times on the same day, BOD increments instead of resetting.
 */

const fs = require('fs');
const path = require('path');

const VERSION_CODE_FILE = path.join(__dirname, '..', 'version-code.txt');
const APP_JSON_FILE = path.join(__dirname, '..', 'app.json');
const BUILD_GRADLE_FILE = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

/**
 * Get the day of year (1-366) for a given date
 */
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Compute the YYDOYBOD version code for a given date
 * If this is a subsequent build on the same day, bod should be > 0
 */
function computeVersionCode(date, buildOfDay = 1) {
  const year = String(date.getFullYear()).slice(-2).padStart(2, '0');
  const doy = String(getDayOfYear(date)).padStart(3, '0');
  const bod = String(buildOfDay).padStart(4, '0');
  return parseInt(year + doy + bod, 10);
}

/**
 * Parse YYDOYBOD version code into components
 */
function parseVersionCode(versionCode) {
  const str = String(versionCode).padStart(9, '0');
  return {
    year: parseInt(str.substring(0, 2), 10),
    doy: parseInt(str.substring(2, 5), 10),
    bod: parseInt(str.substring(5, 9), 10),
  };
}

/**
 * Read the current version code from version-code.txt
 */
function readCurrentVersionCode() {
  const content = fs.readFileSync(VERSION_CODE_FILE, 'utf8').trim();
  const versionCode = parseInt(content, 10);
  if (isNaN(versionCode)) {
    throw new Error(`Invalid versionCode in ${VERSION_CODE_FILE}: ${content}`);
  }
  return versionCode;
}

/**
 * Read the current version name from app.json
 */
function readVersionName() {
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_FILE, 'utf8'));
  return appJson.expo.version;
}

/**
 * Update version code in version-code.txt
 */
function updateVersionCodeFile(newVersionCode) {
  fs.writeFileSync(VERSION_CODE_FILE, `${newVersionCode}\n`);
}

/**
 * Update android/app/build.gradle with new version code and name
 */
function updateBuildGradle(versionCode, versionName) {
  let gradleContent = fs.readFileSync(BUILD_GRADLE_FILE, 'utf8');

  // Update versionCode
  gradleContent = gradleContent.replace(
    /versionCode \d+/,
    `versionCode ${versionCode}`
  );

  // Update versionName
  gradleContent = gradleContent.replace(
    /versionName "[\d.]+"/,
    `versionName "${versionName}"`
  );

  fs.writeFileSync(BUILD_GRADLE_FILE, gradleContent);
}

/**
 * Main function
 */
function main() {
  try {
    const today = new Date();
    const currentVersionCode = readCurrentVersionCode();
    const currentParsed = parseVersionCode(currentVersionCode);

    // Compute today's expected version code (first build of the day)
    const todaysCode = computeVersionCode(today, 1);
    const todaysParsed = parseVersionCode(todaysCode);

    let newVersionCode;
    let buildOfDay;

    if (todaysCode > currentVersionCode) {
      // New day: reset BOD to 0001
      newVersionCode = todaysCode;
      buildOfDay = 1;
    } else {
      // Same day or clock went backward: increment BOD
      buildOfDay = currentParsed.bod + 1;
      newVersionCode = computeVersionCode(today, buildOfDay);
    }

    const versionName = readVersionName();
    const fullVersionName = `${versionName}.${newVersionCode}`;

    // Update files
    updateVersionCodeFile(newVersionCode);
    updateBuildGradle(newVersionCode, fullVersionName);

    console.log(`✓ Version code bumped to ${newVersionCode}`);
    console.log(`  Date: ${today.toISOString().split('T')[0]}`);
    console.log(`  Build of day: ${buildOfDay}`);
    console.log(`  Version name: ${fullVersionName}`);
    console.log(`✓ Updated: ${VERSION_CODE_FILE}`);
    console.log(`✓ Updated: ${BUILD_GRADLE_FILE}`);
  } catch (error) {
    console.error('✗ Error updating version:', error.message);
    process.exit(1);
  }
}

main();
