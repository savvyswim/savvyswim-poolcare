// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ---- module mocks: keep server functions and Google out of the test ---- */

const addressMapPreview = vi.fn();
vi.mock("@/lib/geo.functions", () => ({
  addressMapPreview: (...args: unknown[]) => addressMapPreview(...args),
}));

const loadMaps = vi.fn();
let authBlocked = false;
vi.mock("@/lib/google-maps", () => ({
  loadMaps: (...args: unknown[]) => loadMaps(...args),
  isMapsAuthBlocked: () => authBlocked,
  onMapsAuthBlocked: (cb: () => void) => {
    if (authBlocked) cb();
    return () => undefined;
  },
}));

const trackSiteEvent = vi.fn();
vi.mock("@/lib/site-analytics", () => ({
  trackSiteEvent: (...args: unknown[]) => trackSiteEvent(...args),
}));

import AddressMapPreview from "@/components/AddressMapPreview";

const ADDRESS = "6801 Gaylord Pkwy, Frisco, TX 75034";

beforeEach(() => {
  authBlocked = false;
  addressMapPreview.mockReset();
  loadMaps.mockReset();
  trackSiteEvent.mockReset();
});

afterEach(cleanup);

describe("AddressMapPreview fallback", () => {
  it("renders nothing without an address or place", () => {
    const { container } = render(<AddressMapPreview />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the static map when the server preview succeeds", async () => {
    addressMapPreview.mockResolvedValue({ image: "data:image/png;base64,AAA", address: ADDRESS });
    render(<AddressMapPreview address={ADDRESS} />);
    const img = await screen.findByRole("img");
    expect(img.getAttribute("src")).toBe("data:image/png;base64,AAA");
    expect(trackSiteEvent).not.toHaveBeenCalled();
  });

  it("falls back to the confirmation card when the static map fails", async () => {
    addressMapPreview.mockRejectedValue(new Error("gateway down"));
    render(<AddressMapPreview address={ADDRESS} />);

    expect(await screen.findByText("Address confirmed")).toBeTruthy();
    expect(screen.getByText(ADDRESS)).toBeTruthy();

    const link = screen.getByRole("link", { name: /open in google maps/i });
    expect(link.getAttribute("href")).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`,
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer");
  });

  it("shows the blocked-state note and tracks it when the browser key is rejected", async () => {
    authBlocked = true;
    addressMapPreview.mockResolvedValue({ image: null });
    render(<AddressMapPreview placeId="place-123" address={ADDRESS} />);

    expect(await screen.findByText(/map preview is unavailable on this domain/i)).toBeTruthy();
    // Never tries the interactive map once Google rejected the key.
    expect(loadMaps).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(trackSiteEvent).toHaveBeenCalledWith("maps_fallback_shown", "referrer_blocked"),
    );
  });

  it("tracks a plain fallback (no_map) when the key is fine but no map rendered", async () => {
    addressMapPreview.mockResolvedValue({ image: null });
    loadMaps.mockRejectedValue(new Error("no key"));
    render(<AddressMapPreview placeId="place-123" address={ADDRESS} />);

    expect(await screen.findByText("Address confirmed")).toBeTruthy();
    expect(screen.queryByText(/unavailable on this domain/i)).toBeNull();
    await waitFor(() =>
      expect(trackSiteEvent).toHaveBeenCalledWith("maps_fallback_shown", "no_map"),
    );
  });
});
