import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";

const inputSchema = z.object({
  workspace: z.string().max(40),
  page: z.string().max(200),
  question: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) }))
    .max(12)
    .optional(),
});

/** Savvy AI — the in-app assistant for staff. Answers with workspace context. */
export const askSavvyOps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, text: "The assistant isn't configured yet." };

    const gateway = createLovableAiGatewayProvider(key);
    const system = `You are "Savvy AI", the internal assistant inside the Savvy Swim OS — the staff console of a Dallas–Fort Worth pool service company.

The person talking to you is a staff member working in the "${data.workspace}" workspace, on the page "${data.page}".

How to help:
- Explain what a screen does, where to find a tool, and the next step to take.
- Help draft customer texts, emails, service notes, quote wording and route plans.
- Give pool-care and water-chemistry guidance (LSI, chlorine, pH, alkalinity, CYA, salt cells, filters).
- Suggest how to read the numbers on the marketing, sales, operations and financial dashboards.

Rules:
- You cannot read the live database. If asked for a specific record or number, say which screen shows it instead of guessing.
- Never invent customer data, prices for the public, passwords or keys.
- Be short and practical: 2-5 sentences or a tight list.`;

    const { text } = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      system,
      messages: [
        ...(data.history ?? []).map((m) => ({ role: m.role, content: m.text })),
        { role: "user" as const, content: data.question },
      ],
    });

    return { ok: true as const, text };
  });
