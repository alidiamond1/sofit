/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-off extraction: reads the workout-guide manifest.json from a local
 * clone of https://github.com/bryllim/workout-guide.git and produces:
 *
 *   1. scripts/workout-guide-import/exercises.json — a trimmed, durable copy
 *      of just the fields SoFit's importer needs (slug, name, equipment,
 *      primaryMuscle, frame filenames). This file is what import.js reads,
 *      so re-running the import later does NOT require the clone to still
 *      exist.
 *   2. public/exercise-library/<slug>/frame-{1,2,3}.svg — all 906 SVG
 *      illustrations (302 exercises x 3 frames), copied verbatim.
 *
 * Usage:
 *   node scripts/workout-guide-import/extract.js <path-to-workout-guide-clone>
 *
 * Assets are CC BY-SA 4.0 (Bryl Lim / bryllim.com, derived from Everkinetic).
 * See ATTRIBUTION.md / LICENSE-ASSETS in the source repo. A visible credit
 * line is required and has been added to SoFit's coach Settings page.
 */
const fs = require("fs");
const path = require("path");

const cloneRoot = process.argv[2];
if (!cloneRoot) {
  console.error("Usage: node scripts/workout-guide-import/extract.js <path-to-workout-guide-clone>");
  process.exit(1);
}

const packageDir = path.join(cloneRoot, "packages", "workout-guide");
const manifestPath = path.join(packageDir, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error(`manifest.json not found at ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
console.log(`Loaded manifest with ${manifest.length} exercises.`);

const repoRoot = path.join(__dirname, "..", "..");
const publicLibraryDir = path.join(repoRoot, "public", "exercise-library");
const outJsonPath = path.join(__dirname, "exercises.json");

const trimmed = [];
let copiedFiles = 0;

for (const exercise of manifest) {
  const { slug, name, equipment, primaryMuscle, frames } = exercise;
  if (!slug || !name || !equipment || !primaryMuscle || !Array.isArray(frames)) {
    console.warn(`Skipping malformed entry: ${JSON.stringify(exercise).slice(0, 120)}`);
    continue;
  }

  const destDir = path.join(publicLibraryDir, slug);
  fs.mkdirSync(destDir, { recursive: true });

  const frameFiles = [];
  for (const frame of frames) {
    const srcPath = path.join(cloneRoot, "packages", "workout-guide", frame.path);
    const fileName = path.basename(frame.path); // frame-1.svg, frame-2.svg, frame-3.svg
    const destPath = path.join(destDir, fileName);
    fs.copyFileSync(srcPath, destPath);
    frameFiles.push(fileName);
    copiedFiles += 1;
  }

  trimmed.push({
    slug,
    name,
    equipment,
    primaryMuscle,
    frames: frameFiles,
  });
}

fs.writeFileSync(outJsonPath, JSON.stringify(trimmed, null, 2) + "\n", "utf8");

console.log(`Wrote ${trimmed.length} exercises to ${outJsonPath}`);
console.log(`Copied ${copiedFiles} SVG files into ${publicLibraryDir}`);
