"use client";

// Demo data layer for Casa Tiramisù.
// Everything is persisted to LocalStorage (demo only — see the Settings page for production guidance).
// All business rules (stamp caps, cooldowns, reward unlock/redeem, history) live here.

import { useSyncExternalStore } from "react";
import { normalizeMobile } from "./format";

export type TxnType =
  | "customer_registered"
  | "stamp_added"
  | "stamp_removed"
  | "reward_unlocked"
  | "reward_redeemed";

export interface Customer {
  id: string; // e.g. CT-7K3M9P — public customer ID (no personal data inside)
  cardNumber: string; // 12 digits, shown as 4821 0937 5512
  name: string;
  mobile: string; // 10-digit Indian mobile (stored without +91)
  email: string;
  registeredAt: string; // ISO timestamp
  currentStamps: number; // stamps in the current loyalty cycle
  cycle: number; // loyalty cycle number, starts at 1
  lifetimeStamps: number; // every stamp ever awarded — never reduced
  lastStampAt: string | null;
}

export interface Txn {
  id: string; // TX-000001
  type: TxnType;
  customerId: string;
  customerName: string;
  at: string; // ISO timestamp (IST shown in UI)
  stampChange: number; // +1, -1 or 0
  cycle: number;
  staff: string; // admin/staff who performed the action
  reason?: string;
  billAmount?: number; // optional bill value entered by cashier (INR)
  rewardId?: string;
}

export interface Reward {
  id: string; // RW-000001
  customerId: string;
  customerName: string;
  cycle: number;
  name: string;
  status: "unlocked" | "redeemed";
  unlockedAt: string;
  redeemedAt: string | null;
  redeemedBy: string | null;
}

export interface Settings {
  brandName: string;
  tagline: string;
  country: string;
  currency: string;
  timezone: string;
  stampRequirement: number;
  rewardName: string;
  adminUsername: string;
  adminPin: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  programDescription: string;
}

export interface AppData {
  version: 1;
  seq: number;
  customers: Customer[];
  txns: Txn[];
  rewards: Reward[];
  settings: Settings;
}

export const STORAGE_KEY = "casa-tiramisu-loyalty-v1";

export const DEFAULT_SETTINGS: Settings = {
  brandName: "Casa Tiramisù",
  tagline: "Dolce Fedeltà",
  country: "India",
  currency: "INR (₹)",
  timezone: "Asia/Kolkata",
  stampRequirement: 8,
  rewardName: "1 Free Tiramisu Box",
  adminUsername: "admin",
  adminPin: "1234",
  businessPhone: "+91 98200 14080",
  businessEmail: "ciao@casatiramisu.in",
  businessAddress: "Linking Road, Bandra West, Mumbai 400050",
  programDescription:
    "Every eligible Tiramisu purchase earns one stamp. Collect the required stamps on your card and enjoy a complimentary Tiramisu Box, on us.",
};

const EMPTY: AppData = {
  version: 1,
  seq: 0,
  customers: [],
  txns: [],
  rewards: [],
  settings: DEFAULT_SETTINGS,
};

const DAY = 86_400_000;
const ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I for legibility

/* ---------------- internal helpers ---------------- */

function randomString(length: number, alphabet: string): string {
  let out = "";
  const bytes = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 0xffffffff);
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function newCustomerId(existing: Customer[]): string {
  let id = "";
  do {
    id = `CT-${randomString(6, ID_CHARS)}`;
  } while (existing.some((c) => c.id === id));
  return id;
}

function newCardNumber(existing: Customer[]): string {
  let num = "";
  do {
    num = randomString(12, "0123456789");
  } while (existing.some((c) => c.cardNumber === num));
  return num;
}

function pad(n: number, size = 6) {
  return String(n).padStart(size, "0");
}

/* ---------------- store plumbing ---------------- */

let cache: AppData | null = null;
const listeners = new Set<() => void>();

