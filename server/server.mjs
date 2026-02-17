import http from "node:http";
import { promises as fsp } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--host") out.host = argv[++i];
    else if (a === "--port") out.port = Number(argv[++i]);
    else if (a === "--strictPort") out.strictPort = true;
    else if (a === "--distDir") out.distDir = argv[++i];
    else if (a === "--dataDir") out.dataDir = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const HOST = args.host || process.env.HOST || "127.0.0.1";
const PORT = Number(args.port || process.env.PORT || 4173);

const ROOT = path.resolve(__dirname, "..");

function resolveDir(maybePath, fallback) {
  if (!maybePath) return fallback;
  if (path.isAbsolute(maybePath)) return maybePath;
  return path.join(ROOT, maybePath);
}

const DIST_DIR = resolveDir(args.distDir || process.env.DIST_DIR, path.join(ROOT, "dist"));
const DATA_DIR = resolveDir(args.dataDir || process.env.DATA_DIR, path.join(ROOT, ".openclaw-data"));
const PROJECTS_DIR = path.join(DATA_DIR, "projects");

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".ico", "image/x-icon"],
  [".map", "application/json; charset=utf-8"],
  [".woff2", "font/woff2"],
]);

async function ensureDirs() {
  await fsp.mkdir(PROJECTS_DIR, { recursive: true });
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify(obj));
}

async function readJsonBody(req, maxBytes = 2 * 1024 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("BODY_TOO_LARGE");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(text);
}

async function atomicWriteJson(filePath, obj) {
  const dir = path.dirname(filePath);
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  const data = JSON.stringify(obj, null, 2);
  await fsp.writeFile(tmpPath, data, "utf8");
  await fsp.rename(tmpPath, filePath);
}

function safeProjectId(id) {
  // Keep filesystem-safe and predictable.
  if (typeof id !== "string") return null;
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(id)) return null;
  return id;
}

function projectPath(id) {
  return path.join(PROJECTS_DIR, `${id}.json`);
}

async function listProjectsIndex() {
  await ensureDirs();
  const files = await fsp.readdir(PROJECTS_DIR).catch(() => []);
  const projects = {};
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const id = file.slice(0, -5);
    const fp = projectPath(id);
    try {
      const raw = await fsp.readFile(fp, "utf8");
      const project = JSON.parse(raw);
      const name = typeof project?.name === "string" ? project.name : id;
      const lastModified =
        typeof project?.lastModified === "string" ? project.lastModified : null;
      const lastSavedFrom =
        typeof project?.lastSavedFrom === "string" ? project.lastSavedFrom : null;
      projects[id] = { id, name, lastModified, lastSavedFrom };
    } catch {
      // ignore corrupt files; keep server robust
    }
  }
  return { currentProjectId: null, projects };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/projects") {
    const index = await listProjectsIndex();
    return sendJson(res, 200, index);
  }

  const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch) {
    const id = safeProjectId(projectMatch[1]);
    if (!id) return sendJson(res, 400, { error: "INVALID_ID" });

    if (req.method === "GET") {
      try {
        const raw = await fsp.readFile(projectPath(id), "utf8");
        const project = JSON.parse(raw);
        return sendJson(res, 200, { project });
      } catch {
        return sendJson(res, 404, { error: "NOT_FOUND" });
      }
    }

    if (req.method === "PUT") {
      try {
        const body = await readJsonBody(req);
        const project = body?.project ?? body;
        if (!project || typeof project !== "object") {
          return sendJson(res, 400, { error: "INVALID_PROJECT" });
        }
        // Ensure stored object id matches URL id if provided.
        if (typeof project.id === "string" && project.id !== id) {
          return sendJson(res, 400, { error: "ID_MISMATCH" });
        }
        const toStore = { ...project, id };
        await ensureDirs();
        await atomicWriteJson(projectPath(id), toStore);
        const index = await listProjectsIndex();
        return sendJson(res, 200, { ok: true, index, project: toStore });
      } catch (e) {
        if (String(e?.message) === "BODY_TOO_LARGE") {
          return sendJson(res, 413, { error: "BODY_TOO_LARGE" });
        }
        return sendJson(res, 400, { error: "BAD_JSON" });
      }
    }

    if (req.method === "DELETE") {
      try {
        await fsp.unlink(projectPath(id));
      } catch {
        // ignore
      }
      const index = await listProjectsIndex();
      return sendJson(res, 200, { ok: true, index });
    }
  }

  return sendJson(res, 404, { error: "NOT_FOUND" });
}

async function serveStatic(req, res, url) {
  if (!fs.existsSync(DIST_DIR)) {
    return send(
      res,
      500,
      { "Content-Type": "text/plain; charset=utf-8" },
      "dist/ missing. Run: npm run build\n"
    );
  }

  const pathname = decodeURIComponent(url.pathname);
  const candidate =
    pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(DIST_DIR, candidate);

  // Prevent path traversal.
  if (!filePath.startsWith(DIST_DIR)) {
    return send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad path\n");
  }

  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      return send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found\n");
    }
    const ext = path.extname(filePath);
    const ct = MIME.get(ext) || "application/octet-stream";
    const data = await fsp.readFile(filePath);
    return send(res, 200, { "Content-Type": ct, "Cache-Control": "no-cache" }, data);
  } catch {
    // SPA fallback.
    try {
      const indexPath = path.join(DIST_DIR, "index.html");
      const data = await fsp.readFile(indexPath);
      return send(res, 200, { "Content-Type": MIME.get(".html"), "Cache-Control": "no-cache" }, data);
    } catch {
      return send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found\n");
    }
  }
}

async function main() {
  await ensureDirs();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(req, res, url);
      }
      return await serveStatic(req, res, url);
    } catch {
      return sendJson(res, 500, { error: "INTERNAL_ERROR" });
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`Thingstead server listening on http://${HOST}:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
