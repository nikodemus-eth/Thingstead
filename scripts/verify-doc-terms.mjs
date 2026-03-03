#!/usr/bin/env node
/**
 * verify-doc-terms.mjs
 *
 * Scans documentation and plan definitions for known-bad CPMAI acronym
 * expansions that have crept in before (CRISP-DM contamination patterns).
 *
 * CPMAI = "Cognitive Project Management in AI" (PMI's official phrasing).
 *
 * Exit 0 if clean, exit 1 if any bad strings are found.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const BAD_PATTERNS = [
  /Cross[- ][Ii]ndustry.*Process/i,
  /Standard Process for Machine Learning/i,
  /Process Model for AI/i,
];

const SCAN_GLOBS = [
  "README.md",
  "CODING_LOG.md",
  "LESSONS_LEARNED.md",
  "src/plans",
  "docs",
];

const SCAN_EXTENSIONS = new Set([".md", ".json", ".js", ".jsx", ".ts", ".tsx"]);

function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      results.push(...walk(full));
    } else if (entry.isFile() && SCAN_EXTENSIONS.has(extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

let files = [];
for (const target of SCAN_GLOBS) {
  const full = join(ROOT, target);
  try {
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  } catch {
    // Target may not exist; skip.
  }
}

let violations = 0;
for (const file of files) {
  const content = readFileSync(file, "utf-8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of BAD_PATTERNS) {
      if (pattern.test(lines[i])) {
        const rel = file.replace(ROOT + "/", "");
        console.error(`  FAIL  ${rel}:${i + 1}  ${lines[i].trim()}`);
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} bad CPMAI expansion(s) found. CPMAI = "Cognitive Project Management in AI".`);
  process.exit(1);
} else {
  console.log("OK — no bad CPMAI expansions found.");
  process.exit(0);
}
