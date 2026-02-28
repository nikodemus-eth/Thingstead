/**
 * Canonical JSON utilities — delegates to the governance kernel.
 *
 * stableStringify is now owned by the kernel.
 * diffJson remains here (it's a utility, not governance logic).
 */

export { stableStringify } from "../kernel/hash.js";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function diffJson(a, b, opts = {}) {
  const diffs = [];
  const maxDiffs = Number.isInteger(opts.maxDiffs) && opts.maxDiffs > 0 ? opts.maxDiffs : 50;

  const sameScalar = (x, y) => {
    if (x === y) return true;
    if (Number.isNaN(x) && Number.isNaN(y)) return true;
    return false;
  };

  const walk = (x, y, path) => {
    if (diffs.length >= maxDiffs) return;
    if (sameScalar(x, y)) return;

    if (Array.isArray(x) || Array.isArray(y)) {
      if (!Array.isArray(x) || !Array.isArray(y)) {
        diffs.push(path || "$");
        return;
      }
      if (x.length !== y.length) diffs.push(`${path || "$"} (len)`);
      const n = Math.max(x.length, y.length);
      for (let i = 0; i < n && diffs.length < maxDiffs; i += 1) {
        walk(x[i], y[i], `${path || "$"}[${i}]`);
      }
      return;
    }

    if (isPlainObject(x) || isPlainObject(y)) {
      if (!isPlainObject(x) || !isPlainObject(y)) {
        diffs.push(path || "$");
        return;
      }
      const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
      for (const k of [...keys].sort()) {
        if (diffs.length >= maxDiffs) break;
        if (!(k in x) || !(k in y)) {
          diffs.push(`${path || "$"}.${k}`);
          continue;
        }
        walk(x[k], y[k], path ? `${path}.${k}` : `$.${k}`);
      }
      return;
    }

    diffs.push(path || "$");
  };

  walk(a, b, "");
  return diffs;
}
