/**
 * Server-only helper that fires a signed, simulated CRM appointment-status
 * webhook at our own public endpoint so admins can verify the full
 * email/SMS notification path end to end.
 */
import { createHmac } from "node:crypto";

export type SimulateInput = {
  status: string;
  email: string | null;
  phone: string | null;
  customerName: string | null;
  technician: string | null;
  arrivalWindow: string | null;
  scheduledDate: string | null;
  message: string | null;
  channels: string[];
  auth: "signature" | "bearer" | "none";
};

export type SimulateResult = {
  ok: boolean;
  status: number;
  eventId: string;
  url: string;
  requestBody: string;
  response: unknown;
};

export async function runWebhookSimulation(
  input: SimulateInput,
  origin: string,
): Promise<SimulateResult> {
  const secret = process.env["CRM_WEBHOOK_SECRET"];
  if (!secret) {
    throw new Error(
      "CRM_WEBHOOK_SECRET is not configured — add it before running the webhook test.",
    );
  }

  const eventId = `test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    event_id: eventId,
    appointment_id: `test-appt-${eventId}`,
    status: input.status,
    previous_status: "scheduled",
    customer: {
      name: input.customerName,
      email: input.email,
      phone: input.phone,
    },
    scheduled_date: input.scheduledDate,
    arrival_window: input.arrivalWindow,
    technician: input.technician,
    message: input.message,
    ...(input.channels.length ? { channels: input.channels } : {}),
    test: true,
  };

  const raw = JSON.stringify(payload);
  const url = `${origin.replace(/\/$/, "")}/api/public/hooks/crm-appointment-status`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (input.auth === "signature") {
    headers["X-Savvy-Signature"] = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  } else if (input.auth === "bearer") {
    headers["Authorization"] = `Bearer ${secret}`;
  }

  const res = await fetch(url, { method: "POST", headers, body: raw });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    /* keep raw text */
  }

  return {
    ok: res.ok,
    status: res.status,
    eventId,
    url,
    requestBody: JSON.stringify(payload, null, 2),
    response: parsed,
  };
}
