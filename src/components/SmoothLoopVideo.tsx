import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  poster?: string;
  className?: string;
  /** seconds of crossfade before the loop end */
  fade?: number;
}

/**
 * Two stacked <video> elements crossfade so the loop point is invisible.
 */
export const SmoothLoopVideo = ({ src, poster, className, fade = 1.2 }: Props) => {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState<"a" | "b">("a");
  const switching = useRef(false);

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;

    a.play().catch(() => {});

    const onTime = (e: Event) => {
      const cur = e.currentTarget as HTMLVideoElement;
      const other = cur === a ? b : a;
      if (!cur.duration || switching.current) return;
      if (cur.duration - cur.currentTime <= fade) {
        switching.current = true;
        other.currentTime = 0;
        other.play().catch(() => {});
        setActive(cur === a ? "b" : "a");
        // release lock once we're well past the swap
        window.setTimeout(() => {
          switching.current = false;
        }, fade * 1000);
      }
    };

    a.addEventListener("timeupdate", onTime);
    b.addEventListener("timeupdate", onTime);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      b.removeEventListener("timeupdate", onTime);
    };
  }, [fade]);

  const base =
    "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out";

  return (
    <>
      <video
        ref={aRef}
        src={src}
        poster={poster}
        muted
        playsInline
        preload="auto"
        autoPlay
        className={`${base} ${active === "a" ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
      />
      <video
        ref={bRef}
        src={src}
        muted
        playsInline
        preload="auto"
        className={`${base} ${active === "b" ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
      />
    </>
  );
};

export default SmoothLoopVideo;
