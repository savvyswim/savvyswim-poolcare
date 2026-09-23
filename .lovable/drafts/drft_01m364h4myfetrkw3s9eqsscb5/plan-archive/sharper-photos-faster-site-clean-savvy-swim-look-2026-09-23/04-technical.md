# Technical notes

- Re-encode the assets behind `src/assets/*.asset.json` and regenerate `src/assets/photos.ts` with AVIF and WebP `srcSet` entries plus a 2x width per photo, keeping intrinsic width/height exports.
- Add a small `Img` wrapper used by the gallery and page images: `<picture>` with AVIF/WebP sources, `sizes`, `decoding="async"`, `loading="lazy"` except above the fold, and a fade in on load.
- Add hero `<link rel="preload" as="image" imagesrcset>` in the relevant route `head()`.
- Page transition as a small CSS only wrapper around `<Outlet />` in `src/routes/__root.tsx`, gated on `prefers-reduced-motion`.
- Audit user visible Lovable strings across `src/routes`, `public/manifest.webmanifest`, meta tags, icons and error boundary copy. Internal error reporting in `src/lib/lovable-error-reporting.ts` stays, visitors never see it.
- Verify with Playwright at phone and desktop widths on home, services, our work and a city page, plus a typecheck.
