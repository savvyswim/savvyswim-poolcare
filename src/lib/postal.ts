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
