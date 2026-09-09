import { Instagram, Waves } from "lucide-react";
import { Link } from "@/lib/router-compat";
import { INSTAGRAM_URL } from "@/lib/contact-info";
import { CallButton, onCallClick } from "@/components/CallButton";
import { resetConsent } from "@/lib/consent";
import { goToLead } from "@/lib/site-analytics";

export const EMAIL = "hi@savvyswim.com";
export const PHONE_DISPLAY = "817-663-7665";
export const PHONE_HREF = "tel:+18176637665";
export const SMS_PHONE = "+18176637665";
export const CUSTOMER_LOGIN_URL = "https://savvyswim.app";

type NavItem = { label: string; hash: string };

const NAV: NavItem[] = [
  { label: "WHO WE ARE", hash: "who" },
  { label: "WHAT WE OFFER", hash: "offer" },
  { label: "HOW IT HAPPENS", hash: "how" },
  { label: "WHY PEOPLE GO SAVVY", hash: "why" },
  { label: "CONNECT WITH US", hash: "contact" },
];

/** Shared top bar: wordmark, the five home-page sections, call + inspection. */
export function SiteHeader() {
  return (
    <header className="border-b border-hairline bg-background">
      <div className="container-tight flex h-[64px] min-w-0 items-center justify-between gap-4 sm:h-[76px] sm:gap-8">
        <Link to="/" aria-label="Savvy Swim home" className="flex shrink-0 flex-col justify-center">
          <span className="whitespace-nowrap font-display text-[1.15rem] uppercase leading-none tracking-tight text-accent xs:text-[1.3rem] sm:text-[1.6rem] lg:text-[1.45rem] xl:text-[1.9rem]">
            Savvy Swim
          </span>
          <span className="mt-1 hidden whitespace-nowrap font-tech text-[9px] leading-tight text-primary/60 sm:block sm:text-[10px]">
            On duty, so you don&rsquo;t have to be.
          </span>
        </Link>


        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-3 overflow-hidden whitespace-nowrap font-tech text-[11px]! text-primary/70 2xl:flex 2xl:gap-4 2xl:text-[12px]!">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to="/"
              hash={item.hash}
              className="min-w-0 transition hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
          <Link to="/services" className="hidden min-w-0 transition hover:text-accent min-[1700px]:inline">
            Services
          </Link>
        </nav>


        <div className="flex shrink-0 items-center gap-2 2xl:ml-4">


          <CallButton location="header" hidePhoneTextOnNarrowDesktop className="px-2 py-2 sm:px-3" />
          <button
            type="button"
            onClick={() => goToLead("header")}
            data-savvy-cta="request_quote"
            aria-label="Free consultation, opens the Savvy Swim booking form"
            className="btn-quote inline-flex items-center whitespace-nowrap rounded-md px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-5 sm:py-3 sm:text-[13px]"
          >
            <span className="sm:hidden">Consult</span>
            <span className="hidden sm:inline">Consultation</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/** Shared footer used across the marketing pages. */
export function SiteFooter() {
  return (
    <footer className="border-t border-hairline py-10">
      <div className="container-tight flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <Waves className="h-4 w-4 text-amber-brand" />
          <span>
            © {new Date().getFullYear()} Savvy Swim · A Santana &amp; Rivera Company. All rights
            reserved.
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a href={`mailto:${EMAIL}`} className="transition hover:text-foreground">
            {EMAIL}
          </a>
          <a href={PHONE_HREF} onClick={onCallClick("footer")} className="transition hover:text-foreground">
            {PHONE_DISPLAY}
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Savvy Swim on Instagram"
            className="inline-flex items-center gap-1.5 transition hover:text-foreground"
          >
            <Instagram className="h-4 w-4" />
            Instagram
          </a>
          <Link to="/refer" className="transition hover:text-foreground">
            Refer &amp; Save
          </Link>
          <Link to="/our-work" className="transition hover:text-foreground">
            Our Work
          </Link>
          <Link to="/pool-cleaning-frisco-tx" className="transition hover:text-foreground">
            Pool Cleaning Frisco TX
          </Link>
          <Link to="/privacy-policy" className="transition hover:text-foreground">
            Privacy Policy
          </Link>
          <Link to="/terms-and-conditions" className="transition hover:text-foreground">
            Terms &amp; Conditions
          </Link>
          <button type="button" onClick={() => resetConsent()} className="transition hover:text-foreground">
            Cookie settings
          </button>
          <a
            href={CUSTOMER_LOGIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-foreground"
          >
            Customer Login
          </a>
        </div>
      </div>
    </footer>
  );
}
