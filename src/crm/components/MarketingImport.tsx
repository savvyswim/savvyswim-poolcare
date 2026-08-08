import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  source: string;
  error?: string;
};

const ALIASES: Record<string, keyof Row> = {
  name: "full_name", "full name": "full_name", full_name: "full_name", customer: "full_name",
  email: "email", "e-mail": "email", "email address": "email",
  phone: "phone", mobile: "phone", "phone number": "phone", cell: "phone",
  address: "address", street: "address", "service address": "address",
  city: "city", town: "city",
  source: "source", lead_source: "source", "lead source": "source",
};

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (ch === "," && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseMarketingCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const header = splitLine(lines[0]!).map((h) => h.toLowerCase());
  const mapped = header.map((h) => ALIASES[h] ?? null);
  const hasHeader = mapped.some(Boolean);
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const cols: (keyof Row | null)[] = hasHeader ? mapped : ["full_name", "email", "phone", "address", "city"];

  return dataLines.map((line) => {
    const cells = splitLine(line);
    const row: Row = { full_name: "", email: null, phone: null, address: null, city: null, source: "csv_import" };
    cols.forEach((key, i) => {
      if (!key || key === "error") return;
      const v = (cells[i] ?? "").trim();
      if (!v) return;
      (row as Record<string, unknown>)[key] = v;
    });
    if (!row.full_name && row.email) row.full_name = row.email.split("@")[0]!;
    if (!row.full_name) row.error = "Missing name and email";
    else if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) row.error = `Invalid email "${row.email}"`;
    else if (!row.email && !row.phone) row.error = "Needs an email or a phone";
    return row;
  });
}

const normEmail = (v: string | null | undefined) => (v ?? "").trim().toLowerCase() || null;

// Match phones on their last 10 digits so formatting differences don't create duplicates.
const normPhone = (v: string | null | undefined) => {
  const digits = (v ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
};

const TEMPLATE = "name,email,phone,address,city,source\nJane Doe,jane@example.com,469-555-0134,123 Palm Dr,Frisco,facebook\n";

export default function MarketingImport({ onDone }: { onDone?: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => (text.trim() ? parseMarketingCsv(text) : []), [text]);
  const valid = rows.filter((r) => !r.error);
  const bad = rows.filter((r) => r.error);

  async function importRows() {
    if (!valid.length) return;
    setBusy(true);
    try {
      // Pull existing pipeline leads so we can match on email AND phone.
      const { data: existing, error: loadErr } = await supabase
        .from("ss_leads")
        .select("id,email,phone")
        .limit(20000);
      if (loadErr) throw loadErr;

      const byEmail = new Map<string, string>();
      const byPhone = new Map<string, string>();
      for (const e of (existing ?? []) as { id: string; email: string | null; phone: string | null }[]) {
        const em = normEmail(e.email);
        if (em && !byEmail.has(em)) byEmail.set(em, e.id);
        const ph = normPhone(e.phone);
        if (ph && !byPhone.has(ph)) byPhone.set(ph, e.id);
      }

      let updated = 0;
      let inserted = 0;
      let skipped = 0;
      const toInsert: Omit<Row, "error">[] = [];
      const seenEmail = new Set<string>();
      const seenPhone = new Set<string>();

      for (const r of valid) {
        const em = normEmail(r.email);
        const ph = normPhone(r.phone);

        // Duplicate rows inside the same file
        if ((em && seenEmail.has(em)) || (ph && seenPhone.has(ph))) {
          skipped++;
          continue;
        }
        if (em) seenEmail.add(em);
        if (ph) seenPhone.add(ph);

        const id = (em ? byEmail.get(em) : undefined) ?? (ph ? byPhone.get(ph) : undefined);
        if (id) {
          const patch: {
            full_name: string;
            email?: string;
            phone?: string;
            address?: string;
            city?: string;
          } = { full_name: r.full_name };
          if (r.email) patch.email = r.email;
          if (r.phone) patch.phone = r.phone;
          if (r.address) patch.address = r.address;
          if (r.city) patch.city = r.city;
          const { error } = await supabase.from("ss_leads").update(patch).eq("id", id);
          if (!error) updated++;
        } else {
          toInsert.push({ full_name: r.full_name, email: r.email, phone: r.phone, address: r.address, city: r.city, source: r.source });
          if (em) byEmail.set(em, "pending");
          if (ph) byPhone.set(ph, "pending");
        }
      }

      if (toInsert.length) {
        const { error, data } = await supabase.from("ss_leads").insert(toInsert).select("id");
        if (error) throw error;
        inserted = data?.length ?? toInsert.length;
      }

      toast.success(
        `Imported ${inserted} new contact${inserted === 1 ? "" : "s"}` +
          (updated ? `, updated ${updated}` : "") +
          (skipped ? `, skipped ${skipped} duplicate row${skipped === 1 ? "" : "s"}` : ""),
      );


      toast.success(`Imported ${inserted} new contact${inserted === 1 ? "" : "s"}${updated ? `, updated ${updated}` : ""}`);
      setText("");
      if (fileRef.current) fileRef.current.value = "";
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "savvy-marketing-contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ss-card p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Upload size={16} />
        <div className="ss-label !mb-0">Import contacts (CSV)</div>
        <div className="flex-1" />
        <button className="ss-btn ss-btn-ghost" onClick={downloadTemplate}>Template</button>
      </div>
      <div className="mb-2 text-[0.75rem] opacity-70">
        Columns: name, email, phone, address, city, source. Contacts land in the pipeline as new leads.
        Existing emails are updated, not duplicated.
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="ss-input"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setText(await f.text());
        }}
      />

      <label className="ss-label mt-2.5">Or paste rows</label>
      <textarea
        className="ss-input font-mono text-[0.78rem]"
        rows={5}
        placeholder="name,email,phone,city"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {!!rows.length && (
        <div className="mt-2.5">
          <div className="text-[0.78rem]">
            {valid.length} ready{bad.length ? ` · ${bad.length} with errors` : ""}
          </div>
          <div className="mt-1.5 max-h-52 overflow-auto">
            <table className="ss-table w-full text-[0.75rem]">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Phone</th><th>City</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i}>
                    <td>{r.full_name || "—"}</td>
                    <td>{r.email ?? "—"}</td>
                    <td>{r.phone ?? "—"}</td>
                    <td>{r.city ?? "—"}</td>
                    <td style={{ color: r.error ? "hsl(var(--ss-burgundy))" : undefined }}>{r.error ?? "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button className="ss-btn mt-3 w-full" disabled={busy || !valid.length} onClick={importRows}>
        {busy ? "Importing…" : `Import ${valid.length} contact${valid.length === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}
