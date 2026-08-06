import { useState } from "react";
import { Copy, ImagePlus, Send, Star, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";

const GOOGLE_KEY = "ss_google_review_url";
const YEAR = 60 * 60 * 24 * 365;

type ReviewRow = {
  id: string;
  token: string;
  customer_name: string;
  phone: string | null;
  message: string | null;
  photos: string[] | null;
  google_url: string;
  created_at: string;
  opened_at: string | null;
  clicked_at: string | null;
};

export default function Reviews() {
  const [googleUrl, setGoogleUrl] = useState(
    () => localStorage.getItem(GOOGLE_KEY) ?? "",
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState(
    "{name}, thank you for trusting Savvy Swim with your pool. Here are photos from today's visit — your water is dialed in. If it looks as good to you as it does to us, {first} , would you leave us a quick Google review? It takes 20 seconds and it means everything to the crew that services your pool.",
  );

  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const personalize = (text: string) =>
    text.replace(/\{name\}/g, name.trim()).replace(/\{first\}/g, firstName);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const { rows, refetch } = useTable<ReviewRow>("review-requests", async () => {
    const { data } = await supabase
      .from("ss_review_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    return (data ?? []) as ReviewRow[];
  });

  function linkFor(token: string) {
    return `${window.location.origin}/review/${token}`;
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const next: string[] = [];
    for (const file of Array.from(files).slice(0, 8)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("review-photos").upload(path, file, {
        contentType: file.type || "image/jpeg",
      });
      if (error) {
        toast.error(error.message);
        continue;
      }
      const { data } = await supabase.storage
        .from("review-photos")
        .createSignedUrl(path, YEAR);
      if (data?.signedUrl) next.push(data.signedUrl);
    }
    setPhotos((p) => [...p, ...next]);
    setUploading(false);
    if (next.length) toast.success(`${next.length} photo${next.length > 1 ? "s" : ""} added`);
  }

  async function createRequest(send: boolean) {
    if (!name.trim()) { toast.error("Add the customer name"); return; }
    if (!/^https?:\/\//.test(googleUrl.trim()))
      { toast.error("Add your Google review link first"); return; }
    if (send && !phone.trim()) { toast.error("Add a phone number to text the link"); return; }

    setBusy(true);
    localStorage.setItem(GOOGLE_KEY, googleUrl.trim());

    const { data, error } = await supabase
      .from("ss_review_requests")
      .insert({
        customer_name: name.trim(),
        phone: phone.trim() || null,
        message: personalize(note).trim() || null,
        photos,
        google_url: googleUrl.trim(),
      })
      .select("token")
      .single();

    if (error || !data) {
      setBusy(false);
      { toast.error(error?.message ?? "Could not create the review link"); return; }
    }

    const url = linkFor(data.token);

    if (send) {
      const { error: smsErr } = await supabase.functions.invoke("send-quote-sms", {
        body: {
          phone: phone.trim(),
          message: `Hi ${firstName}, it's the Savvy Swim crew — your pool is done and today's photos are ready. ${firstName}, if we earned it, would you leave us a quick Google review? Takes 20 seconds:`,
          link: url,
        },
      });
      if (smsErr) toast.error("Link created, but the text failed to send");
      else toast.success("Photos + review link texted");
    } else {
      void navigator.clipboard.writeText(url);
      toast.success("Review link copied");
    }

    setName("");
    setPhone("");
    setPhotos([]);
    setBusy(false);
    void refetch();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("ss_review_requests").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed");
    void refetch();
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Google reviews"
        sub="Send the customer their job photos with a one-tap review button"
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="ss-card p-4">
          <div className="ss-label mb-2">Your Google review link</div>
          <input
            className="ss-input"
            placeholder="https://g.page/r/…/review"
            value={googleUrl}
            onChange={(e) => setGoogleUrl(e.target.value)}
            onBlur={() => localStorage.setItem(GOOGLE_KEY, googleUrl.trim())}
          />
          <p className="mt-2 text-[0.75rem] opacity-70">
            Google Business Profile → Ask for reviews → copy the short link. Saved on this device
            and stamped on every review page you send.
          </p>

          <div className="ss-label mt-4 mb-2">Job photos</div>
          <label className="ss-btn ss-btn-ghost inline-flex cursor-pointer">
            <ImagePlus size={13} /> {uploading ? "Uploading…" : "Add photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void onUpload(e.target.files)}
            />
          </label>
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {photos.map((p) => (
                <div key={p} className="relative">
                  <img
                    src={p}
                    alt="Job photo"
                    loading="lazy"
                    className="h-20 w-full rounded-md object-cover"
                  />
                  <button
                    className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white"
                    aria-label="Remove photo"
                    onClick={() => setPhotos((all) => all.filter((x) => x !== p))}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ss-card p-4">
          <div className="ss-label mb-2">Customer</div>
          <input
            className="ss-input"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="ss-input mt-2"
            placeholder="Mobile number"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div className="ss-label mt-3 mb-1">Note on the page</div>
          <textarea
            className="ss-input"
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="mt-1 text-[0.72rem] opacity-60">
            Use <code>{"{name}"}</code> for the full name and <code>{"{first}"}</code> for the first
            name — they're swapped in automatically.
          </p>
          {name.trim() && (
            <div className="mt-2 rounded-md p-2 text-[0.78rem]" style={{ background: "hsl(var(--ss-sand) / .5)" }}>
              <span className="ss-label">Preview</span>
              <div className="mt-1">{personalize(note)}</div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="ss-btn" disabled={busy} onClick={() => void createRequest(true)}>
              <Send size={13} /> Text photos + review link
            </button>
            <button
              className="ss-btn ss-btn-ghost"
              disabled={busy}
              onClick={() => void createRequest(false)}
            >
              <Copy size={13} /> Create link only
            </button>
          </div>
        </div>
      </div>

      <div className="ss-card p-4">
        <div className="ss-label mb-3">Sent review requests</div>
        {rows.length === 0 ? (
          <EmptyState>No review links yet.</EmptyState>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0"
                style={{ borderColor: "hsl(var(--ss-sand))" }}
              >
                <div className="min-w-0">
                  <div className="text-[0.88rem] font-semibold">{r.customer_name}</div>
                  <div className="text-[0.75rem] opacity-60">
                    {new Date(r.created_at).toLocaleString()} ·{" "}
                    {(r.photos?.length ?? 0)} photo{(r.photos?.length ?? 0) === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {r.clicked_at ? (
                    <Chip tone="aqua">
                      <Star size={10} /> Reviewed
                    </Chip>
                  ) : r.opened_at ? (
                    <Chip>Opened</Chip>
                  ) : (
                    <Chip>Sent</Chip>
                  )}
                  <button
                    className="ss-btn ss-btn-ghost"
                    onClick={() => {
                      void navigator.clipboard.writeText(linkFor(r.token));
                      toast.success("Link copied");
                    }}
                  >
                    <Copy size={12} /> Copy
                  </button>
                  <a
                    className="ss-btn ss-btn-ghost !no-underline"
                    href={linkFor(r.token)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={12} /> Open
                  </a>
                  <button className="ss-btn ss-btn-ghost" onClick={() => void remove(r.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
