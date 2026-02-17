export function guidanceForTemplateField(field, isArtifactGateBlocking) {
  const why = field.helpText || "Capture the information needed to evaluate and govern this artifact.";

  let goodLooksLike = "Provide clear, specific, auditable content.";
  if (field.type === "short_text") goodLooksLike = "Keep it specific and unambiguous.";
  if (field.type === "long_text") {
    const minLength = Number(field?.validation?.minLength || 0);
    goodLooksLike = minLength
      ? `Write at least ${minLength} characters. Use concrete facts and measurable details.`
      : "Write with enough detail that another reviewer could validate the claim.";
  }
  if (field.type === "selection") goodLooksLike = "Pick the single best-fit option. If uncertain, choose the most conservative choice.";
  if (field.type === "date") goodLooksLike = "Use a real date (not a placeholder).";
  if (field.type === "checklist") goodLooksLike = "Select at least one item that applies, and ensure it is defensible.";
  if (field.type === "table") goodLooksLike = "Add at least one row and fill every column in that row.";

  const gateText = (() => {
    const fieldGate = field.gateBlocking === true;
    if (!isArtifactGateBlocking && !fieldGate) {
      return "This field does not affect phase gate readiness directly, but it contributes to artifact completion.";
    }
    if (fieldGate) return "This field is gate-blocking: it must be satisfied for this artifact to unlock the phase gate.";
    return "This artifact is gate-blocking. Completing it helps unlock the phase gate.";
  })();

  return { why, goodLooksLike, gateText };
}