function persist(data: AppData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked (e.g. private mode). The in-memory state still works for this session.
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function commit(next: AppData) {
  cache = next;
  persist(next);
  notify();
}

function load(): AppData {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppData>;
      if (parsed && Array.isArray(parsed.customers) && Array.isArray(parsed.txns)) {
        cache = {
          ...EMPTY,
          ...parsed,
          rewards: Array.isArray(parsed.rewards) ? parsed.rewards : [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        } as AppData;
        return cache;
      }
    }
  } catch {
    // Corrupt JSON — fall through and reseed.
  }
  cache = buildSeed();
  persist(cache);
  return cache;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      cache = null;
      notify();
    }
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Non-hook read for event handlers. */
export function getDb(): AppData {
  return load();
}

/** React hook: re-renders whenever the LocalStorage-backed data changes. */
export function useDb(): AppData {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

/* ---------------- derived helpers (pure) ---------------- */

export type RewardState = "LOCKED" | "UNLOCKED" | "REDEEMED";

export function pendingRewardFor(data: AppData, customerId: string): Reward | undefined {
  return data.rewards.find((r) => r.customerId === customerId && r.status === "unlocked");
}

export function rewardStateFor(data: AppData, customer: Customer): RewardState {
  if (pendingRewardFor(data, customer.id)) return "UNLOCKED";
  const lastRedeemed = data.rewards
    .filter((r) => r.customerId === customer.id && r.status === "redeemed")
    .sort((a, b) => (b.redeemedAt || "").localeCompare(a.redeemedAt || ""))[0];
  if (lastRedeemed && customer.currentStamps === 0 && customer.cycle > 1) return "REDEEMED";
  return "LOCKED";
}

export function findCustomerById(data: AppData, id: string): Customer | undefined {
  const key = id.trim().toUpperCase();
  return data.customers.find((c) => c.id === key);
}

export function findCustomerByMobile(data: AppData, mobile: string): Customer | undefined {
  const digits = normalizeMobile(mobile);
  if (!digits) return undefined;
  return data.customers.find((c) => c.mobile === digits);
}

/** Smart lookup: mobile, Customer ID, card number or name. */
export function searchCustomers(data: AppData, query: string): Customer[] {
  const q = query.trim();
  if (!q) return [];
  const upper = q.toUpperCase();
  const digits = q.replace(/\D/g, "");
  if (upper.startsWith("CT-") || /^CT[A-Z0-9]{6}$/.test(upper)) {
    const id = upper.replace(/^CT-?/, "CT-");
    return data.customers.filter((c) => c.id === id);
  }
  if (digits.length >= 10 && normalizeMobile(q)) {
    const byMobile = findCustomerByMobile(data, q);
    return byMobile ? [byMobile] : [];
  }
  if (digits.length === 12) {
    return data.customers.filter((c) => c.cardNumber === digits);
  }
  const lower = q.toLowerCase();
  return data.customers.filter(
    (c) => c.name.toLowerCase().includes(lower) || c.id.includes(upper) || (digits.length >= 4 && c.mobile.includes(digits)),
  );
}

export function customerHistory(data: AppData, customerId: string): Txn[] {
  return data.txns.filter((t) => t.customerId === customerId).sort((a, b) => b.at.localeCompare(a.at));
}

export function customerRewards(data: AppData, customerId: string): Reward[] {
  return data.rewards
    .filter((r) => r.customerId === customerId)
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));
}

/* ---------------- mutations ---------------- */

export type Result<T = unknown> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

export interface RegisterInput {
  name: string;
  mobile: string;
  email?: string;
}

export function registerCustomer(input: RegisterInput, staff = "Self-service"): Result<Customer> {
  const data = load();
  const digits = normalizeMobile(input.mobile);
  if (!digits) return { ok: false, error: "Please enter a valid 10-digit Indian mobile number starting with 6–9." };
  if (data.customers.some((c) => c.mobile === digits)) {
    return { ok: false, error: "DUPLICATE" };
  }
  const now = new Date().toISOString();
  const customer: Customer = {
    id: newCustomerId(data.customers),
    cardNumber: newCardNumber(data.customers),
    name: input.name.trim().replace(/\s+/g, " "),
    mobile: digits,
    email: (input.email || "").trim().toLowerCase(),
    registeredAt: now,
    currentStamps: 0,
    cycle: 1,
    lifetimeStamps: 0,
    lastStampAt: null,
  };
  const seq = data.seq + 1;
  const txn: Txn = {
    id: `TX-${pad(seq)}`,
    type: "customer_registered",
    customerId: customer.id,
    customerName: customer.name,
    at: now,
    stampChange: 0,
    cycle: 1,
    staff,
  };
  commit({ ...data, seq, customers: [customer, ...data.customers], txns: [txn, ...data.txns] });
  return { ok: true, data: customer, message: "Welcome to the Casa Tiramisù loyalty club." };
}

