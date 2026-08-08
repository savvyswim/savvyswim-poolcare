import { useRef, useState } from "react";
import { Check, Download, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PACK_UNITS, STOCK_UNITS } from "@/crm/lib/units";

export type ImportRow = {
  name: string;
  unit: string;
  quantity: number;
  low_threshold: number;
  unit_cost: number | null;
  pack_size: number | null;
  pack_unit: string | null;
  /** Matches an existing item by name — import updates instead of inserting. */
  existingId: string | null;
  error: string | null;
};

const TEMPLATE =
  "name,unit,quantity,reorder_at,unit_cost,pack_size,pack_unit\n" +
  "Liquid Chlorine,gal,24,10,3.25,,\n" +
  "Cyanuric Acid,bag,6,2,18.00,40,lb\n" +
  "Muriatic Acid,case,4,2,22.50,2,gal\n";

/** Minimal RFC4180 splitter — handles quoted fields and escaped quotes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

const HEADER_ALIASES: Record<string, string> = {
  name: "name", item: "name", "item name": "name", product: "name",
  unit: "unit", uom: "unit", units: "unit",
  quantity: "quantity", qty: "quantity", "on hand": "quantity", on_hand: "quantity", onhand: "quantity", stock: "quantity",
  reorder_at: "low_threshold", "reorder at": "low_threshold", reorder: "low_threshold",
  low_threshold: "low_threshold", "low threshold": "low_threshold", min: "low_threshold", par: "low_threshold",
  unit_cost: "unit_cost", "unit cost": "unit_cost", cost: "unit_cost", price: "unit_cost",
  pack_size: "pack_size", "pack size": "pack_size",
  pack_unit: "pack_unit", "pack unit": "pack_unit",
};

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Parses a pasted or uploaded CSV into validated inventory rows. Names are
 * matched (case-insensitively) against the current shelf so a re-import
 * updates existing items rather than creating duplicates.
 */
export function parseInventoryCsv(
  text: string,
  existing: { id: string; name: string }[],
): { rows: ImportRow[]; headerError: string | null } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { rows: [], headerError: "That file is empty." };

  const header = splitCsvLine(lines[0]!).map((h) => HEADER_ALIASES[h.toLowerCase()] ?? h.toLowerCase());
  if (!header.includes("name")) {
    return { rows: [], headerError: "Missing a name column. First row must be a header (name,unit,quantity,reorder_at…)." };
  }

  const byName = new Map(existing.map((e) => [e.name.trim().toLowerCase(), e.id]));
  const seen = new Set<string>();
  const rows: ImportRow[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const get = (key: string) => {
      const idx = header.indexOf(key);
      return idx === -1 ? undefined : cells[idx];
    };

    const name = (get("name") ?? "").trim();
    if (!name) continue;

    const unitRaw = (get("unit") ?? "ea").trim().toLowerCase() || "ea";
    const qty = get("quantity") === undefined || get("quantity") === "" ? 0 : num(get("quantity"));
    const low = get("low_threshold") === undefined || get("low_threshold") === "" ? 0 : num(get("low_threshold"));
    const costRaw = get("unit_cost");
    const cost = costRaw === undefined || costRaw === "" ? null : num(costRaw);
    const packRaw = get("pack_size");
    const packSize = packRaw === undefined || packRaw === "" ? null : num(packRaw);
    const packUnit = (get("pack_unit") ?? "").trim().toLowerCase() || null;

    let error: string | null = null;
    const key = name.toLowerCase();
    if (seen.has(key)) error = "Duplicate row in this file";
    else if (name.length > 120) error = "Name is too long";
    else if (!STOCK_UNITS.includes(unitRaw)) error = `Unknown unit "${unitRaw}"`;
    else if (!Number.isFinite(qty) || qty < 0) error = "On-hand must be a positive number";
    else if (!Number.isFinite(low) || low < 0) error = "Reorder point must be a positive number";
    else if (cost !== null && (!Number.isFinite(cost) || cost < 0)) error = "Unit cost must be a positive number";
    else if (packSize !== null && (!Number.isFinite(packSize) || packSize <= 0)) error = "Pack size must be a positive number";
    else if (packSize !== null && (!packUnit || !PACK_UNITS.includes(packUnit))) error = "Pack size needs a valid pack unit (lb, gal…)";

    seen.add(key);
    rows.push({
      name,
      unit: unitRaw,
      quantity: Number.isFinite(qty) ? Math.round(qty * 100) / 100 : 0,
      low_threshold: Number.isFinite(low) ? Math.round(low * 100) / 100 : 0,
      unit_cost: cost,
      pack_size: packSize,
      pack_unit: packSize !== null ? packUnit : null,
      existingId: byName.get(key) ?? null,
      error,
    });
  }

  if (!rows.length) return { rows, headerError: "No item rows found under the header." };
  return { rows, headerError: null };
}

