"use client";

// Remembers which loyalty card belongs to this device (demo only — there is no customer login).

const KEY = "casa-tiramisu-active-customer";

export function getActiveCustomerId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setActiveCustomerId(id: string) {
  try {
    window.localStorage.setItem(KEY, id);
    window.dispatchEvent(new Event("casa-active-customer"));
  } catch {
    /* ignore */
  }
}

export function clearActiveCustomerId() {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("casa-active-customer"));
  } catch {
    /* ignore */
  }
}

/** The public URL encoded into a customer's QR code. Contains only the Customer ID. */
export function cardUrl(customerId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://casatiramisu.in";
  return `${origin}/card?cid=${encodeURIComponent(customerId)}`;
}
