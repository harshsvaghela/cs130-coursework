// Lightweight toast bus. Call toast("Saved") from anywhere in the browser.

export type ToastTone = "success" | "error" | "info";

export const TOAST_EVENT = "casa-toast";

export function toast(message: string, tone: ToastTone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, tone } }));
}
