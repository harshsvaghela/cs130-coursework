// Regional formatting for India: INR, en-IN numbering, Asia/Kolkata time, DD/MM/YYYY dates, +91 mobiles.

export const LOCALE = "en-IN";
export const TIMEZONE = "Asia/Kolkata";
export const CURRENCY = "INR";

const inrFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat(LOCALE);

/** ₹1,000 — Indian grouping, INR symbol only. */
export function formatINR(amount: number): string {
  return inrFormatter.format(amount);
}

/** 10,000 — Indian grouping for counts and quantities. */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** 21/03/2026 in Indian Standard Time. */
export function formatDate(iso: string | number | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** 10:45 AM in Indian Standard Time. */
export function formatTime(iso: string | number | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(d)
    .replace(/am/i, "AM")
    .replace(/pm/i, "PM");
}

/** 21/03/2026, 10:45 AM IST */
export function formatDateTime(iso: string | number | Date): string {
  return `${formatDate(iso)}, ${formatTime(iso)} IST`;
}

/** Long label, e.g. "Saturday, 21 March 2026". */
export function formatLongDate(iso: string | number | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** YYYY-MM-DD in IST, used for date-input comparisons. */
export function istDateKey(iso: string | number | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Converts a YYYY-MM-DD key into a Date at midnight IST, for range math. */
export function istStartOfDay(key: string, endOfDay = false): number {
  const [y, m, d] = key.split("-").map(Number);
  // IST is UTC+05:30 with no daylight saving.
  const utc = Date.UTC(y, m - 1, d, endOfDay ? 18 : -5, endOfDay ? 29 : -30, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return utc;
}

/** Indian mobile normalisation: accepts +91, 91, 0 prefixes and spaces. Returns 10 digits or null. */
export function normalizeMobile(input: string): string | null {
  let digits = (input || "").replace(/[\s\-().]/g, "");
  if (digits.startsWith("+91")) digits = digits.slice(3);
  else if (digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return digits;
}

export function isValidIndianMobile(input: string): boolean {
  return normalizeMobile(input) !== null;
}

/** +91 98765 43210 */
export function formatMobile(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(-10);
  if (d.length !== 10) return digits;
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

/** Masks all but the last 4 digits for shared screens. */
export function maskMobile(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(-10);
  return `+91 •••••• ${d.slice(-4)}`;
}

/** 4821 0937 5512 */
export function formatCardNumber(num: string): string {
  return num.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function validateName(value: string): string | null {
  const v = value.trim().replace(/\s+/g, " ");
  if (!v) return "Please enter your full name.";
  if (v.length < 2) return "Name must be at least 2 characters.";
  if (v.length > 60) return "Name must be 60 characters or fewer.";
  if (!/^[\p{L}][\p{L}\p{M}'’.\- ]*$/u.test(v)) return "Use letters only (apostrophes, dots and hyphens are fine).";
  if (v.split(" ").length < 1) return "Please enter your full name.";
  return null;
}

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return null; // optional
  if (v.length > 120) return "Email must be 120 characters or fewer.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Please enter a valid email address.";
  return null;
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

export function pluralise(n: number, one: string, many: string): string {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}
