import { useMemo, useState } from "react";
import { Check, History, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkLowStock } from "@/lib/inventory-alerts.functions";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";


type Item = {
  id: string; name: string; unit: string | null; quantity: number; low_threshold: number;
};

const UNITS = ["ea", "lb", "gal", "bucket", "bag", "box", "case", "qt", "oz"];

type Move = {
  id: string; item_id: string; item_name: string; delta: number;
  quantity_after: number; reason: string; note: string | null; created_at: string;
};

const REASONS = [
  { value: "restock", label: "Restock / delivery" },
  { value: "used_on_job", label: "Used on a job" },
  { value: "correction", label: "Count correction" },
  { value: "damage", label: "Damaged / expired" },
  { value: "transfer", label: "Moved to a truck" },
  { value: "other", label: "Other" },
];

const reasonLabel = (v: string) => REASONS.find((r) => r.value === v)?.label ?? v;

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

const emptyDraft = { name: "", unit: "ea", quantity: 0, low_threshold: 5 };

export default function Inventory() {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ ...emptyDraft });
  const [busy, setBusy] = useState(false);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustDraft, setAdjustDraft] = useState({ amount: 1, dir: -1, reason: "used_on_job", note: "" });
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const runLowStockCheck = useServerFn(checkLowStock);

  /** Fires the reorder notification when a change drops an item to/below its point. */
  async function notifyIfLow(item: Item, nextQuantity: number) {
    if (nextQuantity > item.low_threshold) return;
    try {
      const res = await runLowStockCheck({ data: { itemIds: [item.id] } });
      if (res.notified.length) {
        toast.warning(`${item.name} hit its reorder point — office notified`);
      } else {
        toast.warning(`${item.name} is at its reorder point`);
      }
    } catch {
      toast.warning(`${item.name} is at its reorder point`);
    }
  }



  const { rows, refetch } = useTable<Item>("inventory", async () => {
    const { data } = await supabase
      .from("ss_inventory")
      .select("id,name,unit,quantity,low_threshold")
      .order("name");
    return (data ?? []) as Item[];
  });

  const { rows: moves, refetch: refetchMoves } = useTable<Move>("inventory-moves", async () => {
    const { data } = await supabase
      .from("ss_inventory_moves")
      .select("id,item_id,item_name,delta,quantity_after,reason,note,created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    return (data ?? []) as Move[];
  });

  const movesByItem = useMemo(() => {
    const m = new Map<string, Move[]>();
    for (const mv of moves) m.set(mv.item_id, [...(m.get(mv.item_id) ?? []), mv]);
    return m;
  }, [moves]);

  async function logMove(item: Item, delta: number, quantityAfter: number, reason: string, note?: string) {
    if (!delta) return;
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("ss_inventory_moves").insert({
      item_id: item.id,
      item_name: item.name,
      delta,
      quantity_after: quantityAfter,
      reason,
      note: note?.trim() ? note.trim() : null,
      actor_id: auth.user?.id ?? null,
    });
    if (error) { toast.error(`Adjustment saved, history not logged: ${error.message}`); return; }
    void refetchMoves();
  }

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => !t || `${r.name} ${r.unit ?? ""}`.toLowerCase().includes(t));
  }, [rows, q]);

  const low = rows.filter((r) => r.quantity <= r.low_threshold);
  const totalUnits = rows.reduce((s, r) => s + r.quantity, 0);

  async function adjust(item: Item, delta: number) {
    const next = Math.max(0, item.quantity + delta);
    const { error } = await supabase.from("ss_inventory").update({ quantity: next }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    await logMove(item, next - item.quantity, next, delta > 0 ? "restock" : "used_on_job");
    void notifyIfLow(item, next);
    void refetch();
  }

  async function setQuantity(item: Item, value: number) {
    const next = Math.max(0, Number.isFinite(value) ? value : 0);
    if (next === item.quantity) return;
    const { error } = await supabase.from("ss_inventory").update({ quantity: next }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    await logMove(item, next - item.quantity, next, "correction", "Count typed directly");
    void notifyIfLow(item, next);
    void refetch();
  }

  async function applyAdjustment(item: Item) {
    const amount = Math.abs(Number(adjustDraft.amount) || 0);
    if (!amount) { toast.error("Enter how many units."); return; }
    const delta = adjustDraft.dir * amount;
    const next = Math.max(0, item.quantity + delta);
    setBusy(true);
    const { error } = await supabase.from("ss_inventory").update({ quantity: next }).eq("id", item.id);
    if (error) { setBusy(false); toast.error(error.message); return; }
    await logMove(item, next - item.quantity, next, adjustDraft.reason, adjustDraft.note);
    void notifyIfLow(item, next);
    setBusy(false);

    setAdjustId(null);
    setAdjustDraft({ amount: 1, dir: -1, reason: "used_on_job", note: "" });
    toast.success(`${item.name} · ${delta > 0 ? "+" : ""}${delta} ${item.unit ?? "units"}`);
    void refetch();
  }

  async function addItem() {
    const name = draft.name.trim();
    if (!name) { toast.error("Give the item a name."); return; }
    if (rows.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      toast.error("That item is already on the shelf.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("ss_inventory").insert({
      name,
      unit: draft.unit || "ea",
      quantity: Math.max(0, Number(draft.quantity) || 0),
      low_threshold: Math.max(0, Number(draft.low_threshold) || 0),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${name} added to inventory`);
    void refetchMoves();
    setDraft({ ...emptyDraft });
    setAdding(false);
    void refetch();
  }

  function startEdit(i: Item) {
    setEditId(i.id);
    setEdit({
      name: i.name,
      unit: i.unit ?? "ea",
      quantity: i.quantity,
      low_threshold: i.low_threshold,
    });
  }

  async function saveEdit() {
    if (!editId) return;
    const name = edit.name.trim();
    if (!name) { toast.error("Give the item a name."); return; }
    setBusy(true);
    const { error } = await supabase
      .from("ss_inventory")
      .update({
        name,
        unit: edit.unit || "ea",
        quantity: Math.max(0, Number(edit.quantity) || 0),
        low_threshold: Math.max(0, Number(edit.low_threshold) || 0),
      })
      .eq("id", editId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setEditId(null);
    void refetch();
  }

  async function remove(i: Item) {
    if (!window.confirm(`Remove ${i.name} from inventory?`)) return;
    const { error } = await supabase.from("ss_inventory").delete().eq("id", i.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${i.name} removed`);
    void refetch();
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Inventory" sub={`${rows.length} items · ${totalUnits} units on hand · ${low.length} low`} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="ss-input min-w-[180px] flex-1"
          placeholder="Search items"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="ss-btn" onClick={() => setAdding((v) => !v)}>
          {adding ? <X size={13} /> : <Plus size={13} />} {adding ? "Cancel" : "Add item"}
        </button>
        <button className="ss-btn ss-btn-ghost" onClick={() => setShowLog((v) => !v)}>
          <History size={13} /> {showLog ? "Hide history" : "History"}
        </button>
        {low.length > 0 && (
          <button
            className="ss-btn ss-btn-ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await runLowStockCheck({ data: {} });
                if (res.notified.length) toast.success(`Reorder alert sent for ${res.notified.length} item(s)`);
                else toast.info("Already alerted in the last 24 hours");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not send the reorder alert");
              }
              setBusy(false);
            }}
          >
            Send reorder alert ({low.length})
          </button>
        )}

      </div>

      {showLog && (
        <div className="ss-card p-3">
          <div className="ss-tag" style={{ fontSize: "0.55rem" }}>Adjustment history</div>
          {!moves.length && <p className="mt-2 text-[0.76rem] opacity-60">No adjustments logged yet.</p>}
          <div className="mt-2 space-y-1.5">
            {moves.slice(0, 60).map((m) => (
              <div key={m.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[0.76rem]">
                <span className="ss-num font-bold" style={{ color: m.delta > 0 ? "hsl(152 60% 26%)" : "hsl(var(--ss-burgundy))" }}>
                  {m.delta > 0 ? "+" : ""}{m.delta}
                </span>
                <span className="font-semibold">{m.item_name}</span>
                <span className="opacity-70">{reasonLabel(m.reason)}</span>
                {m.note && <span className="opacity-60">· {m.note}</span>}
                <span className="ml-auto opacity-55">{stamp(m.created_at)} · now {m.quantity_after}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {adding && (
        <div className="ss-card space-y-2 p-3">
          <div className="ss-tag" style={{ fontSize: "0.55rem" }}>New inventory item</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="ss-label">Item name</span>
              <input
                className="ss-input w-full"
                placeholder="e.g. Cyanuric Acid"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="ss-label">Unit</span>
              <select
                className="ss-input w-full"
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="ss-label">On hand</span>
              <input
                className="ss-input ss-num w-full"
                type="number"
                min={0}
                step={1}
                value={draft.quantity}
                onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
              />
            </label>
            <label className="space-y-1">
              <span className="ss-label">Reorder at</span>
              <input
                className="ss-input ss-num w-full"
                type="number"
                min={0}
                step={1}
                value={draft.low_threshold}
                onChange={(e) => setDraft({ ...draft, low_threshold: Number(e.target.value) })}
              />
            </label>
          </div>
          <button className="ss-btn" disabled={busy} onClick={() => void addItem()}>
            <Check size={13} /> {busy ? "Saving…" : "Add to inventory"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {!shown.length && <EmptyState>No items.</EmptyState>}
        {shown.map((i) =>
          editId === i.id ? (
            <div key={i.id} className="ss-card space-y-2 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="ss-label">Item name</span>
                  <input
                    className="ss-input w-full"
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                </label>
                <label className="space-y-1">
                  <span className="ss-label">Unit</span>
                  <select
                    className="ss-input w-full"
                    value={edit.unit}
                    onChange={(e) => setEdit({ ...edit, unit: e.target.value })}
                  >
                    {[...new Set([edit.unit, ...UNITS])].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="ss-label">On hand</span>
                  <input
                    className="ss-input ss-num w-full"
                    type="number"
                    min={0}
                    step={1}
                    value={edit.quantity}
                    onChange={(e) => setEdit({ ...edit, quantity: Number(e.target.value) })}
                  />
                </label>
                <label className="space-y-1">
                  <span className="ss-label">Reorder at</span>
                  <input
                    className="ss-input ss-num w-full"
                    type="number"
                    min={0}
                    step={1}
                    value={edit.low_threshold}
                    onChange={(e) => setEdit({ ...edit, low_threshold: Number(e.target.value) })}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="ss-btn" disabled={busy} onClick={() => void saveEdit()}>
                  <Check size={13} /> Save
                </button>
                <button className="ss-btn ss-btn-ghost" onClick={() => setEditId(null)}>
                  <X size={13} /> Cancel
                </button>
                <button className="ss-btn ss-btn-ghost" onClick={() => void remove(i)}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ) : (
            <div key={i.id} className="ss-card flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.88rem] font-semibold">{i.name}</span>
                  {i.quantity <= i.low_threshold && <Chip tone="orange">Reorder</Chip>}
                </div>
                <div className="text-[0.72rem] opacity-60">
                  Reorder at {i.low_threshold} {i.unit ?? "units"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="ss-btn ss-btn-ghost" onClick={() => void adjust(i, -1)} aria-label={`Decrease ${i.name}`}>−</button>
                <input
                  className="ss-input ss-num w-16 text-center text-[1rem] font-bold"
                  type="number"
                  min={0}
                  step={1}
                  aria-label={`${i.name} on hand`}
                  defaultValue={i.quantity}
                  key={`${i.id}-${i.quantity}`}
                  onBlur={(e) => void setQuantity(i, Number(e.target.value))}
                />
                <button className="ss-btn ss-btn-ghost" onClick={() => void adjust(i, 1)} aria-label={`Increase ${i.name}`}>+</button>
                <button
                  className="ss-btn ss-btn-ghost"
                  onClick={() => { setAdjustId(adjustId === i.id ? null : i.id); setHistoryId(null); }}
                  aria-label={`Adjust ${i.name}`}
                >
                  <Minus size={13} />/<Plus size={13} />
                </button>
                <button
                  className="ss-btn ss-btn-ghost"
                  onClick={() => { setHistoryId(historyId === i.id ? null : i.id); setAdjustId(null); }}
                  aria-label={`History for ${i.name}`}
                >
                  <History size={13} />
                </button>
                <button className="ss-btn ss-btn-ghost" onClick={() => startEdit(i)} aria-label={`Edit ${i.name}`}>
                  <Pencil size={13} />
                </button>
              </div>

              {adjustId === i.id && (
                <div className="w-full space-y-2 border-t pt-2" style={{ borderColor: "hsl(var(--ss-sand))" }}>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="space-y-1">
                      <span className="ss-label">Direction</span>
                      <select
                        className="ss-input"
                        value={adjustDraft.dir}
                        onChange={(e) => setAdjustDraft({ ...adjustDraft, dir: Number(e.target.value) })}
                      >
                        <option value={-1}>Remove</option>
                        <option value={1}>Add</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="ss-label">Qty ({i.unit ?? "units"})</span>
                      <input
                        className="ss-input ss-num w-20"
                        type="number"
                        min={0}
                        step={1}
                        value={adjustDraft.amount}
                        onChange={(e) => setAdjustDraft({ ...adjustDraft, amount: Number(e.target.value) })}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="ss-label">Reason</span>
                      <select
                        className="ss-input"
                        value={adjustDraft.reason}
                        onChange={(e) => setAdjustDraft({ ...adjustDraft, reason: e.target.value })}
                      >
                        {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </label>
                  </div>
                  <input
                    className="ss-input w-full"
                    placeholder="Note (optional) — job, truck, invoice…"
                    value={adjustDraft.note}
                    onChange={(e) => setAdjustDraft({ ...adjustDraft, note: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button className="ss-btn" disabled={busy} onClick={() => void applyAdjustment(i)}>
                      <Check size={13} /> Log adjustment
                    </button>
                    <button className="ss-btn ss-btn-ghost" onClick={() => setAdjustId(null)}>
                      <X size={13} /> Cancel
                    </button>
                  </div>
                </div>
              )}

              {historyId === i.id && (
                <div className="w-full border-t pt-2 text-[0.76rem]" style={{ borderColor: "hsl(var(--ss-sand))" }}>
                  {!(movesByItem.get(i.id) ?? []).length && <p className="opacity-60">No adjustments logged yet.</p>}
                  <div className="space-y-1">
                    {(movesByItem.get(i.id) ?? []).slice(0, 25).map((m) => (
                      <div key={m.id} className="flex flex-wrap items-baseline gap-x-2">
                        <span className="ss-num font-bold" style={{ color: m.delta > 0 ? "hsl(152 60% 26%)" : "hsl(var(--ss-burgundy))" }}>
                          {m.delta > 0 ? "+" : ""}{m.delta}
                        </span>
                        <span className="opacity-75">{reasonLabel(m.reason)}</span>
                        {m.note && <span className="opacity-60">· {m.note}</span>}
                        <span className="ml-auto opacity-55">{stamp(m.created_at)} · now {m.quantity_after}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
