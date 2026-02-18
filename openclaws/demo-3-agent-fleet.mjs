#!/usr/bin/env node
/**
 * OpenClaw × Thingstead – 3-Agent Fleet Demo
 *
 * Simulates three OpenClaw agents (alpha, beta, gamma) registering with a
 * Thingstead project, sending heartbeats, and submitting advisory proposals.
 *
 * Usage:
 *   node openclaws/demo-3-agent-fleet.mjs [--base-url http://localhost:4173]
 *
 * Requires a running Thingstead server (npm run dev or npm run dev:lan).
 */

import process from "node:process";

function parseArgs(argv) {
  const out = { baseUrl: "http://localhost:4173" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base-url") out.baseUrl = argv[++i];
  }
  return out;
}

const { baseUrl } = parseArgs(process.argv.slice(2));
const API = `${baseUrl}/api/openclaw`;

const AGENTS = [
  { id: "agent-alpha", role: "Researcher" },
  { id: "agent-beta",  role: "Writer" },
  { id: "agent-gamma", role: "Critic" },
];

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get(path) {
  const res = await fetch(`${API}${path}`);
  return res.json();
}

console.log("🚀 OpenClaw × Thingstead 3-Agent Fleet Demo");
console.log(`   Server: ${baseUrl}`);
console.log("");

// 1. Health check
console.log("── Step 1: Verifying server connection…");
let health;
try {
  const res = await fetch(`${API}/health`);
  health = await res.json();
} catch {
  console.error(`\n❌ Thingstead server not reachable at ${baseUrl}`);
  console.error("   Start it with: npm run dev");
  process.exit(1);
}
if (!health?.ok) {
  console.error("❌ Server returned unexpected health response:", health);
  process.exit(1);
}
console.log("   ✓ Server connected:", health.integration);

// 2. Create demo project
console.log("\n── Step 2: Creating governed project…");
const { project } = await post("/projects", {
  name: `OpenClaw Personal Knowledge Fleet (demo-${Date.now().toString(36)})`,
  planId: "openclaws-agent-lifecycle",
  linkedAgentIds: [],
});
const projectId = project.id;
console.log(`   ✓ Project created: ${project.name}`);
console.log(`   ✓ Project ID    : ${projectId}`);
console.log(`   ✓ Plan          : ${project.plan_id}`);

// 3. Register agents via heartbeat
console.log("\n── Step 3: Registering 3 agents via heartbeat…");
for (const agent of AGENTS) {
  const result = await post("/heartbeat", { projectId, agentId: agent.id });
  console.log(`   ✓ ${agent.role} (${agent.id}) — heartbeat: ${result.lastAgentHeartbeat}`);
}

// 4. Submit advisory proposals
console.log("\n── Step 4: Agents submitting advisory proposals…");
for (const agent of AGENTS) {
  const draftId = `${agent.id}-phase1-draft`;
  const content = `${agent.role} advisory draft: Initial analysis for fleet governance Phase 1.`;
  const result = await post("/proposals", { projectId, draftId, content });
  console.log(`   ✓ ${agent.role} → proposal '${result.draftId}'`);
}

// 5. Gate advisory
console.log("\n── Step 5: Querying advisory gate readiness (Phase 1)…");
const gate = await get(`/gate/${projectId}/1`);
console.log(`   ✓ Gate advisory: ready=${gate.ready}, advisory=${gate.advisory}`);

// 6. Summary
const final = await get(`/projects/${projectId}`);
const oc = final.project.openclaw;
console.log("\n── Summary ─────────────────────────────────────────");
console.log(`   Project       : ${final.project.name}`);
console.log(`   Agents linked : ${oc.linkedAgentIds.join(", ")}`);
console.log(`   Last heartbeat: ${oc.lastAgentHeartbeat}`);
console.log(`   Proposals     : ${Object.keys(oc.advisoryDrafts).length} advisory draft(s)`);
console.log(`   Data file     : .openclaw-data/projects/${projectId}.json`);
console.log("");
console.log("✅ Fleet demo complete. All data is advisory-only — deterministic core untouched.");
console.log("");
console.log("Next steps in Thingstead:");
console.log(`   1. Open ${baseUrl}`);
console.log("   2. Dashboard → 'OpenClaw Agents' widget → see 3 live agents");
console.log("   3. Open the project → review advisory proposals");
