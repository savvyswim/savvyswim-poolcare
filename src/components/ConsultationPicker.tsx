/**
 * Day and time picker shown on the thank you page.
 *
 * We ask first, then offer the next seven days, Monday to Friday, with three
 * arrival times. Today only shows while a time is still far enough out.
 */
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { consultationDays, type ConsultDay } from "@/lib/consultation-slots";
import { setConsultationSlot } from "@/lib/consultation-slot.functions";

type Props = {
  reference: string;
  /** Window already chosen on the form, when there was one. */
  existingWindow?: string | undefined;
  /** Sits directly under the page heading, so it drops the divider rule. */
  topPlacement?: boolean;
};

type Step = "ask" | "pick" | "declined";

export default function ConsultationPicker({ reference, existingWindow, topPlacement }: Props) {
  const days = useMemo<ConsultDay[]>(() => consultationDays(), []);
  const [step, setStep] = useState<Step>("ask");
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

  const shell = (children: React.ReactNode) => (
    <div className={topPlacement ? "mt-8" : "mt-12 border-t border-[#8E1F2C]/20 pt-10"}>
      {children}
    </div>
  );

  if (done) {
    return shell(
      <div className="border border-[#1FA9BE]/40 bg-white p-6">
        <h2 className="font-display text-2xl uppercase text-[#8E1F2C]">
          {done.sameDay ? "Same day request sent" : "Consultation time saved"}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[#2a1013]/80">
          We have you down for <strong>{done.prettyDate}</strong>, {done.window}. A tech confirms by
          phone or text, and for a same day visit we call you within the hour.
        </p>
      </div>,
    );
  }

  if (step === "declined") {
    return shell(
      <div className="border border-[#8E1F2C]/25 bg-white p-6">
        <h2 className="font-display text-2xl uppercase text-[#8E1F2C]">No problem</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[#2a1013]/80">
          We will call you within one business day and set the day and time with you then. Changed
          your mind?{" "}
          <button
            type="button"
            onClick={() => setStep("pick")}
            className="underline underline-offset-4"
          >
            Pick a day now
          </button>
          .
        </p>
      </div>,
    );
  }

  if (step === "ask") {
    return shell(
      <>
        <h2 className="font-display text-2xl uppercase text-[#8E1F2C]">
          Would you like to pick your consultation day now?
        </h2>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#2a1013]/75">
          {existingWindow
            ? "You can lock in a day and arrival time, or leave it to us and we will call."
            : "Choose a weekday and an arrival time, or leave it to us and we will call."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setStep("pick")}
            className="min-h-[52px] bg-[#8E1F2C] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#F4EFE3]"
          >
            Yes, pick a day
          </button>
          <button
            type="button"
            onClick={() => setStep("declined")}
            className="min-h-[52px] border border-[#8E1F2C]/30 bg-white px-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#8E1F2C]"
          >
            No, just call me
          </button>
        </div>
      </>,
    );
  }

  const submit = async () => {
    if (!day || !slotId) {
      setError("Pick a day and an arrival time to finish.");
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
            : "That time just filled up. Pick another day or time.",
        );
      }
    } catch {
      setError("Something went wrong saving that. Please call 817-663-7665.");
    } finally {
      setBusy(false);
    }
  };

  const sameDayOpen = days[0]?.sameDay === true;

  return shell(
    <>
      <h2 className="font-display text-2xl uppercase text-[#8E1F2C]">Pick your consultation</h2>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#2a1013]/75">
        Weekdays, with a 7:00 AM, 8:00 AM or 9:00 AM arrival.
        {sameDayOpen ? " There is still time today, so you can even ask for today." : ""}
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
        Arrival time
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
    </>,
  );
}
