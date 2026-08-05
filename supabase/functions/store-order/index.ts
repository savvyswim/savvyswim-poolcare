import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (body.action === "check_promo") {
      const code = str(body.code, 64);
      const subtotal = Number(body.subtotal);
      if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
        return json({ valid: false, message: "That code is not valid" });
      }
      const { data, error } = await supabase.rpc("check_promo_code", {
        p_code: code,
        p_subtotal: subtotal,
      });
      if (error) {
        console.error("check_promo_code failed", error);
        return json({ valid: false, message: "We couldn't apply that code" });
      }
      return json(data);
    }

    if (body.action === "place_order") {
      const name = str(body.customer_name, 120);
      const email = str(body.email, 200);
      const items = Array.isArray(body.items) ? body.items : [];
      if (!name || name.length < 2) return json({ error: "Invalid name" }, 400);
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return json({ error: "Invalid email" }, 400);
      }
      if (items.length === 0 || items.length > 50) return json({ error: "Invalid cart" }, 400);

      const cleanItems = items.map((raw) => {
        const line = (raw ?? {}) as Record<string, unknown>;
        return {
          product_id: str(line.product_id, 64),
          quantity: Math.max(1, Math.min(999, Number(line.quantity) || 1)),
        };
      });

      const { data, error } = await supabase.rpc("place_store_order", {
        p_customer_name: name,
        p_email: email,
        p_phone: str(body.phone, 40),
        p_address: str(body.address, 300),
        p_city: str(body.city, 120),
        p_state: str(body.state, 60),
        p_postal_code: str(body.postal_code, 20),
        p_notes: str(body.notes, 2000),
        p_items: cleanItems,
        p_promo_code: str(body.promo_code, 64),
      });

      if (error || !data) {
        console.error("place_store_order failed", error);
        return json({ error: "We couldn't place your order" }, 400);
      }
      return json({ order_number: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("store-order error", err);
    return json({ error: "Unexpected error" }, 500);
  }
});
