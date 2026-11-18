"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { awardStamp, removeStamp, useDb, pendingRewardFor, type Customer } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatMobile, formatNumber } from "@/lib/format";
import { toast } from "@/lib/toast";
import { Celebration } from "./Celebration";
import { Field, Modal, Spinner } from "./ui";

export type StampMode = "award" | "remove" | null;

const REMOVE_REASONS = [
  "Entered by mistake",
  "Non-eligible purchase",
  "Refund or exchange",
  "Customer request",
  "Other (explain below)",
];

function newToken() {
  return `tok-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Confirmation flows for stamping and un-stamping. Awarding requires an explicit confirmation —
 * scanning a QR code never awards a stamp by itself.
 */
export function StampActionDialog({
  mode,
  customer,
  onClose,
}: {
  mode: StampMode;
  customer: Customer | null;
  onClose: () => void;
}) {
  const data = useDb();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bill, setBill] = useState("");
  const [reasonPreset, setReasonPreset] = useState<string>(REMOVE_REASONS[0]);
  const [reasonNote, setReasonNote] = useState("");
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const tokenRef = useRef<string>("");
  const staff = useMemo(() => getSession()?.username ?? data.settings.adminUsername, [data.settings.adminUsername, mode]);

  const open = mode !== null && customer !== null && celebrate === null;
  const live = customer ? data.customers.find((c) => c.id === customer.id) ?? customer : null;
  const req = data.settings.stampRequirement;
  const pending = live ? pendingRewardFor(data, live.id) : undefined;
  const cardFull = !!live && (live.currentStamps >= req || !!pending);

  // Fresh confirmation token every time the dialog opens — used to block duplicate submissions.
  useEffect(() => {
    if (mode) {
      tokenRef.current = newToken();
      setError(null);
      setBill("");
      setReasonPreset(REMOVE_REASONS[0]);
      setReasonNote("");
    }
  }, [mode, customer?.id]);

  const close = () => {
    if (busy) return;
    setCelebrate(null);
    onClose();
  };

  const confirmAward = () => {
    if (busy || !live) return;
    setError(null);
    let billAmount: number | undefined;
    if (bill.trim()) {
      const parsed = Number(bill.replace(/[,₹\s]/g, ""));
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Enter the bill amount in rupees, or leave it blank.");
        return;
      }
      billAmount = Math.round(parsed);
    }
    setBusy(true);
    const result = awardStamp(live.id, { token: tokenRef.current, staff, billAmount });
    setBusy(false);
    tokenRef.current = newToken(); // any further click requires a new, deliberate confirmation
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast(result.message || "Stamp awarded", "success");
    if (result.data?.unlocked) {
      setCelebrate(result.data.rewardName);
    } else {
      onClose();
    }
  };

  const confirmRemove = () => {
    if (busy || !live) return;
    setError(null);
    const note = reasonNote.trim();
    if (reasonPreset.startsWith("Other") && note.length < 3) {
      setError("Please describe the reason for removing this stamp.");
      return;
    }
    const reason = reasonPreset.startsWith("Other") ? note : note ? `${reasonPreset} — ${note}` : reasonPreset;
    setBusy(true);
    const result = removeStamp(live.id, { reason, staff });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast(result.message || "Stamp removed", "info");
    onClose();
  };

  return (
    <>
      <Modal
        open={open && mode === "award"}
        onClose={close}
        eyebrow="Purchase confirmation"
        title="Award 1 stamp"
        dismissible={!busy}
        footer={
          <>
            <button className="btn-ghost w-full sm:w-auto" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button className="btn-gold w-full sm:w-auto" onClick={confirmAward} disabled={busy || cardFull}>
              {busy ? <Spinner /> : null} Confirm Stamp
            </button>
          </>
        }
      >
        {live && (
          <div className="space-y-5">
            <p className="font-serif text-[22px] leading-snug text-espresso">
              Confirm purchase and award <span className="text-choc">1 stamp</span> to this customer?
            </p>
            <div className="rounded-2xl border border-espresso/10 bg-white/70 p-4 text-[14px]">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-espresso">{live.name}</span>
                <span className="font-mono text-[12px] text-muted">{live.id}</span>
              </div>
              <div className="mt-1 text-[13px] text-muted">{formatMobile(live.mobile)}</div>
              <div className="mt-3 flex items-center gap-3">
                <span className="font-serif text-[20px] text-espresso">
                  {live.currentStamps} / {req}
                </span>
                <span className="text-[12px] uppercase tracking-[0.2em] text-muted">→ {formatNumber(Math.min(req, live.currentStamps + 1))} after this stamp</span>
              </div>
            </div>
            {cardFull && (
              <p className="rounded-2xl bg-gold/15 px-4 py-3 text-[13px] text-choc">
                This card is complete. Redeem the reward from the Rewards desk before adding another stamp.
              </p>
            )}
            <Field label="Bill amount (optional, ₹)" hint="Recorded for reporting only. Leave blank if not needed.">
              <input
                className="field"
                inputMode="numeric"
                placeholder="e.g. 650"
                value={bill}
                onChange={(e) => setBill(e.target.value)}
                aria-label="Bill amount in rupees"
              />
            </Field>
            {error && (
              <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-red-900">
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={open && mode === "remove"}
        onClose={close}
        eyebrow="Correction"
        title="Remove 1 stamp"
        dismissible={!busy}
        footer={
          <>
            <button className="btn-ghost w-full sm:w-auto" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button className="btn-espresso w-full sm:w-auto" onClick={confirmRemove} disabled={busy || !live || live.currentStamps <= 0}>
              {busy ? <Spinner /> : null} Remove Stamp
            </button>
          </>
        }
      >
        {live && (
          <div className="space-y-5">
            <p className="text-[14px] leading-relaxed text-choc/80">
              {live.name} currently has <strong className="text-espresso">{live.currentStamps}</strong> of {req} stamps. A reason is required and
              the correction is recorded in Transactions.
            </p>
            <div>
              <span className="label">Reason</span>
              <div className="flex flex-wrap gap-2">
                {REMOVE_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReasonPreset(r)}
                    className={`rounded-full border px-4 py-2 text-[12px] font-semibold transition ${
                      reasonPreset === r ? "border-espresso bg-espresso text-cream" : "border-espresso/15 bg-white/70 text-choc hover:border-gold"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <Field label={reasonPreset.startsWith("Other") ? "Details (required)" : "Note (optional)"}>
              <textarea
                className="field min-h-[84px] resize-none"
                value={reasonNote}
                maxLength={200}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="Add a short explanation for the audit trail"
              />
            </Field>
            {error && (
              <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-red-900">
                {error}
              </p>
            )}
            {live.currentStamps <= 0 && <p className="text-[13px] text-muted">This card has no stamps to remove.</p>}
          </div>
        )}
      </Modal>

      <Celebration
        open={celebrate !== null}
        onClose={close}
        rewardName={celebrate ?? data.settings.rewardName}
        customerName={live?.name}
        actions={
          <Link href="/admin/rewards" className="btn-ghost-light w-full" onClick={() => setCelebrate(null)}>
            Open Rewards Desk
          </Link>
        }
      />
    </>
  );
}