/** Tokens already used to confirm a purchase in this browser session — blocks double-submits. */
const usedPurchaseTokens = new Set<string>();
export const STAMP_COOLDOWN_MS = 4000;

export function awardStamp(
  customerId: string,
  opts: { token: string; staff: string; billAmount?: number },
): Result<{ customer: Customer; unlocked: boolean; rewardName: string }> {
  if (usedPurchaseTokens.has(opts.token)) {
    return { ok: false, error: "This purchase has already been confirmed. Duplicate stamp blocked." };
  }
  const data = load();
  const customer = findCustomerById(data, customerId);
  if (!customer) return { ok: false, error: "Customer not found." };
  const req = data.settings.stampRequirement;

  if (pendingRewardFor(data, customer.id) || customer.currentStamps >= req) {
    return {
      ok: false,
      error: `This card is complete. Redeem the reward before adding more stamps to cycle ${customer.cycle}.`,
    };
  }
  if (customer.lastStampAt && Date.now() - new Date(customer.lastStampAt).getTime() < STAMP_COOLDOWN_MS) {
    return { ok: false, error: "A stamp was just recorded for this customer. Please wait a few seconds." };
  }
  if (opts.billAmount !== undefined && (!Number.isFinite(opts.billAmount) || opts.billAmount < 0 || opts.billAmount > 10_00_000)) {
    return { ok: false, error: "Bill amount must be a valid rupee value." };
  }

  usedPurchaseTokens.add(opts.token);
  const now = new Date().toISOString();
  let seq = data.seq;
  const txns: Txn[] = [];
  const rewards = [...data.rewards];

  const newStamps = customer.currentStamps + 1;
  const unlocked = newStamps === req;
  const updated: Customer = {
    ...customer,
    currentStamps: newStamps,
    lifetimeStamps: customer.lifetimeStamps + 1,
    lastStampAt: now,
  };

  seq += 1;
  txns.push({
    id: `TX-${pad(seq)}`,
    type: "stamp_added",
    customerId: customer.id,
    customerName: customer.name,
    at: now,
    stampChange: 1,
    cycle: customer.cycle,
    staff: opts.staff,
    billAmount: opts.billAmount,
  });

  if (unlocked) {
    seq += 1;
    const rewardId = `RW-${pad(seq)}`;
    rewards.unshift({
      id: rewardId,
      customerId: customer.id,
      customerName: customer.name,
      cycle: customer.cycle,
      name: data.settings.rewardName,
      status: "unlocked",
      unlockedAt: now,
      redeemedAt: null,
      redeemedBy: null,
    });
    seq += 1;
    txns.push({
      id: `TX-${pad(seq)}`,
      type: "reward_unlocked",
      customerId: customer.id,
      customerName: customer.name,
      at: now,
      stampChange: 0,
      cycle: customer.cycle,
      staff: "System",
      reason: data.settings.rewardName,
      rewardId,
    });
  }

  commit({
    ...data,
    seq,
    customers: data.customers.map((c) => (c.id === customer.id ? updated : c)),
    txns: [...txns, ...data.txns],
    rewards,
  });

  return {
    ok: true,
    data: { customer: updated, unlocked, rewardName: data.settings.rewardName },
    message: unlocked
      ? "Stamp awarded. The reward is now unlocked!"
      : `Stamp awarded. ${updated.currentStamps} of ${req} collected.`,
  };
}

