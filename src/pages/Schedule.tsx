import { Link } from "@/lib/router-compat";
import { CalendarDays, CheckCircle2, Camera, FlaskConical, UserCheck } from "lucide-react";
import { CallButton, StickyCallBar } from "@/components/CallButton";
import InlineLeadForm from "@/components/InlineLeadForm";

export const SCHEDULE_POINTS = [
  {
    icon: FlaskConical,
    title: "Full water test",
    body: "Chlorine, pH, alkalinity, calcium hardness, cyanuric acid and salt, read on site, no charge.",
  },
  {
    icon: UserCheck,
    title: "Equipment walkthrough",
    body: "Pump, filter, heater, salt cell, valves and automation checked for wear, leaks and flow issues.",
  },
  {
    icon: Camera,
    title: "Written findings",
    body: "Photos and readings sent to your phone with a flat monthly price before we leave.",
  },
];

export default function Schedule({ source }: { source: string }) {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="border-b border-hairline bg-background">
        <div className="container-tight flex h-[64px] items-center justify-between gap-3 sm:h-[76px]">
          <Link to="/" aria-label="Savvy Swim home" className="flex min-w-0 shrink items-center gap-3">
            <span className="whitespace-nowrap font-display text-[1.15rem] uppercase leading-none tracking-tight text-accent sm:text-[1.6rem]">
              Savvy Swim
            </span>
          </Link>
          <CallButton location="schedule_header" />
        </div>
      </header>

      <main>
        <section className="border-b border-hairline">
          <div className="container-tight grid grid-cols-1 items-start gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-6">
              <div className="border-t-2 border-accent pt-6">
                <div className="mb-4 inline-flex items-center gap-2 font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" /> Free inspection · Dallas–Fort Worth
                </div>
                <h1
                  className="font-display uppercase leading-[0.94] tracking-tight"
                  style={{ fontSize: "clamp(2.1rem, 5.2vw, 3.8rem)" }}
                >
                  Schedule your
                  <br />
                  <span className="text-accent">pool inspection.</span>
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
                  Pick a day that works. A technician tests your water, checks the equipment pad and
                  hands you a flat monthly price. No charge, no obligation.
                </p>
                <p className="mt-4 font-serif text-xl italic text-foreground/80">
                  On duty, so you don’t have to be.
                </p>
              </div>

              <ul className="mt-10 space-y-6">
                {SCHEDULE_POINTS.map((p) => (
                  <li key={p.title} className="flex gap-4 border-t border-hairline pt-5">
                    <p.icon className="mt-1 h-5 w-5 shrink-0 text-accent" />
                    <div>
                      <div className="font-tech text-sm uppercase tracking-[0.14em]">{p.title}</div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 font-tech text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent" /> No contracts
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent" /> Chemicals included
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent" /> Same tech weekly
                </span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="border border-hairline bg-secondary/20 p-5 sm:p-7">
                <div className="mb-5 border-b border-hairline pb-4 font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Book your visit
                </div>
                <InlineLeadForm
                  cta="Book my free consultation"
                  source={source}
                  submitLabel="Schedule my inspection"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-hairline">
          <div className="container-tight py-10 text-sm text-muted-foreground">
            Prefer to talk it through? Call{" "}
            <a href="tel:+18176637665" className="font-tech uppercase tracking-[0.14em] text-accent">
              817-663-7665
            </a>{" "}
            or see{" "}
            <Link to="/weekly-pool-service" className="underline underline-offset-4 hover:text-accent">
              what weekly service includes
            </Link>
            .
          </div>
        </section>
      </main>

      <StickyCallBar location="schedule_sticky" />
    </div>
  );
}
