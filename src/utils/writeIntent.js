export const WRITE_INTENT_HEADER = "X-Thingstead-Write-Intent";
export const WRITE_INTENT_VALUE = "thingstead-ui";

export function buildWriteIntentHeaders(extra = {}) {
  return {
    ...extra,
    [WRITE_INTENT_HEADER]: WRITE_INTENT_VALUE,
  };
}