export function removeStamp(
  customerId: string,
  opts: { reason: string; staff: string },
): Result<Customer> {
  const data = load();
  const customer = findCustomerById(data, customerId);
  if (!customer) return { ok: false, error: "Customer not found." };
  const reason = opts.reason.trim();
  if (reason.length < 3) return { ok: false, error: "Please enter a reason (at least 3 characters) for removing a stamp." };
  if (customer.currentStamps <= 0) return { ok: false, error: "This card has no stamps to remove." };
  if (pendingRewardFor(data, customer.id)) {
    return { ok: false, error: "A reward is ready for this card. Redeem it before changing stamps." };
  }
  const now = new Date().toISOString();
  const updated: Customer = { ...customer, currentStamps: customer.currentStamps - 1 };
  const seq = data.seq + 1;
  const txn: Txn = {
    id: `TX-${pad(seq)}`,
    type: "stamp_removed",
    customerId: customer.id,
    customerName: customer.name,
    at: now,
    stampChange: -1,
    cycle: customer.cycle,
    staff: opts.staff,
    reason,
  };
  commit({
    ...data,
    seq,
    customers: data.customers.map((c) => (c.id === customer.id ? updated : c)),
    txns: [txn, ...data.txns],
  });
  return { ok: true, data: updated, message: `1 stamp removed. ${updated.currentStamps} of ${data.settings.stampRequirement} remaining.` };
}

export function redeemReward(rewardId: string, staff: string): Result<Customer> {
  const data = load();
  const reward = data.rewards.find((r) => r.id === rewardId);
  if (!reward) return { ok: false, error: "Reward not found." };
  if (reward.status !== "unlocked") return { ok: false, error: "This reward has already been redeemed." };
  const customer = findCustomerById(data, reward.customerId);
  if (!customer) return { ok: false, error: "Customer not found." };

  const now = new Date().toISOString();
  const seq = data.seq + 1;
  const updatedCustomer: Customer = { ...customer, currentStamps: 0, cycle: customer.cycle + 1, lastStampAt: customer.lastStampAt };
  const txn: Txn = {
    id: `TX-${pad(seq)}`,
    type: "reward_redeemed",
    customerId: customer.id,
    customerName: customer.name,
    at: now,
    stampChange: 0,
    cycle: customer.cycle,
    staff,
    reason: reward.name,
    rewardId: reward.id,
  };
  commit({
    ...data,
    seq,
    customers: data.customers.map((c) => (c.id === customer.id ? updatedCustomer : c)),
    txns: [txn, ...data.txns],
    rewards: data.rewards.map((r) =>
      r.id === reward.id ? { ...r, status: "redeemed", redeemedAt: now, redeemedBy: staff } : r,
    ),
  });
  return {
    ok: true,
    data: updatedCustomer,
    message: `Reward redeemed. Cycle ${customer.cycle + 1} has started for ${customer.name}.`,
  };
}

export function updateSettings(patch: Partial<Settings>): Result<Settings> {
  const data = load();
  const next: Settings = { ...data.settings, ...patch };

  if (patch.stampRequirement !== undefined) {
    const req = Math.round(Number(patch.stampRequirement));
    if (!Number.isFinite(req) || req < 5 || req > 12) return { ok: false, error: "Stamp requirement must be between 5 and 12." };
    next.stampRequirement = req;
    const changed = req !== data.settings.stampRequirement;
    if (changed && data.rewards.some((r) => r.status === "unlocked")) {
      return { ok: false, error: "Redeem all ready rewards before changing the stamp requirement." };
    }
    const highest = Math.max(0, ...data.customers.map((c) => c.currentStamps));
    if (req < highest) {
      return { ok: false, error: `A customer already has ${highest} stamps. Choose ${highest} or more.` };
    }
  }
  if (patch.adminPin !== undefined && !/^\d{4,6}$/.test(patch.adminPin)) {
    return { ok: false, error: "Admin PIN must be 4 to 6 digits." };
  }
  if (patch.adminUsername !== undefined && !/^[a-zA-Z0-9_.-]{3,20}$/.test(patch.adminUsername)) {
    return { ok: false, error: "Username must be 3–20 letters, numbers, dots, dashes or underscores." };
  }
  if (patch.businessPhone !== undefined && patch.businessPhone.trim() && !normalizeMobile(patch.businessPhone) && !/^\+?[\d\s()-]{6,20}$/.test(patch.businessPhone)) {
    return { ok: false, error: "Enter a valid business phone number." };
  }
  commit({ ...data, settings: next });
  return { ok: true, data: next, message: "Settings saved." };
}

