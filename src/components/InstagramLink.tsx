import { Instagram } from "lucide-react";
import { INSTAGRAM_URL } from "@/lib/contact-info";

/**
 * Instagram profile link.
 *
 * Opens in a new tab, and falls back to the same tab when the browser (or an
 * embedded preview) refuses the popup, so the click never silently does
 * nothing.
 */
export default function InstagramLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Savvy Swim on Instagram"
      className={className}
      onClick={(event) => {
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        const opened = window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer");
        if (!opened) window.location.assign(INSTAGRAM_URL);
      }}
    >
      <Instagram className="h-4 w-4" />
      Instagram
    </a>
  );
}
