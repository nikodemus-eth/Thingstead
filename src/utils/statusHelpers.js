export function statusGlyph(status) {
  if (status === "complete") return "check";
  if (status === "waived") return "waiver";
  if (status === "in-progress") return "modify";
  return "pending";
}

export function statusLabel(status) {
  if (status === "waived") return "Waived";
  if (status === "complete") return "Complete";
  if (status === "in-progress") return "In Progress";
  return "Not Started";
}

export function artifactGlyph(category) {
  if (category === "conditional") return "field";
  if (category === "supplemental") return "template";
  return "artifact";
}