/** Bulk CSV upload panel for the inventory shelf. */
export default function InventoryImport({
  existing,
  onDone,
  onClose,
}: {
  existing: { id: string; name: string }[];
  onDone: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ok = (rows ?? []).filter((r) => !r.error);
  const bad = (rows ?? []).filter((r) => r.error);
  const news = ok.filter((r) => !r.existingId).length;
  const updates = ok.length - news;

  function preview(raw: string) {
    setText(raw);
    const res = parseInventoryCsv(raw, existing);
    setRows(res.rows);
    setHeaderError(res.headerError);
  }

  async function onFile(file: File) {
    if (file.size > 2_000_000) { toast.error("That file is larger than 2 MB."); return; }
    preview(await file.text());
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "savvy-inventory-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runImport() {
    if (!ok.length) return;
    setBusy(true);
    let created = 0;
    let updated = 0;
    let failed = 0;

    const inserts = ok
      .filter((r) => !r.existingId)
      .map((r) => ({
        name: r.name,
        unit: r.unit,
        quantity: r.quantity,
        low_threshold: r.low_threshold,
        ...(r.unit_cost !== null ? { unit_cost: r.unit_cost } : {}),
        pack_size: r.pack_size,
        pack_unit: r.pack_unit,
      }));

    if (inserts.length) {
      const { error } = await supabase.from("ss_inventory").insert(inserts);
      if (error) { failed += inserts.length; toast.error(`New items failed: ${error.message}`); }
      else created = inserts.length;
    }

    for (const r of ok.filter((x) => x.existingId)) {
      const { error } = await supabase
        .from("ss_inventory")
        .update({
          unit: r.unit,
          quantity: r.quantity,
          low_threshold: r.low_threshold,
          ...(r.unit_cost !== null ? { unit_cost: r.unit_cost } : {}),
          pack_size: r.pack_size,
          pack_unit: r.pack_unit,
        })
        .eq("id", r.existingId!);
      if (error) failed += 1; else updated += 1;
    }

    setBusy(false);
    if (created || updated) {
      toast.success(`Imported ${created} new item(s), updated ${updated}${failed ? `, ${failed} failed` : ""}`);
      setText("");
      setRows(null);
      onDone();
      onClose();
    } else if (failed) {
      toast.error("Nothing imported — check the errors and try again.");
    }
  }

  return (
    <div className="ss-card space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="ss-tag" style={{ fontSize: "0.55rem" }}>Bulk CSV import</div>
        <button className="ss-btn ss-btn-ghost ml-auto" onClick={downloadTemplate}>
          <Download size={13} /> Template
        </button>
        <button className="ss-btn ss-btn-ghost" onClick={onClose}>
          <X size={13} /> Close
        </button>
      </div>

      <p className="text-[0.74rem] opacity-70">
        Columns: <span className="ss-num">name, unit, quantity, reorder_at, unit_cost, pack_size, pack_unit</span>.
        Only <span className="ss-num">name</span> is required. Items already on the shelf are matched by name and updated.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
        <button className="ss-btn" onClick={() => fileRef.current?.click()}>
          <Upload size={13} /> Choose CSV file
        </button>
        <span className="text-[0.72rem] opacity-60">or paste rows below</span>
      </div>

      <textarea
        className="ss-input w-full font-mono text-[0.72rem]"
        rows={5}
        placeholder={"name,unit,quantity,reorder_at\nLiquid Chlorine,gal,24,10"}
        value={text}
        onChange={(e) => preview(e.target.value)}
      />

      {headerError && (
        <p className="text-[0.76rem] font-semibold text-[hsl(var(--ss-burgundy))]">{headerError}</p>
      )}

      {rows && !headerError && (
        <div className="space-y-2">
          <div className="text-[0.76rem]">
            <span className="font-semibold">{ok.length} ready</span>
            {" · "}{news} new · {updates} update{updates === 1 ? "" : "s"}
            {bad.length > 0 && (
              <span className="ml-1 font-semibold text-[hsl(var(--ss-burgundy))]">· {bad.length} with errors</span>
            )}
          </div>

          <div className="max-h-64 overflow-auto border" style={{ borderColor: "hsl(var(--ss-sand))" }}>
            <table className="w-full text-[0.72rem]">
              <thead>
                <tr className="text-left opacity-60">
                  <th className="p-1">Item</th>
                  <th className="p-1">Unit</th>
                  <th className="p-1 text-right">On hand</th>
                  <th className="p-1 text-right">Reorder</th>
                  <th className="p-1 text-right">Cost</th>
                  <th className="p-1">Pack</th>
                  <th className="p-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.name}-${i}`} className="border-t" style={{ borderColor: "hsl(var(--ss-sand))" }}>
                    <td className="p-1 font-semibold">{r.name}</td>
                    <td className="p-1">{r.unit}</td>
                    <td className="ss-num p-1 text-right">{r.quantity}</td>
                    <td className="ss-num p-1 text-right">{r.low_threshold}</td>
                    <td className="ss-num p-1 text-right">{r.unit_cost === null ? "—" : `$${r.unit_cost.toFixed(2)}`}</td>
                    <td className="p-1">{r.pack_size ? `${r.pack_size} ${r.pack_unit}` : "—"}</td>
                    <td className="p-1">
                      {r.error ? (
                        <span className="font-semibold text-[hsl(var(--ss-burgundy))]">{r.error}</span>
                      ) : r.existingId ? (
                        <span className="opacity-70">Update</span>
                      ) : (
                        <span className="opacity-70">New</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="ss-btn" disabled={busy || !ok.length} onClick={() => void runImport()}>
            <Check size={13} /> {busy ? "Importing…" : `Import ${ok.length} item(s)`}
          </button>
        </div>
      )}
    </div>
  );
}
