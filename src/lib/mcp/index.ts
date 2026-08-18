import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listLeadsTool from "./tools/list-leads";
import getLeadTool from "./tools/get-lead";
import setLeadStatusTool from "./tools/set-lead-status";
import serviceAreasTool from "./tools/service-areas";

// The OAuth issuer must be the direct Supabase host; the project ref is the one
// value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "savvyswim",
  title: "SavvySwim",
  version: "0.1.0",
  instructions:
    "Tools for Savvy Swim, a DFW pool service company. Use `list_leads` and `get_lead` to review website leads, `set_lead_status` to move a lead through the pipeline, and `list_service_areas` for coverage questions. All lead access runs as the signed-in Savvy Swim user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  // Cast: tool definitions without an outputSchema trip this project's
  // exactOptionalPropertyTypes setting against the SDK's tool type.
  tools: [listLeadsTool, getLeadTool, setLeadStatusTool, serviceAreasTool] as unknown as Parameters<
    typeof defineMcp
  >[0]["tools"],
});
