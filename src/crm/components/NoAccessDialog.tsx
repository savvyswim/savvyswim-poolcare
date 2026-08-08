import { useState } from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const REASONS = [
  "Gate locked",
  "Dog in yard",
  "Blocked access",
  "Customer requested skip",
  "Unsafe conditions",
  "Other",
];

/** Tech action: log a no-access stop with a reason and notify the office + customer feed. */
export default function NoAccessDialog({
  visitId,
  customerId,
  customerName,
  onClose,
  onSaved,
}: {
  visitId: string;
  customerId: string;
  customerName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState(REASONS[0]!);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    let photoUrl: string | null = null;

    if (photo) {
      const path = `${customerId}/no-access-${visitId}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("service-photos").upload(path, photo, {
        upsert: true,
        contentType: photo.type || "image/jpeg",
      });
      if (upErr) {
        setBusy(false);
        toast.error(upErr.message);
        return;
      }
      photoUrl = path;
    }

    const detail = [reason, note.trim()].filter(Boolean).join(" — ");
    const { error } = await supabase
      .from("ss_visits")
      .update({
        status: "no_access",
        no_access_at: new Date().toISOString(),
        no_access_reason: detail,
        no_access_photo_url: photoUrl,
      })
      .eq("id", visitId);

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    await supabase.from("ss_feed").insert({
      customer_id: customerId,
      kind: "no_access",
      title: "We could not access the pool today",
      body: `${detail}. We will reach out to reschedule — no charge for a missed access visit.`,
      visit_id: visitId,
    });
    await supabase.from("ss_alerts").insert({
      customer_id: customerId,
      priority: "high",
      title: `No access — ${customerName}`,
      body: detail,
    });

    setBusy(false);
    toast.success("No access logged — office notified");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="ss-card w-full max-w-md space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Ban size={16} style={{ color: "hsl(var(--ss-burgundy))" }} />
          <div className="ss-label">No access · {customerName}</div>
        </div>

        <div>
          <label className="ss-label" htmlFor="na-reason">Reason</label>
          <select id="na-reason" className="ss-input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label className="ss-label" htmlFor="na-note">Note for the office</label>
          <textarea
            id="na-note"
            className="ss-input"
            rows={3}
            maxLength={400}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Padlock changed, new code needed…"
          />
        </div>

        <div>
          <label className="ss-label" htmlFor="na-photo">Proof photo (optional)</label>
          <input
            id="na-photo"
            className="ss-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex gap-2">
          <button className="ss-btn ss-btn-ghost flex-1" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="ss-btn flex-1" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Log no access"}
          </button>
        </div>
      </div>
    </div>
  );
}
