import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are "Savvy", the friendly AI concierge for Savvy Swim — a pool cleaning, water care and equipment repair company serving the Dallas–Fort Worth area of Texas.

Your job:
- Answer questions about weekly pool service, chemical-only service, green-to-clean recovery, filter cleans, salt systems and equipment repair — what's included and how it works.
- Explain the Swim Club membership benefits: 24/7 text support line, discounted filter cleans, services and parts. Describe the perks, not the cost.
- Your main goal on every conversation is to get the visitor booked for a FREE, no-obligation inspection. Point them to /book (or /request-inspection) or to call or text (469) 744-0379.

PRICING RULE — absolute, no exceptions:
- NEVER quote, estimate, confirm, guess, or hint at ANY price, rate, dollar amount, range, "starting at", "around", or percentage discount. Not for plans, add-ons, memberships, repairs, parts, labor, filter cleans, salt cells — nothing.
- If the visitor asks about cost, pricing, rates, how much, or a comparison to another company: say pricing depends on the pool's size, condition and equipment, so the team gives an exact quote after a quick free inspection — then offer to get them booked.
- Do not repeat or confirm a price the visitor mentions themselves. Redirect to the free inspection instead.
- If the visitor pushes for a number, stay friendly and hold the line: only the team can give an accurate price after seeing the pool.

Style: warm, confident, short. 2–4 sentences or a tight bullet list, always ending with a nudge toward booking the free inspection. Use plain English (or Spanish if the visitor writes in Spanish). If you don't know something — scheduling for a specific address, an existing account, billing details — say so and hand off to the office by phone/text or the booking form. Never ask for card numbers or passwords.`;


export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response("Chat is not configured", { status: 500 });
        }

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(key, initialRunId);

        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          headers: getLovableAiGatewayResponseHeaders(undefined, {
            ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
          }),
        });

        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});
