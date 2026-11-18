"use client";

// Demo staff authentication. Credentials live in Settings (default admin / 1234).
// NOTE: this is client-side only. Real deployments must validate credentials on a secure server.

import { getDb } from "./db";

const SESSION_KEY = "casa-tiramisu-admin-session";
const ATTEMPTS_KEY = "casa-tiramisu-login-attempts";
const SESSION_HOURS = 8;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

export interface AdminSession {
  username: string;
  startedAt: string;
}

export function getSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSession;
    const age = Date.now() - new Date(session.startedAt).getTime();
    if (age > SESSION_HOURS * 3_600_000) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function endSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function lockoutRemainingMs(): number {
  try {
    const raw = window.localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return 0;
    const { until } = JSON.parse(raw) as { count: number; until: number };
    return Math.max(0, (until || 0) - Date.now());
  } catch {
    return 0;
  }
}

export function attemptLogin(username: string, pin: string): { ok: true } | { ok: false; error: string } {
  const remaining = lockoutRemainingMs();
  if (remaining > 0) {
    return { ok: false, error: `Too many attempts. Try again in ${Math.ceil(remaining / 1000)} seconds.` };
  }
  const { settings } = getDb();
  const userOk = username.trim().toLowerCase() === settings.adminUsername.toLowerCase();
  const pinOk = pin === settings.adminPin;

  if (userOk && pinOk) {
    window.localStorage.removeItem(ATTEMPTS_KEY);
    const session: AdminSession = { username: settings.adminUsername, startedAt: new Date().toISOString() };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true };
  }

  let count = 1;
  try {
    const raw = window.localStorage.getItem(ATTEMPTS_KEY);
    if (raw) count = (JSON.parse(raw) as { count: number }).count + 1;
  } catch {
    /* ignore */
  }
  if (count >= MAX_ATTEMPTS) {
    window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count: 0, until: Date.now() + LOCKOUT_MS }));
    return { ok: false, error: "Too many failed attempts. Access is paused for 60 seconds." };
  }
  window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count, until: 0 }));
  return { ok: false, error: `Incorrect username or PIN. ${MAX_ATTEMPTS - count} attempts left.` };
}
