import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { SERVICE_AREAS } from "@/lib/serviceAreas";

export default defineTool({
  name: "list_service_areas",
  title: "List service areas",
  description:
    "List the DFW cities Savvy Swim serves, with the landing page path for each, useful for answering coverage questions.",
  inputSchema: {
    search: z.string().trim().min(2).optional().describe("Filter cities by name."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ search }) => {
    const areas = SERVICE_AREAS.filter((area) =>
      search ? area.name.toLowerCase().includes(search.toLowerCase()) : true,
    ).map((area) => ({ city: area.name, path: `/${area.slug}` }));
    return {
      content: [{ type: "text", text: JSON.stringify(areas, null, 2) }],
      structuredContent: { areas },
    };
  },
});
