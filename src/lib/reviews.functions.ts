import { createServerFn } from "@tanstack/react-start";

import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Customer reviews collected on the website. Everything a visitor submits
 * lands as `pending`; only office staff can approve, edit or hide a review,
 * and only approved reviews are ever read publicly.
 */

export type ReviewStatus = "pending" | "approved" | "hidden";

export interface PublicReview {
  id: string;
  rating: number;
  body: string;
  author_name: string;
  author_city: string | null;
  created_at: string;
}

export interface AdminReview extends PublicReview {
  contact_email: string | null;
  status: ReviewStatus;
  featured: boolean;
  source: string;
  page_path: string | null;
  approved_at: string | null;
}

const TABLE = "ss_site_reviews";

/** Strip links and control characters — review text is plain prose only. */
function clean(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/www\.\S+/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const SubmitSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(1200),
  author_name: z.string().trim().min(2).max(80),
  author_city: z.string().trim().max(80).optional().nullable(),
  contact_email: z.string().trim().email().max(200).optional().or(z.literal("")).nullable(),
  page_path: z.string().trim().max(200).optional().nullable(),
});

export type SubmitReviewInput = z.infer<typeof SubmitSchema>;

/** Public: anyone can leave a review. Saved as pending, never shown yet. */
export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SubmitSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequest } = await import("@tanstack/react-start/server");

    const headers = getRequest().headers;
    const ip =
      headers.get("cf-connecting-ip") ||
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const { data: allowed } = await (
      supabaseAdmin as unknown as {
        rpc: (
          fn: "ss_rate_limit_hit",
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown }>;
      }
    ).rpc("ss_rate_limit_hit", {
      _bucket: "site_review",
      _identifier: ip,
      _window_seconds: 3600,
      _max_hits: 5,
    });
    if (allowed === false) {
      return { ok: false, error: "Too many reviews from this connection. Try again later." };
    }

    const body = clean(data.body);
    const name = clean(data.author_name);
    if (body.length < 10 || name.length < 2) {
      return { ok: false, error: "Please add a little more detail." };
    }

    const { error } = await (supabaseAdmin as unknown as {
      from: (t: string) => {
        insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
    })
      .from(TABLE)
      .insert({
        rating: data.rating,
        body,
        author_name: name,
        author_city: data.author_city ? clean(data.author_city) : null,
        contact_email: data.contact_email || null,
        page_path: data.page_path || null,
        status: "pending",
        source: "web",
      });

    if (error) return { ok: false, error: "We could not save that review. Please try again." };
    return { ok: true };
  });

/** Public: approved reviews for the home page. Featured first, then newest. */
export const listApprovedReviews = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicReview[]> => {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
      const url = process.env["SUPABASE_URL"]!;
      if (!key || !url) return [];
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input: RequestInfo | URL, init?: RequestInit) => {
            const h = new Headers(init?.headers);
            if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
              h.delete("Authorization");
            }
            h.set("apikey", key);
            return fetch(input, { ...init, headers: h });
          },
        },
      });

      const { data, error } = await (client as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (
              c: string,
              v: string,
            ) => {
              order: (
                c: string,
                o: { ascending: boolean },
              ) => {
                order: (
                  c: string,
                  o: { ascending: boolean },
                ) => {
                  limit: (
                    n: number,
                  ) => Promise<{ data: PublicReview[] | null; error: unknown }>;
                };
              };
            };
          };
        };
      })
        .from(TABLE)
        .select("id, rating, body, author_name, author_city, created_at")
        .eq("status", "approved")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);

      if (error || !data) return [];
      return data;
    } catch {
      return [];
    }
  },
);

/* ------------------------------- admin side ------------------------------ */

async function assertOffice(supabase: unknown): Promise<void> {
  const { data: isOffice } = await (
    supabase as { rpc: (fn: "ss_is_office") => Promise<{ data: unknown }> }
  ).rpc("ss_is_office");
  if (isOffice !== true) throw new Error("Office access required");
}

/** Admin: every review, whatever its status. */
export const listAllReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminReview[]> => {
    await assertOffice(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => Promise<{ data: AdminReview[] | null }>;
        };
      };
    })
      .from(TABLE)
      .select(
        "id, rating, body, author_name, author_city, contact_email, status, featured, source, page_path, created_at, approved_at",
      )
      .order("created_at", { ascending: false });
    return data ?? [];
  });

const SaveSchema = z.object({
  id: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(3).max(1200),
  author_name: z.string().trim().min(2).max(80),
  author_city: z.string().trim().max(80).nullable().optional(),
  status: z.enum(["pending", "approved", "hidden"]),
  featured: z.boolean(),
});

/** Admin: create or update one review. */
export const saveReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertOffice(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = {
      rating: data.rating,
      body: clean(data.body),
      author_name: clean(data.author_name),
      author_city: data.author_city ? clean(data.author_city) : null,
      status: data.status,
      featured: data.featured,
      approved_at: data.status === "approved" ? new Date().toISOString() : null,
    };

    const table = (supabaseAdmin as unknown as {
      from: (t: string) => {
        insert: (r: Record<string, unknown>) => Promise<{ error: unknown }>;
        update: (r: Record<string, unknown>) => {
          eq: (c: string, v: string) => Promise<{ error: unknown }>;
        };
      };
    }).from(TABLE);

    if (data.id) await table.update(row).eq("id", data.id);
    else await table.insert({ ...row, source: "staff" });

    return { ok: true };
  });

/** Admin: delete a review outright. */
export const deleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertOffice(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as unknown as {
      from: (t: string) => {
        delete: () => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
      };
    })
      .from(TABLE)
      .delete()
      .eq("id", data.id);
    return { ok: true };
  });
