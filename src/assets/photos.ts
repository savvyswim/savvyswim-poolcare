import v0 from "./img-5494-opt-w480.webp.asset.json";
import v1 from "./img-5494-opt-w800.webp.asset.json";
import v2 from "./img-5494-opt.webp.asset.json";
import v3 from "./img-5496-2-opt-w480.webp.asset.json";
import v4 from "./img-5496-2-opt-w800.webp.asset.json";
import v5 from "./img-5496-2-opt.webp.asset.json";
import v6 from "./img-5497-2-opt-w480.webp.asset.json";
import v7 from "./img-5497-2-opt-w800.webp.asset.json";
import v8 from "./img-5497-2-opt.webp.asset.json";
import v9 from "./img-5502-opt-w480.webp.asset.json";
import v10 from "./img-5502-opt-w800.webp.asset.json";
import v11 from "./img-5502-opt.webp.asset.json";
import v12 from "./img-5504-2-opt-w480.webp.asset.json";
import v13 from "./img-5504-2-opt-w800.webp.asset.json";
import v14 from "./img-5504-2-opt.webp.asset.json";
import v15 from "./img-5507-2-opt-w480.webp.asset.json";
import v16 from "./img-5507-2-opt.webp.asset.json";
import v17 from "./img-5508-2-opt-w480.webp.asset.json";
import v18 from "./img-5508-2-opt-w800.webp.asset.json";
import v19 from "./img-5508-2-opt.webp.asset.json";
import v20 from "./img-5512-opt-w480.webp.asset.json";
import v21 from "./img-5512-opt-w800.webp.asset.json";
import v22 from "./img-5512-opt.webp.asset.json";
import v23 from "./img-5518-opt-w480.webp.asset.json";
import v24 from "./img-5518-opt-w800.webp.asset.json";
import v25 from "./img-5518-opt.webp.asset.json";
import v26 from "./pool-water-hd-opt-w480.webp.asset.json";
import v27 from "./pool-water-hd-opt-w800.webp.asset.json";
import v28 from "./pool-water-hd-opt.webp.asset.json";
import v29 from "./pool-water-mobile-w480.webp.asset.json";
import v30 from "./pool-water-mobile-w800.webp.asset.json";
import v31 from "./pool-water-mobile.webp.asset.json";
import v32 from "./savvy-swim-logo-opt-w480.webp.asset.json";
import v33 from "./savvy-swim-logo-opt-w800.webp.asset.json";
import v34 from "./savvy-swim-logo-opt.webp.asset.json";

// Site photography, served from the CDN in three widths so phones only
// download what they can actually display.
//
// Each export carries an intrinsic width/height so the browser reserves the
// right space before the image arrives (no layout jump).

export type Photo = {
  url: string;
  srcSet: string;
  width: number;
  height: number;
};

export const IMG_5494_JPG: Photo = {
  url: v2.url,
  srcSet: `${v0.url} 480w` + ", " + `${v1.url} 800w` + ", " + `${v2.url} 1169w`,
  width: 1169,
  height: 1862,
};

export const IMG_5496_2_jpg: Photo = {
  url: v5.url,
  srcSet: `${v3.url} 480w` + ", " + `${v4.url} 800w` + ", " + `${v5.url} 1320w`,
  width: 1320,
  height: 1945,
};

export const IMG_5497_2_jpg: Photo = {
  url: v8.url,
  srcSet: `${v6.url} 480w` + ", " + `${v7.url} 800w` + ", " + `${v8.url} 1320w`,
  width: 1320,
  height: 1475,
};

export const IMG_5502_PNG: Photo = {
  url: v11.url,
  srcSet: `${v9.url} 480w` + ", " + `${v10.url} 800w` + ", " + `${v11.url} 1405w`,
  width: 1405,
  height: 768,
};

export const IMG_5504_2_JPG: Photo = {
  url: v14.url,
  srcSet: `${v12.url} 480w` + ", " + `${v13.url} 800w` + ", " + `${v14.url} 816w`,
  width: 816,
  height: 1456,
};

export const IMG_5507_2_JPG: Photo = {
  url: v16.url,
  srcSet: `${v15.url} 480w` + ", " + `${v16.url} 768w`,
  width: 768,
  height: 1024,
};

export const IMG_5508_2_JPG: Photo = {
  url: v19.url,
  srcSet: `${v17.url} 480w` + ", " + `${v18.url} 800w` + ", " + `${v19.url} 1125w`,
  width: 1125,
  height: 1364,
};

export const IMG_5512_PNG: Photo = {
  url: v22.url,
  srcSet: `${v20.url} 480w` + ", " + `${v21.url} 800w` + ", " + `${v22.url} 896w`,
  width: 896,
  height: 1194,
};

export const IMG_5518_PNG: Photo = {
  url: v25.url,
  srcSet: `${v23.url} 480w` + ", " + `${v24.url} 800w` + ", " + `${v25.url} 922w`,
  width: 922,
  height: 1152,
};

export const pool_water_hd_jpg: Photo = {
  url: v28.url,
  srcSet: `${v26.url} 480w` + ", " + `${v27.url} 800w` + ", " + `${v28.url} 1600w`,
  width: 1600,
  height: 1066,
};

export const pool_water_mobile: Photo = {
  url: v31.url,
  srcSet: `${v29.url} 480w` + ", " + `${v30.url} 800w` + ", " + `${v31.url} 960w`,
  width: 960,
  height: 640,
};

export const savvy_swim_logo_png: Photo = {
  url: v34.url,
  srcSet: `${v32.url} 480w` + ", " + `${v33.url} 800w` + ", " + `${v34.url} 1024w`,
  width: 1024,
  height: 1024,
};
