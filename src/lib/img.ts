import type { Photo } from "@/assets/photos";

/**
 * Spread-ready <img> props for a CDN photo.
 *
 * Gives the browser three widths to choose from, the intrinsic size so the
 * page never jumps while the photo loads, and sensible loading priority.
 * Only the one image at the top of a page should pass `priority`.
 */
export function imgProps(
  photo: Photo,
  opts: { sizes?: string; priority?: boolean } = {},
) {
  const { sizes = "100vw", priority = false } = opts;
  return {
    src: photo.url,
    srcSet: photo.srcSet,
    sizes,
    width: photo.width,
    height: photo.height,
    decoding: "async" as const,
    loading: (priority ? "eager" : "lazy") as "eager" | "lazy",
    ...(priority ? { fetchPriority: "high" as const } : {}),
  };
}
