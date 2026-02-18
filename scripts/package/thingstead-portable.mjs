#!/usr/bin/env node
/**
 * thingstead-portable.mjs
 *
 * Builds a self-contained portable distribution of Thingstead.
 *
 * Usage:
 *   node scripts/package/thingstead-portable.mjs [--version <ver>] [--out <dir>]
 *
 * Outputs (in releases/):
 *   Thingstead-<version>-portable/          <- unzipped layout
 *   Thingstead-<version>-portable.zip       <- distribution archive
 *
 * The bundle contains everything needed to run Thingstead offline:
 *   - Pre-built dist/ (frontend static files)
 *   - server/server.mjs + server/conflict.mjs (Node.js API server)
 *   - A minimal package.json (no devDependencies, no build tools)
 *   - Launcher scripts for macOS / Windows / Linux (local + LAN)
 *   - LICENSE, THIRD_PARTY_NOTICES.txt, README.md, docs/USER_GUIDE.md
 */

import { promises as fsp } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

// ─── CLI args ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--version") out.version = argv[++i];
    if (argv[i] === "--out") out.out = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

// Read version from package.json if not provided
const pkg = JSON.parse(await fsp.readFile(path.join(ROOT, "package.json"), "utf8"));
const VERSION = args.version || pkg.version || "0.0.0";
const BUNDLE_NAME = `Thingstead-${VERSION}-portable`;
const RELEASES_DIR = path.resolve(args.out || path.join(ROOT, "releases"));
const OUT_DIR = path.join(RELEASES_DIR, BUNDLE_NAME);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function copyFile(src, dest) {
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.copyFile(src, dest);
}

async function copyDir(src, dest) {
  const entries = await fsp.readdir(src, { withFileTypes: true });
  await fsp.mkdir(dest, { recursive: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(s, d);
    } else {
      await copyFile(s, d);
    }
  }
}

function log(msg) {
  process.stdout.write(`  ${msg}\n`);
}

// ─── Launcher script templates ───────────────────────────────────────────────

const LOCAL_PORT = 4173;
const LAN_PORT = 4173;

const LAUNCHER_SH_LOCAL = `#!/usr/bin/env bash
# Thingstead — Local launcher (macOS / Linux)
# Runs on 127.0.0.1 — only accessible from this machine.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Starting Thingstead (local) on http://127.0.0.1:${LOCAL_PORT} ..."
node "$DIR/server/server.mjs" --host 127.0.0.1 --port ${LOCAL_PORT} --distDir "$DIR/dist" --dataDir "$DIR/.thingstead-data" &
SERVER_PID=$!
sleep 1
open "http://127.0.0.1:${LOCAL_PORT}" 2>/dev/null || xdg-open "http://127.0.0.1:${LOCAL_PORT}" 2>/dev/null || true
echo "Thingstead is running. Press Ctrl+C to stop."
wait $SERVER_PID
`;

const LAUNCHER_SH_LAN = `#!/usr/bin/env bash
# Thingstead — LAN launcher (macOS / Linux)
# Binds to 0.0.0.0 — accessible from other machines on the same network.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
echo "Starting Thingstead (LAN) on http://\${LOCAL_IP:-0.0.0.0}:${LAN_PORT} ..."
node "$DIR/server/server.mjs" --host 0.0.0.0 --port ${LAN_PORT} --distDir "$DIR/dist" --dataDir "$DIR/.thingstead-data" &
SERVER_PID=$!
sleep 1
open "http://127.0.0.1:${LAN_PORT}" 2>/dev/null || xdg-open "http://127.0.0.1:${LAN_PORT}" 2>/dev/null || true
echo "Thingstead is running. LAN URL: http://\${LOCAL_IP:-<your-ip>}:${LAN_PORT}"
echo "Press Ctrl+C to stop."
wait $SERVER_PID
`;

const LAUNCHER_COMMAND_LOCAL = `#!/usr/bin/env bash
# Thingstead — Local launcher (macOS, double-clickable .command)
DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Starting Thingstead (local) on http://127.0.0.1:${LOCAL_PORT} ..."
node "$DIR/server/server.mjs" --host 127.0.0.1 --port ${LOCAL_PORT} --distDir "$DIR/dist" --dataDir "$DIR/.thingstead-data" &
sleep 1
open "http://127.0.0.1:${LOCAL_PORT}"
echo "Running. Close this window to stop Thingstead."
wait
`;

const LAUNCHER_COMMAND_LAN = `#!/usr/bin/env bash
# Thingstead — LAN launcher (macOS, double-clickable .command)
DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "your-ip")
echo "Starting Thingstead (LAN) on http://\${LOCAL_IP}:${LAN_PORT} ..."
node "$DIR/server/server.mjs" --host 0.0.0.0 --port ${LAN_PORT} --distDir "$DIR/dist" --dataDir "$DIR/.thingstead-data" &
sleep 1
open "http://127.0.0.1:${LAN_PORT}"
echo "LAN URL: http://\${LOCAL_IP}:${LAN_PORT}"
echo "Running. Close this window to stop Thingstead."
wait
`;

const LAUNCHER_CMD_LOCAL = `@echo off
REM Thingstead -- Local launcher (Windows)
set DIR=%~dp0
echo Starting Thingstead (local) on http://127.0.0.1:${LOCAL_PORT} ...
start "" "http://127.0.0.1:${LOCAL_PORT}"
node "%DIR%server\\server.mjs" --host 127.0.0.1 --port ${LOCAL_PORT} --distDir "%DIR%dist" --dataDir "%DIR%.thingstead-data"
pause
`;

