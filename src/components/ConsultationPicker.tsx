/**
 * Day and time picker shown on the thank you page.
 *
 * The customer has already sent the request, this lets them lock in when they
 * want us. Same day shows up on its own while it is still morning in Dallas.
 */
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { consultationDays, type ConsultDay } from "@/lib/consultation-slots";
import { setConsultationSlot } from "@/lib/consultation-slot.functions";

type Props = {
  reference: string;
  /** Window already chosen on the form, when there was one. */
  existingWindow?: string | undefined;
};

export default function ConsultationPicker({ reference, existingWindow }: Props) {
  const days = useMemo<ConsultDay[]>(() => consultationDays(), []);
  const [dayDate, setDayDate] = useState<string>(days[0]?.date ?? "");
  const [slotId, setSlotId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ prettyDate: string; window: string; sameDay: boolean } | null>(
    null,
  );

  const save = useServerFn(setConsultationSlot);
  const day = days.find((d) => d.date === dayDate) ?? days[0];

  if (days.length === 0) return null;

  if (done) {
    return (
      <div className="mt-12 border border-[#1FA9BE]/40 bg-white p-6">
        <h2 className="font-display text-2xl uppercase text-[#8E1F2C]">
          {done.sameDay ? "Same day request sent" : "Consultation time saved"}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[#2a1013]/80">
          We have you down for <strong>{done.prettyDate}</strong>, {done.window}. A tech confirms by
          phone or text, and for a same day visit we call you within the hour.
        </p>
      </div>
    );
  }

  const submit = async () => {
    if (!day || !slotId) {
      setError("Pick a day and a time to finish.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await save({ data: { reference, date: day.date, slot: slotId } });
      if (res.ok) {
        setDone({ prettyDate: res.prettyDate, window: res.window, sameDay: res.sameDay });
      } else {
        setError(
          res.reason === "not_found"
            ? "We could not match this request. Call 817-663-7665 and we will set the time with you."
            : "That time just filled up. Pick another day or window.",
        );
      }
    } catch {
      setError("Something went wrong saving that. Please call 817-663-7665.");
    } finally {
      setBusy(false);
    }
  };

  const sameDayOpen = days[0]?.sameDay === true;

  return (
    <div className="mt-12 border-t border-[#8E1F2C]/20 pt-10">
      <h2 className="font-display text-2xl uppercase text-[#8E1F2C]">Pick your consultation</h2>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#2a1013]/75">
        {existingWindow
          ? "Want a different day or time? Choose it here and we will use this instead."
          : "Choose the day and window that suits you and we will build the route around it."}
        {sameDayOpen ? " It is still morning, so you can even ask for today." : ""}
      </p>

      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-[#2a1013]/55">Day</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {days.map((d) => {
          const active = d.date === day?.date;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => {
                setDayDate(d.date);
                setSlotId("");
              }}
              className={`min-w-[104px] border px-4 py-3 text-left ${
                active
                  ? "border-[#8E1F2C] bg-[#8E1F2C] text-[#F4EFE3]"
                  : "border-[#8E1F2C]/25 bg-white text-[#2a1013]"
              }`}
            >
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
                {d.sameDay ? "Today" : d.weekday}
              </span>
              <span className="mt-1 block font-display text-lg uppercase">{d.dayLabel}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.25em] text-[#2a1013]/55">
        Time
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {(day?.slots ?? []).map((s) => {
          const active = s.id === slotId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSlotId(s.id)}
              className={`border px-4 py-3 text-left ${
                active
                  ? "border-[#1FA9BE] bg-[#1FA9BE] text-white"
                  : "border-[#8E1F2C]/25 bg-white text-[#2a1013]"
              }`}
            >
              <span className="block font-display text-base uppercase">{s.label}</span>
              <span className="mt-1 block text-[13px] opacity-75">{s.detail}</span>
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-4 text-[14px] text-[#8E1F2C]">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="mt-6 min-h-[52px] w-full bg-[#8E1F2C] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#F4EFE3] disabled:opacity-60 sm:w-auto"
      >
        {busy ? "Saving..." : day?.sameDay && slotId ? "Request this time today" : "Confirm this time"}
      </button>
    </div>
  );
}
