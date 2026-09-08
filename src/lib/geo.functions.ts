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

/* ------------------------------------------------------------------ *
 * Address suggestions + map preview, served through the gateway.
 *
 * The browser Maps key is referrer-locked to the preview domains, so on
 * savvyswim.com / savvyswim.com it is rejected. Everything below runs
 * server-side with the connector's server key, which has no referrer rules, * so autocomplete and the map work identically on every domain.
 * ------------------------------------------------------------------ */

function gatewayHeaders() {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableApiKey || !mapsKey) {
    throw new Error("Missing Google Maps connector credentials");
  }
  return {
    Authorization: `Bearer ${lovableApiKey}`,
    "X-Connection-Api-Key": mapsKey,
  };
}

const AutocompleteSchema = z.object({
  input: z.string().trim().min(3).max(200),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  sessionToken: z.string().max(80).optional(),
});

export type AddressSuggestion = { text: string; placeId: string };

/** Plano/Frisco centre, biases suggestions to the routes we actually run. */
const SERVICE_AREA_CENTER = { latitude: 33.035, longitude: -96.75 };
const SERVICE_AREA_RADIUS_M = 50000;

export const suggestAddresses = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AutocompleteSchema.parse(input))
  .handler(async ({ data }): Promise<AddressSuggestion[]> => {
    const center =
      data.lat !== undefined && data.lng !== undefined
        ? { latitude: data.lat, longitude: data.lng }
        : SERVICE_AREA_CENTER;

    const response = await fetch(
      "https://connector-gateway.lovable.dev/google_maps/places/v1/places:autocomplete",
      {
        method: "POST",
        headers: { ...gatewayHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          input: data.input,
          includedRegionCodes: ["us"],
          locationBias: { circle: { center, radius: SERVICE_AREA_RADIUS_M } },
          origin: center,
          ...(data.sessionToken ? { sessionToken: data.sessionToken } : {}),
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(`Address autocomplete failed [${response.status}]: ${body}`);
      return [];
    }

    const payload = (await response.json()) as {
      suggestions?: Array<{
        placePrediction?: { placeId?: string; text?: { text?: string } };
      }>;
    };

    return (payload.suggestions ?? [])
      .map((s) => ({
        text: s.placePrediction?.text?.text ?? "",
        placeId: s.placePrediction?.placeId ?? "",
      }))
      .filter((s) => s.text && s.placeId)
      .slice(0, 5);
  });

const MapSchema = z.object({
  placeId: z.string().trim().min(3).max(300).optional(),
  address: z.string().trim().min(3).max(300).optional(),
  width: z.number().int().min(200).max(640).default(640),
  height: z.number().int().min(120).max(640).default(320),
  zoom: z.number().int().min(1).max(20).default(17),
});

export type MapPreviewResult = { image: string; address: string } | null;

/**
 * Render a static map for the selected address and hand back a data URL, so
 * the browser never needs a Maps key of its own.
 */
export const addressMapPreview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MapSchema.parse(input))
  .handler(async ({ data }): Promise<MapPreviewResult> => {
    const headers = gatewayHeaders();
    let center = "";
    let label = data.address ?? "";

    if (data.placeId) {
      const detail = await fetch(
        `https://connector-gateway.lovable.dev/google_maps/places/v1/places/${encodeURIComponent(data.placeId)}`,
        { headers: { ...headers, "X-Goog-FieldMask": "location,formattedAddress" } },
      );
      if (detail.ok) {
        const place = (await detail.json()) as {
          location?: { latitude?: number; longitude?: number };
          formattedAddress?: string;
        };
        if (place.location?.latitude !== undefined && place.location?.longitude !== undefined) {
          center = `${place.location.latitude},${place.location.longitude}`;
        }
        if (place.formattedAddress) label = place.formattedAddress;
      } else {
        console.error(`Place details failed [${detail.status}]: ${await detail.text()}`);
      }
    }

    if (!center) {
      if (!data.address) return null;
      center = data.address;
    }

    const url =
      `https://connector-gateway.lovable.dev/google_maps/maps/api/staticmap` +
      `?center=${encodeURIComponent(center)}&zoom=${data.zoom}` +
      `&size=${data.width}x${data.height}&scale=2&maptype=roadmap` +
      `&markers=${encodeURIComponent(`color:0x8E1F2C|${center}`)}`;

    const image = await fetch(url, { headers });
    if (!image.ok) {
      console.error(`Static map failed [${image.status}]: ${await image.text()}`);
      return null;
    }

    const bytes = new Uint8Array(await image.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
    const contentType = image.headers.get("content-type") ?? "image/png";

    return { image: `data:${contentType};base64,${btoa(binary)}`, address: label };
  });

