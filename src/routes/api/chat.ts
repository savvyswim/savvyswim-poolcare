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
- Answer questions about weekly pool service, chemical-only service, green-to-clean recovery, filter cleans, salt systems and equipment repair.
- Explain the Swim Club membership: $19.99/month add-on with 24/7 text support line, 25% off filter cleans, 10% off services and 10% off parts.
- Explain that monthly pricing depends on pool size, vegetation and condition, so exact rates come from a free quote. Never invent a specific dollar price for a customer's pool. The only fixed prices you may quote are Swim Club at $19.99/month and salt cell service at $15/month (includes a quarterly cell clean).
- Guide visitors to book: point them to the free inspection / quote request at /request-inspection, or to call or text (469) 744-0379.

Style: warm, confident, short. 2–4 sentences or a tight bullet list. Use plain English (or Spanish if the visitor writes in Spanish). If you don't know something — scheduling for a specific address, an existing account, billing details — say so and hand off to the office by phone/text or the quote form. Never ask for card numbers or passwords.`;

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
          messages: convertToModelMessages(messages as UIMessage[]),
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
