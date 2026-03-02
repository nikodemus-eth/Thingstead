import waterfallPlan from "../../data/pmi-waterfall-template.json";
import { GovernanceTrack } from "../../kernel/governanceTracks.js";
import { buildProjectFromTemplate } from "../buildUtils.js";

export const PMI_WATERFALL_PLAN_ID = "pmi-waterfall";
export const PMI_WATERFALL_PLAN_VERSION = "1.0.0";

export function buildNewWaterfallProject(name, deviceId, governanceMode = "team") {
  return buildProjectFromTemplate({
    template: waterfallPlan,
    planId: PMI_WATERFALL_PLAN_ID,
    planVersion: PMI_WATERFALL_PLAN_VERSION,
    track: GovernanceTrack.PMI_WATERFALL,
    name,
    deviceId,
    governanceMode,
  });
}
