import type { Photo } from "@/assets/photos";

/**
 * Spread-ready props for the <Img> photo component.
 *
 * Carries the photo itself, how wide it is drawn on the page, and whether it
 * is the one photo at the very top of the page that should load first.
 */
export function imgProps(
  photo: Photo,
  opts: { sizes?: string; priority?: boolean } = {},
) {
  const { sizes = "100vw", priority = false } = opts;
  return { photo, sizes, priority };
}
