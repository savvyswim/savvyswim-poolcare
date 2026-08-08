import { useCallback, useEffect, useRef, useState } from "react";
import { CloudHail, ImagePlus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Photo = { path: string; name: string };

type Report = {
  id: string;
  kind: string;
  occurred_on: string | null;
  notes: string;
  photos: Photo[];
  status: string;
  office_notes: string | null;
  created_at: string;
};

const KINDS = [
  { value: "hail", label: "Hail damage" },
  { value: "storm", label: "Storm / wind" },
  { value: "equipment", label: "Equipment damage" },
  { value: "other", label: "Other damage" },
];

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  reviewing: "In review",
  scheduled: "Inspection scheduled",
  closed: "Closed",
};

const MAX_FILES = 12;
const MAX_BYTES = 10 * 1024 * 1024;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalDamageReport({ customerId }: { customerId: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [kind, setKind] = useState("hail");
  const [occurredOn, setOccurredOn] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("ss_damage_reports")
      .select("id, kind, occurred_on, notes, photos, status, office_notes, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    const rows = ((data ?? []) as unknown as Report[]).map((r) => ({
      ...r,
      photos: Array.isArray(r.photos) ? r.photos : [],
    }));
    setReports(rows);

    const paths = rows.flatMap((r) => r.photos.map((p) => p.path)).filter(Boolean);
    if (paths.length) {
      const { data: urls } = await supabase.storage.from("damage-photos").createSignedUrls(paths, 3600);
      const map: Record<string, string> = {};
      for (const u of urls ?? []) if (u.path && u.signedUrl) map[u.path] = u.signedUrl;
      setSigned(map);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: File[] = [];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} isn't an image`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} is over 10MB`);
        continue;
      }
      next.push(f);
    }
    setPending((prev) => [...prev, ...next].slice(0, MAX_FILES));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    if (!notes.trim() && !pending.length) {
      toast.error("Add a photo or a note so we know what to look at.");
      return;
    }
    setBusy(true);
    try {
      const uploaded: Photo[] = [];
      for (const file of pending) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${customerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("damage-photos").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) throw error;
        uploaded.push({ path, name: file.name });
      }

      const { error: insErr } = await supabase.from("ss_damage_reports").insert({
        customer_id: customerId,
        kind,
        occurred_on: occurredOn || null,
        notes: notes.trim(),
        photos: uploaded as unknown as never,
      });
      if (insErr) throw insErr;

      toast.success("Sent to the office — we'll review before your inspection.");
      setNotes("");
      setOccurredOn("");
      setPending([]);
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 border border-primary/15 bg-background p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <CloudHail className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 className="font-display text-xl uppercase leading-none">Storm &amp; hail damage</h2>
      </div>
      <p className="mt-2 font-tech text-xs text-primary/60">
        Upload photos and notes before your inspection so your tech arrives knowing exactly what to check.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-tech text-[10px] uppercase tracking-widest text-primary/60">Damage type</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="mt-1 w-full border border-primary/20 bg-background px-3 py-2 font-tech text-sm"
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-tech text-[10px] uppercase tracking-widest text-primary/60">When did it happen?</span>
          <input
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            className="mt-1 w-full border border-primary/20 bg-background px-3 py-2 font-tech text-sm"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="font-tech text-[10px] uppercase tracking-widest text-primary/60">What did you notice?</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Dents on the heater housing, cracked skimmer lid, debris in the pool after Tuesday's storm…"
          className="mt-1 w-full border border-primary/20 bg-background px-3 py-2 font-tech text-sm"
        />
      </label>

      <div className="mt-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 border border-primary/25 px-3 py-2 font-tech text-xs uppercase tracking-widest hover:bg-primary/5"
        >
          <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
          Add photos
        </button>
        <span className="ml-3 font-tech text-[11px] text-primary/50">
          Up to {MAX_FILES} photos · 10MB each
        </span>

        {pending.length > 0 && (
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {pending.map((f, i) => (
              <li key={`${f.name}-${i}`} className="relative border border-primary/15">
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="h-24 w-full object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => setPending((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute right-1 top-1 bg-background/90 p-1 text-primary"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="mt-5 inline-flex items-center gap-2 bg-primary px-4 py-2 font-tech text-xs uppercase tracking-widest text-background disabled:opacity-60"
      >
        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
        {busy ? "Sending…" : "Submit to the office"}
      </button>

      {reports.length > 0 && (
        <div className="mt-8 border-t border-primary/10 pt-5">
          <h3 className="font-tech text-[10px] uppercase tracking-widest text-primary/60">Your submissions</h3>
          <ul className="mt-3 space-y-4">
            {reports.map((r) => (
              <li key={r.id} className="border border-primary/12 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-base uppercase leading-none">
                    {KINDS.find((k) => k.value === r.kind)?.label ?? r.kind}
                  </p>
                  <span className="border border-accent px-2 py-1 font-tech text-[10px] uppercase tracking-widest text-accent">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                <p className="mt-1 font-tech text-[11px] text-primary/55">
                  Sent {fmtDate(r.created_at)}
                  {r.occurred_on ? ` · damage on ${fmtDate(r.occurred_on)}` : ""}
                </p>
                {r.notes && <p className="mt-2 font-tech text-sm text-primary/80">{r.notes}</p>}
                {r.office_notes && (
                  <p className="mt-2 border-l-2 border-accent pl-3 font-tech text-sm text-primary/70">
                    Office: {r.office_notes}
                  </p>
                )}
                {r.photos.length > 0 && (
                  <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {r.photos.map((p) => (
                      <li key={p.path} className="border border-primary/12">
                        {signed[p.path] ? (
                          <a href={signed[p.path]} target="_blank" rel="noreferrer">
                            <img src={signed[p.path]} alt={p.name} className="h-20 w-full object-cover" />
                          </a>
                        ) : (
                          <div className="h-20 w-full bg-primary/5" />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
