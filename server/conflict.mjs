const TOLERANCE_MS = 2000;

/**
 * Determines whether an incoming write should be accepted based on timestamps.
 * Returns true if:
 *   - No existing project (first write)
 *   - No incoming timestamp (permissive fallback)
 *   - Incoming timestamp is newer than, equal to, or within TOLERANCE_MS of existing
 */
export function shouldAcceptWrite(existingLastModified, incomingLastModified) {
  if (!existingLastModified) return true;
  if (!incomingLastModified) return true;

  const existing = new Date(existingLastModified).getTime();
  const incoming = new Date(incomingLastModified).getTime();

  if (Number.isNaN(existing) || Number.isNaN(incoming)) return true;

  // Accept if incoming is newer, equal, or within tolerance window
  return incoming >= existing - TOLERANCE_MS;
}
