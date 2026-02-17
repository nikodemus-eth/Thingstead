import { spawn } from "node:child_process";

function run(cmd, args, opts = {}) {
  const child = spawn(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
  return child;
}

// Vite LAN dev server + local API backend for /api/* (OpenClaw data).
// - Backend: localhost-only (proxied by Vite) to avoid exposing write endpoints directly on the LAN.
// - Frontend: 0.0.0.0 so other machines can load the UI.
const API_PORT = process.env.OPENCLAW_API_PORT || "4174";
const VITE_PORT = process.env.OPENCLAW_VITE_PORT || "5173";

const api = run("node", ["server/server.mjs", "--host", "127.0.0.1", "--port", API_PORT, "--strictPort"]);
const vite = run(
  "npx",
  ["vite", "--host", "0.0.0.0", "--port", VITE_PORT, "--strictPort"],
  {
    env: {
      ...process.env,
      OPENCLAW_API_PROXY: `http://127.0.0.1:${API_PORT}`,
    },
  }
);

const shutdown = () => {
  try { api.kill("SIGTERM"); } catch {}
  try { vite.kill("SIGTERM"); } catch {}
};

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

vite.on("exit", (code) => {
  shutdown();
  process.exit(code ?? 0);
});

