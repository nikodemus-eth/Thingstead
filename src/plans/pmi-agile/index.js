import agilePlan from "../../data/pmi-agile-template.json";
import { GovernanceTrack } from "../../kernel/governanceTracks.js";
import { buildProjectFromTemplate } from "../buildUtils.js";

export const PMI_AGILE_PLAN_ID = "pmi-agile";
export const PMI_AGILE_PLAN_VERSION = "1.0.0";

export function buildNewAgileProject(name, deviceId, governanceMode = "team") {
  return buildProjectFromTemplate({
    template: agilePlan,
    planId: PMI_AGILE_PLAN_ID,
    planVersion: PMI_AGILE_PLAN_VERSION,
    track: GovernanceTrack.PMI_AGILE,
    name,
    deviceId,
    governanceMode,
    phaseExtras: (phase) => ({ iterative: phase.iterative || false }),
  });
}
