/**
 * Site photo.
 *
 * Serves AVIF first and WebP as the fallback, always at the sharpest width the
 * screen can actually use. The intrinsic size is set so the page never jumps,
 * and the photo fades in once it has arrived instead of popping onto the page.
 */
import { useState, type ImgHTMLAttributes } from "react";
import type { Photo } from "@/assets/photos";
import { cn } from "@/lib/utils";

type ImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  photo: Photo;
  alt: string;
  /** How wide the photo is drawn, so the browser can pick the right file. */
  sizes?: string;
  /** Only the one photo at the top of a page should set this. */
  priority?: boolean;
};

export default function Img({
  photo,
  alt,
  sizes = "100vw",
  priority = false,
  className,
  ...rest
}: ImgProps) {
  const [loaded, setLoaded] = useState(false);

  // `contents` keeps the <img> itself as the flex or grid item.
  return (
    <picture className="contents">
      {photo.avifSrcSet ? (
        <source type="image/avif" srcSet={photo.avifSrcSet} sizes={sizes} />
      ) : null}
      <source type="image/webp" srcSet={photo.srcSet} sizes={sizes} />
      <img
        src={photo.url}
        srcSet={photo.srcSet}
        sizes={sizes}
        width={photo.width}
        height={photo.height}
        alt={alt}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        {...(priority ? { fetchPriority: "high" as const } : {})}
        onLoad={() => setLoaded(true)}
        className={cn(
          "motion-safe:transition-opacity motion-safe:duration-500",
          loaded || priority ? "opacity-100" : "opacity-0",
          className,
        )}
        {...rest}
      />
    </picture>
  );
}