export function resetDemoData(): void {
  usedPurchaseTokens.clear();
  commit(buildSeed());
}

export function importBackup(json: string): Result {
  try {
    const parsed = JSON.parse(json) as Partial<AppData>;
    if (!parsed || !Array.isArray(parsed.customers) || !Array.isArray(parsed.txns) || !parsed.settings) {
      return { ok: false, error: "This file is not a Casa Tiramisù backup." };
    }
    commit({
      ...EMPTY,
      ...parsed,
      rewards: Array.isArray(parsed.rewards) ? parsed.rewards : [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    } as AppData);
    return { ok: true, message: "Backup restored successfully." };
  } catch {
    return { ok: false, error: "Could not read this file. Please choose a valid backup." };
  }
}

export function exportBackupJson(): string {
  return JSON.stringify({ ...load(), exportedAt: new Date().toISOString() }, null, 2);
}

/* ---------------- demo seed ---------------- */

interface SeedCustomer {
  name: string;
  mobile: string;
  email: string;
  daysAgo: number;
  stamps: number; // stamps in current cycle
  completedCycles: number;
}

const SEED_CUSTOMERS: SeedCustomer[] = [
  { name: "Aarav Mehta", mobile: "9876543210", email: "aarav.mehta@example.com", daysAgo: 96, stamps: 3, completedCycles: 2 },
  { name: "Ananya Iyer", mobile: "9820012345", email: "ananya.iyer@example.com", daysAgo: 81, stamps: 8, completedCycles: 1 },
  { name: "Kabir Malhotra", mobile: "9930456789", email: "", daysAgo: 64, stamps: 5, completedCycles: 1 },
  { name: "Ishita Rao", mobile: "9702234567", email: "ishita.rao@example.com", daysAgo: 52, stamps: 1, completedCycles: 0 },
  { name: "Rohan Kapoor", mobile: "9867701122", email: "", daysAgo: 40, stamps: 6, completedCycles: 0 },
  { name: "Sanya Verma", mobile: "9988776655", email: "sanya.verma@example.com", daysAgo: 33, stamps: 0, completedCycles: 1 },
  { name: "Vihaan Shah", mobile: "9821198765", email: "", daysAgo: 25, stamps: 4, completedCycles: 0 },
  { name: "Meera Nair", mobile: "9446612390", email: "meera.nair@example.com", daysAgo: 18, stamps: 2, completedCycles: 0 },
  { name: "Arjun Reddy", mobile: "9000123456", email: "", daysAgo: 12, stamps: 7, completedCycles: 0 },
  { name: "Diya Joshi", mobile: "9611450987", email: "diya.joshi@example.com", daysAgo: 7, stamps: 3, completedCycles: 0 },
  { name: "Yash Khanna", mobile: "9898012233", email: "", daysAgo: 3, stamps: 1, completedCycles: 0 },
  { name: "Priya Menon", mobile: "9812300044", email: "priya.menon@example.com", daysAgo: 1, stamps: 0, completedCycles: 0 },
];

function buildSeed(): AppData {
  const req = DEFAULT_SETTINGS.stampRequirement;
  const now = Date.now();
  const customers: Customer[] = [];
  const txns: Txn[] = [];
  const rewards: Reward[] = [];
  let seq = 0;
  const staffNames = ["admin", "admin", "admin"];

  const push = (t: Omit<Txn, "id">) => {
    seq += 1;
    txns.push({ id: `TX-${pad(seq)}`, ...t });
  };

  SEED_CUSTOMERS.forEach((s, index) => {
    const regMs = now - s.daysAgo * DAY;
    const id = `CT-${randomString(6, ID_CHARS)}`;
    const cycleTotal = s.completedCycles * req + s.stamps;
    const span = Math.max(1, now - regMs);
    const customer: Customer = {
      id,
      cardNumber: randomString(12, "0123456789"),
      name: s.name,
      mobile: s.mobile,
      email: s.email,
      registeredAt: new Date(regMs).toISOString(),
      currentStamps: s.stamps,
      cycle: s.completedCycles + 1,
      lifetimeStamps: cycleTotal,
      lastStampAt: null,
    };
    const eventTimes: number[] = [];
    const slots = cycleTotal + 1;
    for (let i = 1; i <= cycleTotal; i++) eventTimes.push(regMs + (span * i) / (slots + 1));
    const bills = [420, 650, 380, 540, 720, 480, 360, 590, 450];

    // Registration
    push({ type: "customer_registered", customerId: id, customerName: s.name, at: new Date(regMs).toISOString(), stampChange: 0, cycle: 1, staff: "Self-service" });

    // Completed cycles
    let t = 0;
    for (let c = 1; c <= s.completedCycles; c++) {
      for (let k = 0; k < req; k++) {
        const at = new Date(eventTimes[t++]).toISOString();
        push({ type: "stamp_added", customerId: id, customerName: s.name, at, stampChange: 1, cycle: c, staff: staffNames[index % 3], billAmount: bills[(index + k) % bills.length] });
      }
      const unlockAt = new Date(eventTimes[t - 1]).toISOString();
      const rewardId = `RW-${pad(seq + 1)}`;
      push({ type: "reward_unlocked", customerId: id, customerName: s.name, at: unlockAt, stampChange: 0, cycle: c, staff: "System", reason: DEFAULT_SETTINGS.rewardName, rewardId });
      const redeemAt = new Date(eventTimes[t - 1] + DAY * 0.4).toISOString();
      rewards.push({ id: rewardId, customerId: id, customerName: s.name, cycle: c, name: DEFAULT_SETTINGS.rewardName, status: "redeemed", unlockedAt: unlockAt, redeemedAt: redeemAt, redeemedBy: "admin" });
      push({ type: "reward_redeemed", customerId: id, customerName: s.name, at: redeemAt, stampChange: 0, cycle: c, staff: "admin", reason: DEFAULT_SETTINGS.rewardName, rewardId });
    }

    // Current cycle
    for (let k = 0; k < s.stamps; k++) {
      const at = new Date(eventTimes[t++] ?? now - 60_000).toISOString();
      push({ type: "stamp_added", customerId: id, customerName: s.name, at, stampChange: 1, cycle: s.completedCycles + 1, staff: staffNames[(index + k) % 3], billAmount: bills[(index + k) % bills.length] });
      customer.lastStampAt = at;
    }
    if (s.name === "Diya Joshi") {
      const at = new Date(now - 2 * DAY).toISOString();
      push({ type: "stamp_removed", customerId: id, customerName: s.name, at, stampChange: -1, cycle: s.completedCycles + 1, staff: "admin", reason: "Stamp added by mistake on a dessert-only order" });
    }
    if (s.stamps === req) {
      const rewardId = `RW-${pad(seq + 1)}`;
      const at = customer.lastStampAt || new Date(now).toISOString();
      push({ type: "reward_unlocked", customerId: id, customerName: s.name, at, stampChange: 0, cycle: customer.cycle, staff: "System", reason: DEFAULT_SETTINGS.rewardName, rewardId });
      rewards.push({ id: rewardId, customerId: id, customerName: s.name, cycle: customer.cycle, name: DEFAULT_SETTINGS.rewardName, status: "unlocked", unlockedAt: at, redeemedAt: null, redeemedBy: null });
    }
    customers.push(customer);
  });

  // Newest first for lists
  customers.sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  txns.sort((a, b) => b.at.localeCompare(a.at));
  rewards.sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));
  // Re-number transaction IDs in chronological order so they read naturally.
  const chronological = [...txns].sort((a, b) => a.at.localeCompare(b.at));
  const idMap = new Map<string, string>();
  chronological.forEach((tx, i) => idMap.set(tx.id, `TX-${pad(i + 1)}`));
  const renumbered = txns.map((tx) => ({ ...tx, id: idMap.get(tx.id) || tx.id })).sort((a, b) => b.at.localeCompare(a.at));

  return {
    version: 1,
    seq: chronological.length,
    customers,
    txns: renumbered,
    rewards,
    settings: { ...DEFAULT_SETTINGS },
  };
}
