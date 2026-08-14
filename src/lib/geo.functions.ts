import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const CoordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type ReverseGeocodeResult = { formattedAddress: string; placeId: string };

/**
 * Turn browser geolocation coordinates into a street address.
 *
 * Runs server-side through the Maps connector gateway so it keeps working on
 * the custom domains, where the referrer-restricted browser key is blocked.
 */
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CoordsSchema.parse(input))
  .handler(async ({ data }): Promise<ReverseGeocodeResult> => {
    const lovableApiKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableApiKey || !mapsKey) {
      throw new Error("Missing Google Maps connector credentials");
    }

    const url =
      `${GATEWAY_URL}/maps/api/geocode/json?latlng=${data.lat},${data.lng}` +
      `&result_type=street_address|premise|subpremise|route`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": mapsKey,
      },
    });

    if (response.status === 403) {
      const details: Array<{ reason?: string }> =
        (await response.json().catch(() => null))?.error?.details ?? [];
      const reason = details.find((d) => d.reason)?.reason;
      if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") {
        throw new Error(
          'Google Maps server key is referrer-restricted. In Google Cloud Console, set the server key\'s application restrictions to "None" or "IP addresses".',
        );
      }
      if (reason === "API_KEY_SERVICE_BLOCKED") {
        throw new Error(
          "Google Maps server key does not allow the Geocoding API. In Google Cloud Console, add it to the server key's allowed-APIs list.",
        );
      }
      throw new Error(
        "Google Maps request was denied (403). Check the server key's restrictions in Google Cloud Console.",
      );
    }

    if (!response.ok) {
      const body = await response.text();
      console.error(`Reverse geocode failed [${response.status}]: ${body}`);
      throw new Error(`Reverse geocode failed [${response.status}]: ${body}`);
    }

    const payload = (await response.json()) as {
      status?: string;
      error_message?: string;
      results?: Array<{ formatted_address?: string; place_id?: string }>;
    };

    if (payload.status !== "OK" || !payload.results?.length) {
      throw new Error(
        `Reverse geocode returned ${payload.status ?? "no status"}${
          payload.error_message ? `: ${payload.error_message}` : ""
        }`,
      );
    }

    const best = payload.results[0]!;
    return {
      formattedAddress: best.formatted_address ?? "",
      placeId: best.place_id ?? "",
    };
  });
