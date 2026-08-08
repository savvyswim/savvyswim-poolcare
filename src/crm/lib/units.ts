/**
 * Unit conversion rules for inventory.
 *
 * Mirrors public.ss_convert_qty in the database so the UI can preview a
 * conversion before the server records it. Measured units convert through a
 * canonical factor inside their own family (weight → grams, volume → mL).
 * Discrete pack units (ea, bag, bucket…) only convert when the item defines a
 * pack size, e.g. 1 bag = 40 lb.
 */

export type UnitFamily = "weight" | "volume" | "count";

const FACTORS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
  ml: 1,
  l: 1000,
  floz: 29.5735,
  qt: 946.353,
  gal: 3785.41,
};

const WEIGHT = ["g", "kg", "oz", "lb"];
const VOLUME = ["ml", "l", "floz", "qt", "gal"];

/** Every unit a tech may type a quantity in. */
export const ALL_UNITS = [
  "ea", "bag", "bucket", "box", "case", "tab", "jug",
  ...WEIGHT,
  ...VOLUME,
];

/** Units that make sense as an item's stock unit. */
export const STOCK_UNITS = ALL_UNITS;

/** Units a pack size can be expressed in (measured only). */
export const PACK_UNITS = [...WEIGHT, ...VOLUME];

const norm = (u: string | null | undefined) => (u ?? "").trim().toLowerCase().replace(/\s+/g, "");

export function unitFamily(unit: string | null | undefined): UnitFamily {
  const u = norm(unit);
  if (WEIGHT.includes(u)) return "weight";
  if (VOLUME.includes(u)) return "volume";
  return "count";
}

export type PackRule = { pack_size?: number | null; pack_unit?: string | null };

/**
 * Converts qty from one unit into another. Returns null when no rule connects
 * the two units (e.g. lb → ea with no pack size on the item).
 */
export function convertQty(
  qty: number,
  from: string | null | undefined,
  to: string | null | undefined,
  pack?: PackRule,
): number | null {
  if (!Number.isFinite(qty)) return null;
  const f = norm(from);
  const t = norm(to);
  if (f === t) return round4(qty);

  const ff = FACTORS[f];
  const tf = FACTORS[t];
  if (ff != null && tf != null && unitFamily(f) === unitFamily(t)) {
    return round4((qty * ff) / tf);
  }

  const size = Number(pack?.pack_size) || 0;
  const punit = norm(pack?.pack_unit);
  if (!size || !punit) return null;

  // measured → stock unit: express in the pack unit, then divide by pack size
  if (tf == null) {
    const via = convertQty(qty, f, punit);
    return via == null ? null : round4(via / size);
  }
  // stock unit → measured: multiply the pack out, then convert
  if (ff == null) return convertQty(qty * size, punit, t);

  return null;
}

/** Units that can actually be entered for an item with this stock unit + pack rule. */
export function enterableUnits(stockUnit: string | null | undefined, pack?: PackRule): string[] {
  const base = norm(stockUnit) || "ea";
  return ALL_UNITS.filter((u) => norm(u) === base || convertQty(1, u, base, pack) != null);
}

/** "2 gal = 0.5 bucket" style helper text, or null when the entry is 1:1. */
export function conversionHint(
  qty: number,
  from: string | null | undefined,
  to: string | null | undefined,
  pack?: PackRule,
): string | null {
  if (norm(from) === norm(to)) return null;
  const converted = convertQty(qty, from, to, pack);
  if (converted == null) return null;
  return `${trim(qty)} ${from} = ${trim(converted)} ${to}`;
}

export function packLabel(pack?: PackRule, stockUnit?: string | null): string | null {
  const size = Number(pack?.pack_size) || 0;
  if (!size || !pack?.pack_unit) return null;
  return `1 ${stockUnit ?? "unit"} = ${trim(size)} ${pack.pack_unit}`;
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const trim = (n: number) => String(Math.round(n * 1000) / 1000);
