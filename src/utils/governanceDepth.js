export function getGovernanceDepth(phase) {
  const artifacts = phase?.artifacts || [];
  if (artifacts.length === 0) return "minimum-compliance";

  const activeArtifacts = artifacts.filter((artifact) => !(artifact?.waiver?.waived === true));
  const coreCount = artifacts.filter((artifact) => artifact.category === "core").length;

  if (activeArtifacts.length <= Math.max(coreCount, 1)) {
    return "minimum-compliance";
  }

  if (activeArtifacts.length === artifacts.length) {
    return "extended-governance";
  }

  return "standard";
}

export function getGovernanceDepthLabel(depth) {
  if (depth === "minimum-compliance") return "Minimum CPMAI Compliance";
  if (depth === "extended-governance") return "Extended Governance";
  return "Standard";
}
