import { migrateProject } from "../migrations/index.js";

const PROJECT_INDEX_KEY = "cpmai-project-index";
const SETTINGS_KEY = "cpmai-settings";
const TX_KEY = "cpmai-storage-tx-v1";

let didRecover = false;

function rawSetItem(key, rawJsonString) {
  try {
    localStorage.setItem(key, rawJsonString);
    return true;
  } catch {
    return false;
  }
}

function rawGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function rawRemoveItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function recoverPendingTransactionOnce() {
  if (didRecover) return;
  didRecover = true;

  const raw = rawGetItem(TX_KEY);
  if (!raw) return;

  try {
    const tx = JSON.parse(raw);
    const entries = Array.isArray(tx?.entries) ? tx.entries : [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const k = typeof entry.key === "string" ? entry.key : "";
      const v = typeof entry.value === "string" ? entry.value : null;
      if (!k || v === null) continue;
      rawSetItem(k, v);
    }
  } catch {
    // Ignore corrupt tx record.
  } finally {
    rawRemoveItem(TX_KEY);
  }
}

function safeSetItem(key, value) {
  try {
    recoverPendingTransactionOnce();
    const raw = JSON.stringify(value);
    return rawSetItem(key, raw);
  } catch {
    // Quota exceeded or storage unavailable
    return false;
  }
}

function safeGetItem(key) {
  try {
    recoverPendingTransactionOnce();
    const raw = rawGetItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function atomicSetMany(entries) {
  recoverPendingTransactionOnce();
  const tx = {
    version: 1,
    createdAt: new Date().toISOString(),
    entries,
  };
  if (!rawSetItem(TX_KEY, JSON.stringify(tx))) return false;

  // Best-effort apply. On crash/close mid-way, recovery will replay entries.
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") return false;
    const k = entry.key;
    const v = entry.value;
    if (typeof k !== "string" || typeof v !== "string") return false;
    if (!rawSetItem(k, v)) return false;
  }

  rawRemoveItem(TX_KEY);
  return true;
}

export function saveProjectIndex(index) {
  return safeSetItem(PROJECT_INDEX_KEY, index) ? index : null;
}

export function loadProjectIndex() {
  return safeGetItem(PROJECT_INDEX_KEY);
}

export function saveProject(projectId, projectData) {
  const key = `cpmai-project-${projectId}`;
  return safeSetItem(key, projectData) ? projectData : null;
}

export function loadProject(projectId) {
  const key = `cpmai-project-${projectId}`;
  const data = safeGetItem(key);
  if (!data || !data.current) return data;
  const migrated = migrateProject(data.current);
  if (migrated) {
    return { ...data, current: migrated };
  }
  return data;
}

export function saveSettings(settings) {
  return safeSetItem(SETTINGS_KEY, settings) ? settings : null;
}

export function loadSettings() {
  return safeGetItem(SETTINGS_KEY);
}

export function deleteProject(projectId) {
  try {
    recoverPendingTransactionOnce();
    return rawRemoveItem(`cpmai-project-${projectId}`);
  } catch {
    return false;
  }
}

// Atomic multi-key helpers (project + index) for crash-safe updates.
export function saveProjectAndIndex(projectId, projectData, index) {
  const projectKey = `cpmai-project-${projectId}`;
  const entries = [
    { key: projectKey, value: JSON.stringify(projectData) },
    { key: PROJECT_INDEX_KEY, value: JSON.stringify(index) },
  ];
  return atomicSetMany(entries) ? { projectData, index } : null;
}

export function deleteProjectAndIndex(projectId, index) {
  const projectKey = `cpmai-project-${projectId}`;
  const entries = [
    { key: projectKey, value: JSON.stringify(null) },
    { key: PROJECT_INDEX_KEY, value: JSON.stringify(index) },
  ];
  // Delete is modeled as: write index + remove project key.
  // We apply tx (so index persists), then remove key last.
  if (!atomicSetMany(entries)) return false;
  return rawRemoveItem(projectKey);
}

/**
 * Returns storage usage info for proactive quota monitoring.
 * Estimates localStorage usage and warns before hitting limits.
 */
export function getStorageUsage() {
  try {
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("cpmai-")) continue;
      const value = localStorage.getItem(key) || "";
      // Each char is ~2 bytes in UTF-16
      totalBytes += (key.length + value.length) * 2;
    }
    const estimatedLimitBytes = 5 * 1024 * 1024; // ~5MB typical limit
    const usagePercent = Math.round((totalBytes / estimatedLimitBytes) * 100);
    return {
      usedBytes: totalBytes,
      usedMB: (totalBytes / (1024 * 1024)).toFixed(2),
      estimatedLimitMB: 5,
      usagePercent,
      isWarning: usagePercent >= 80,
      isCritical: usagePercent >= 95,
    };
  } catch {
    return {
      usedBytes: 0,
      usedMB: "0.00",
      estimatedLimitMB: 5,
      usagePercent: 0,
      isWarning: false,
      isCritical: false,
    };
  }
}