const LAUNCHER_CMD_LAN = `@echo off
REM Thingstead -- LAN launcher (Windows)
set DIR=%~dp0
echo Starting Thingstead (LAN) on port ${LAN_PORT} ...
echo Access from other machines at http://YOUR-LAN-IP:${LAN_PORT}
start "" "http://127.0.0.1:${LAN_PORT}"
node "%DIR%server\\server.mjs" --host 0.0.0.0 --port ${LAN_PORT} --distDir "%DIR%dist" --dataDir "%DIR%.thingstead-data"
pause
`;

// Minimal runtime package.json (no devDeps, no build scripts)
const RUNTIME_PACKAGE_JSON = JSON.stringify({
  name: "thingstead",
  version: VERSION,
  description: "Thingstead — local-first CPMAI governance workspace",
  license: pkg.license || "AGPL-3.0-only",
  type: "module",
  engines: { node: ">=18.0.0" },
  scripts: {
    start: "node server/server.mjs --host 127.0.0.1 --port 4173",
    "start:lan": "node server/server.mjs --host 0.0.0.0 --port 4173",
  },
}, null, 2);

// ─── Main ────────────────────────────────────────────────────────────────────

async function build() {
  console.log(`\nThingstead Portable Packager v${VERSION}`);
  console.log(`Output: ${OUT_DIR}\n`);

  // 1. Ensure fresh dist/
  log("Building frontend...");
  await execFile("npm", ["run", "build"], { cwd: ROOT });
  log("Frontend built ✓");

  // 2. Clean output dir
  log("Preparing output directory...");
  await fsp.rm(OUT_DIR, { recursive: true, force: true });
  await fsp.mkdir(OUT_DIR, { recursive: true });
  await fsp.mkdir(RELEASES_DIR, { recursive: true });

  // 3. Copy dist/
  log("Copying dist/...");
  await copyDir(path.join(ROOT, "dist"), path.join(OUT_DIR, "dist"));

  // 4. Copy server files
  log("Copying server/...");
  await copyFile(path.join(ROOT, "server", "server.mjs"), path.join(OUT_DIR, "server", "server.mjs"));
  await copyFile(path.join(ROOT, "server", "conflict.mjs"), path.join(OUT_DIR, "server", "conflict.mjs"));

  // 5. Write minimal runtime package.json
  log("Writing runtime package.json...");
  await fsp.writeFile(path.join(OUT_DIR, "package.json"), RUNTIME_PACKAGE_JSON, "utf8");

  // 6. Copy docs and root files
  log("Copying docs and root files...");
  const rootFiles = ["LICENSE", "THIRD_PARTY_NOTICES.txt", "README.md"];
  for (const f of rootFiles) {
    const src = path.join(ROOT, f);
    try {
      await copyFile(src, path.join(OUT_DIR, f));
    } catch {
      log(`  (skipped ${f} — not found)`);
    }
  }
  await copyFile(path.join(ROOT, "docs", "USER_GUIDE.md"), path.join(OUT_DIR, "docs", "USER_GUIDE.md"));

  // 7. Write launcher scripts
  log("Writing launcher scripts...");

  // macOS .command (double-clickable in Finder)
  const cmdLocal = path.join(OUT_DIR, "Start-Thingstead-Local.command");
  const cmdLan = path.join(OUT_DIR, "Start-Thingstead-LAN.command");
  await fsp.writeFile(cmdLocal, LAUNCHER_COMMAND_LOCAL, { mode: 0o755 });
  await fsp.writeFile(cmdLan, LAUNCHER_COMMAND_LAN, { mode: 0o755 });

  // Linux .sh
  const shLocal = path.join(OUT_DIR, "Start-Thingstead-Local.sh");
  const shLan = path.join(OUT_DIR, "Start-Thingstead-LAN.sh");
  await fsp.writeFile(shLocal, LAUNCHER_SH_LOCAL, { mode: 0o755 });
  await fsp.writeFile(shLan, LAUNCHER_SH_LAN, { mode: 0o755 });

  // Windows .cmd
  await fsp.writeFile(path.join(OUT_DIR, "Start-Thingstead-Local.cmd"), LAUNCHER_CMD_LOCAL, "utf8");
  await fsp.writeFile(path.join(OUT_DIR, "Start-Thingstead-LAN.cmd"), LAUNCHER_CMD_LAN, "utf8");

  // 8. Zip the bundle (system zip for correct permissions)
  log("Creating zip archive...");
  const zipName = `${BUNDLE_NAME}.zip`;
  const zipPath = path.join(RELEASES_DIR, zipName);
  await fsp.rm(zipPath, { force: true });

  try {
    await execFile("zip", ["-r", zipName, BUNDLE_NAME], { cwd: RELEASES_DIR });
    log(`Archive created: ${zipPath} ✓`);
  } catch {
    log("(zip not available — skipping archive creation)");
  }

  // 9. Print summary
  const archiveStat = await fsp.stat(zipPath).catch(() => null);
  const sizeMb = archiveStat ? (archiveStat.size / 1024 / 1024).toFixed(1) : "unknown";

  console.log(`\n✓ Done!\n`);
  console.log(`  Folder : ${OUT_DIR}`);
  console.log(`  Archive: ${zipPath} (${sizeMb} MB)`);
  console.log(`\n  To test the bundle locally:`);
  console.log(`    node "${path.join(OUT_DIR, "server", "server.mjs")}" --distDir "${path.join(OUT_DIR, "dist")}" --dataDir "${path.join(OUT_DIR, ".thingstead-data")}"`);
  console.log(`    then open http://127.0.0.1:4173\n`);
}

build().catch((e) => {
  console.error("\n✗ Packaging failed:", e.message);
  process.exit(1);
});
