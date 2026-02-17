function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Deterministic JSON encoding with sorted object keys.
export function stableStringify(value) {
  const seen = new WeakSet();

  const encode = (v) => {
    if (v === null) return "null";
    const t = typeof v;
    if (t === "number") return Number.isFinite(v) ? String(v) : "null";
    if (t === "boolean") return v ? "true" : "false";
    if (t === "string") return JSON.stringify(v);
    if (t !== "object") return "null";

    if (seen.has(v)) return "\"[Circular]\"";
    seen.add(v);

    if (Array.isArray(v)) {
      const items = v.map((item) => encode(item));
      return `[${items.join(",")}]`;
    }

    const keys = Object.keys(v).sort();
    const parts = [];
    for (const k of keys) {
      const vv = v[k];
      if (vv === undefined) continue;
      parts.push(`${JSON.stringify(k)}:${encode(vv)}`);
    }
    return `{${parts.join(",")}}`;
  };

  return encode(value);
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

    // Fallback scalar mismatch.
    diffs.push(path || "$");
  };

  walk(a, b, "");
  return diffs;
}

