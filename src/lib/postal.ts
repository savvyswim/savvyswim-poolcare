/**
 * Pull the ZIP out of a one-line address.
 *
 * The Google address picker returns a formatted address that always ends with
 * the ZIP (optionally followed by ", USA"); hand-typed addresses usually do
 * too. We keep the full address string untouched and store the ZIP separately
 * so routing and city reporting have a clean field to work with.
 */
export function extractZip(address: string | null | undefined): string {
  if (!address) return "";
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b\s*(?:,\s*(?:USA|US|United States))?\s*$/i);
  return match?.[1] ?? "";
}

/**
 * Pull the service city out of a one-line address.
 *
 * Formatted addresses look like "6801 Warren Pkwy, Frisco, TX 75034, USA", * the city is the part immediately before the state. Hand-typed addresses that
 * omit the state fall back to the second comma-separated part.
 */
export function cityFromAddress(address: string | null | undefined): string {
  if (!address) return "";
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/^(usa|us|united states)$/i.test(p));
  if (parts.length < 2) return "";
  const stateIdx = parts.findIndex((p) => /^[A-Z]{2}\b(\s+\d{5}(-\d{4})?)?$/.test(p));
  const city = stateIdx > 0 ? parts[stateIdx - 1] : parts[1];
  if (!city || /\d{5}/.test(city)) return "";
  return city.replace(/\s+/g, " ").slice(0, 60);
}

/** Pull the 2-letter state code out of a one-line address. */
export function stateFromAddress(address: string | null | undefined): string {
  if (!address) return "";
  const m = address.match(/\b([A-Z]{2})\b(?:\s+\d{5}(?:-\d{4})?)?\s*(?:,\s*(?:USA|US|United States))?\s*$/);
  return m?.[1] ?? "";
}
