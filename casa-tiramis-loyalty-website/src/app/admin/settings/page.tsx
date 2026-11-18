"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { exportBackupJson, importBackup, resetDemoData, rewardStateFor, updateSettings, useDb, type Settings } from "@/lib/db";
import { formatDateTime, formatMobile, formatNumber, normalizeMobile, validateEmail } from "@/lib/format";
import { downloadFile, stamp, toCSV } from "@/lib/csv";
import { toast } from "@/lib/toast";
import { Field, Modal, PageTitle, Spinner } from "@/components/ui";

type Draft = Settings & { newPin: string; confirmPin: string };

export default function SettingsPage() {
  const data = useDb();
  const [draft, setDraft] = useState<Draft>(() => ({ ...data.settings, newPin: "", confirmPin: "" }));
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync the form when settings change from elsewhere (e.g. a restored backup or reset).
  useEffect(() => {
    setDraft({ ...data.settings, newPin: "", confirmPin: "" });
  }, [data.settings]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<keyof Draft, string>> = {};
    if (draft.brandName.trim().length < 2) next.brandName = "Brand name must be at least 2 characters.";
    if (draft.rewardName.trim().length < 3) next.rewardName = "Reward name must be at least 3 characters.";
    if (draft.programDescription.trim().length < 10) next.programDescription = "Please describe the programme in at least 10 characters.";
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(draft.adminUsername)) next.adminUsername = "Use 3–20 letters, numbers, dots, dashes or underscores.";
    if (draft.newPin && !/^\d{4,6}$/.test(draft.newPin)) next.newPin = "PIN must be 4 to 6 digits.";
    if (draft.newPin && draft.newPin !== draft.confirmPin) next.confirmPin = "PINs do not match.";
    if (!normalizeMobile(draft.businessPhone) && !/^\+?[\d\s()-]{6,20}$/.test(draft.businessPhone)) next.businessPhone = "Enter an Indian mobile or landline number, e.g. +91 98200 14080.";
    const emailErr = validateEmail(draft.businessEmail);
    if (!draft.businessEmail.trim() || emailErr) next.businessEmail = emailErr || "Business email is required.";
    if (draft.businessAddress.trim().length < 6) next.businessAddress = "Please enter the boutique address.";
    setErrors(next);
    if (Object.keys(next).length) {
      toast("Please fix the highlighted settings.", "error");
      return;
    }

    setSaving(true);
    const patch: Partial<Settings> = {
      brandName: draft.brandName.trim(),
      tagline: draft.tagline.trim(),
      stampRequirement: Number(draft.stampRequirement),
      rewardName: draft.rewardName.trim(),
      adminUsername: draft.adminUsername.trim(),
      businessPhone: draft.businessPhone.trim(),
      businessEmail: draft.businessEmail.trim().toLowerCase(),
      businessAddress: draft.businessAddress.trim(),
      programDescription: draft.programDescription.trim(),
    };
    if (draft.newPin) patch.adminPin = draft.newPin;
    const res = updateSettings(patch);
    setSaving(false);
    if (!res.ok) {
      const msg = res.error;
      if (/stamp/i.test(msg)) setErrors((x) => ({ ...x, stampRequirement: msg }));
      toast(msg, "error");
      return;
    }
    toast("Settings saved. Changes apply across the site.", "success");
  };

  const exportCustomers = () => {
    downloadFile(
      `casa-tiramisu-customers-${stamp()}.csv`,
      toCSV(
        ["Customer ID", "Name", "Mobile", "Email", "Registered (IST)", "Current stamps", "Lifetime stamps", "Cycle", "Reward status"],
        data.customers.map((c) => [c.id, c.name, formatMobile(c.mobile), c.email, formatDateTime(c.registeredAt), c.currentStamps, c.lifetimeStamps, c.cycle, rewardStateFor(data, c)]),
      ),
    );
    toast("Customer CSV downloaded.", "success");
  };

  const exportTransactions = () => {
    downloadFile(
      `casa-tiramisu-transactions-${stamp()}.csv`,
      toCSV(
        ["Transaction ID", "Date & time (IST)", "Customer", "Customer ID", "Type", "Stamp change", "Cycle", "Staff", "Note", "Bill (INR)"],
        data.txns.map((t) => [t.id, formatDateTime(t.at), t.customerName, t.customerId, t.type, t.stampChange, t.cycle, t.staff, t.reason || "", t.billAmount ?? ""]),
      ),
    );
    toast("Transaction CSV downloaded.", "success");
  };

  const backup = () => {
    downloadFile(`casa-tiramisu-backup-${stamp()}.json`, exportBackupJson(), "application/json");
    toast("Backup file downloaded. Keep it somewhere safe.", "success");
  };

  const restore = async (file: File) => {
    const text = await file.text();
    if (!window.confirm("Restore this backup? Current data on this device will be replaced by the backup file.")) return;
    const res = importBackup(text);
    toast(res.ok ? res.message || "Backup restored." : res.error, res.ok ? "success" : "error");
  };

  const reset = () => {
    if (resetText !== "RESET") return;
    resetDemoData();
    setResetOpen(false);
    setResetText("");
    toast("Demo data reset to the original sample members.", "info");
  };

  const req = Number(draft.stampRequirement);
  const inputErr = (k: keyof Draft) => (errors[k] ? "field field-invalid" : "field");

  return (
    <div className="space-y-10">
      <PageTitle
        eyebrow="Configuration"
        title="Settings"
        description="Brand, loyalty rules, staff access and business contact details. Regional settings are fixed to India."
        actions={
          <button type="submit" form="settings-form" className="btn-espresso" disabled={saving}>
            {saving ? <Spinner /> : null} Save changes
          </button>
        }
      />

      <form id="settings-form" onSubmit={save} noValidate className="grid gap-8 xl:grid-cols-12">
        <div className="space-y-8 xl:col-span-8">
          {/* Brand */}
          <section className="card-luxe reveal p-6 sm:p-8">
            <p className="eyebrow mb-2">Brand</p>
            <h2 className="display mb-6 text-[28px] text-espresso">Identity</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Brand name" error={errors.brandName} htmlFor="brandName">
                <input id="brandName" className={inputErr("brandName")} value={draft.brandName} onChange={(e) => set("brandName", e.target.value)} />
              </Field>
              <Field label="Tagline" htmlFor="tagline" hint="Shown under the wordmark.">
                <input id="tagline" className="field" value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
              </Field>
            </div>
            <div className="mt-6 grid gap-4 rounded-2xl border border-gold/30 bg-gold/10 p-5 sm:grid-cols-3">
              <div>
                <p className="label !mb-1">Country</p>
                <p className="font-medium text-espresso">{draft.country}</p>
              </div>
              <div>
                <p className="label !mb-1">Currency</p>
                <p className="font-medium text-espresso">INR (₹)</p>
              </div>
              <div>
                <p className="label !mb-1">Timezone · Locale</p>
                <p className="font-medium text-espresso">Asia/Kolkata · en-IN</p>
              </div>
              <p className="text-[12px] text-choc/75 sm:col-span-3">Date format DD/MM/YYYY, 12-hour time, Indian digit grouping (1,00,000). Fixed for this India deployment.</p>
            </div>
          </section>

          {/* Loyalty rules */}
          <section className="card-luxe reveal reveal-delay-1 p-6 sm:p-8">
            <p className="eyebrow mb-2">Loyalty programme</p>
            <h2 className="display mb-6 text-[28px] text-espresso">Rules &amp; reward</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Stamps required per reward" error={errors.stampRequirement} htmlFor="req" hint="Default is 8. Choose 10 for a longer card. Cannot be changed while a reward is awaiting redemption.">
                <div className="flex gap-2">
                  {[8, 10].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => set("stampRequirement", n)}
                      className={`flex-1 rounded-2xl border px-4 py-3.5 text-[15px] font-semibold transition ${req === n ? "border-espresso bg-espresso text-gold" : "border-espresso/15 bg-white/70 text-choc hover:border-gold"}`}
                      aria-pressed={req === n}
                    >
                      {n} stamps{n === 8 ? " · default" : ""}
                    </button>
                  ))}
                </div>
                <select id="req" className="field mt-3" value={draft.stampRequirement} onChange={(e) => set("stampRequirement", Number(e.target.value))} aria-label="Other stamp requirement">
                  {Array.from({ length: 8 }, (_, i) => i + 5).map((n) => (
                    <option key={n} value={n}>
                      {n} stamps
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Reward name" error={errors.rewardName} htmlFor="rewardName">
                <input id="rewardName" className={inputErr("rewardName")} value={draft.rewardName} onChange={(e) => set("rewardName", e.target.value)} />
              </Field>
            </div>
            <div className="mt-5">
              <Field label="Loyalty programme description" error={errors.programDescription} htmlFor="desc">
                <textarea id="desc" className={`${inputErr("programDescription")} min-h-[110px] resize-y`} value={draft.programDescription} onChange={(e) => set("programDescription", e.target.value)} />
              </Field>
            </div>
            <p className="mt-5 rounded-2xl bg-ivory/60 px-5 py-4 text-[13px] leading-relaxed text-choc/80">
              Current rule: 1 eligible purchase = 1 stamp · {formatNumber(req)} stamps = <strong className="text-espresso">{draft.rewardName}</strong>. History is never deleted when the rule changes.
            </p>
          </section>

          {/* Admin access */}
          <section className="card-luxe reveal reveal-delay-2 p-6 sm:p-8">
            <p className="eyebrow mb-2">Staff access</p>
            <h2 className="display mb-6 text-[28px] text-espresso">Admin login</h2>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Admin username" error={errors.adminUsername} htmlFor="adminUsername">
                <input id="adminUsername" className={inputErr("adminUsername")} value={draft.adminUsername} onChange={(e) => set("adminUsername", e.target.value)} autoCapitalize="none" />
              </Field>
              <Field label="New PIN (optional)" error={errors.newPin} htmlFor="newPin" hint="4–6 digits. Leave blank to keep.">
                <input id="newPin" type="password" inputMode="numeric" maxLength={6} className={inputErr("newPin")} value={draft.newPin} onChange={(e) => set("newPin", e.target.value.replace(/\D/g, ""))} autoComplete="new-password" />
              </Field>
              <Field label="Confirm PIN" error={errors.confirmPin} htmlFor="confirmPin">
                <input id="confirmPin" type="password" inputMode="numeric" maxLength={6} className={inputErr("confirmPin")} value={draft.confirmPin} onChange={(e) => set("confirmPin", e.target.value.replace(/\D/g, ""))} autoComplete="new-password" />
              </Field>
            </div>
            <p className="mt-5 text-[12px] text-muted">
              Demo default: admin / 1234. Change it before real business use. Sessions automatically end after 8 hours.
            </p>
          </section>

          {/* Business contact */}
          <section className="card-luxe reveal reveal-delay-3 p-6 sm:p-8">
            <p className="eyebrow mb-2">Business contact</p>
            <h2 className="display mb-6 text-[28px] text-espresso">Shown on the website</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Business phone" error={errors.businessPhone} htmlFor="phone" hint="Indian format, e.g. +91 98200 14080">
                <input id="phone" type="tel" className={inputErr("businessPhone")} value={draft.businessPhone} onChange={(e) => set("businessPhone", e.target.value)} />
              </Field>
              <Field label="Business email" error={errors.businessEmail} htmlFor="email">
                <input id="email" type="email" className={inputErr("businessEmail")} value={draft.businessEmail} onChange={(e) => set("businessEmail", e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Boutique address" error={errors.businessAddress} htmlFor="address">
                  <input id="address" className={inputErr("businessAddress")} value={draft.businessAddress} onChange={(e) => set("businessAddress", e.target.value)} />
                </Field>
              </div>
            </div>
          </section>
        </div>

        {/* Data & production */}
        <aside className="space-y-8 xl:col-span-4">
          <section className="card-luxe reveal p-6 sm:p-8">
            <p className="eyebrow mb-2">Data</p>
            <h2 className="display mb-2 text-[26px] text-espresso">Export &amp; backup</h2>
            <p className="mb-6 text-[13px] leading-relaxed text-muted">Demo data lives in this browser's LocalStorage. Download a backup regularly.</p>
            <div className="space-y-3">
              <button type="button" className="btn-ghost w-full" onClick={exportCustomers}>Export customers (CSV)</button>
              <button type="button" className="btn-ghost w-full" onClick={exportTransactions}>Export transactions (CSV)</button>
              <button type="button" className="btn-espresso w-full" onClick={backup}>Download full backup (JSON)</button>
              <button type="button" className="btn-ghost w-full" onClick={() => fileRef.current?.click()}>Restore from backup</button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) restore(f);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="mt-5 text-[12px] text-muted">{formatNumber(data.customers.length)} members · {formatNumber(data.txns.length)} transactions · {formatNumber(data.rewards.length)} reward records</p>
          </section>

          <section className="rounded-[28px] border border-red-900/20 bg-red-50/60 p-6 sm:p-8">
            <p className="eyebrow mb-2 !text-red-900">Danger zone</p>
            <h2 className="display mb-3 text-[24px] text-espresso">Reset demo data</h2>
            <p className="mb-5 text-[13px] leading-relaxed text-choc/80">Restores the original sample members and clears all changes made on this device. This cannot be undone.</p>
            <button type="button" className="rounded-full border border-red-900/40 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-red-900 transition hover:bg-red-900 hover:text-cream" onClick={() => setResetOpen(true)}>
              Reset demo data
            </button>
          </section>

          <section className="panel-dark reveal rounded-[28px] p-6 text-cream sm:p-8">
            <p className="eyebrow mb-3">Before real business use</p>
            <ul className="space-y-3 text-[13px] leading-relaxed text-ivory/80">
              <li>• LocalStorage is <strong className="text-cream">not</strong> a secure or shared production database. Data stays on one browser.</li>
              <li>• Use a secure backend with a shared online database (for example PostgreSQL) and server-side stamp validation.</li>
              <li>• Move admin login to a protected server session with hashed credentials and role-based staff accounts.</li>
              <li>• Validate reward redemption on the server and keep cloud backups with customer-data protection (DPDP Act 2023 compliance).</li>
            </ul>
          </section>
        </aside>
      </form>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        eyebrow="Danger zone"
        title="Reset demo data?"
        footer={
          <>
            <button className="btn-ghost w-full sm:w-auto" onClick={() => setResetOpen(false)}>Cancel</button>
            <button className="w-full rounded-full bg-red-900 px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.16em] text-cream disabled:opacity-40 sm:w-auto" onClick={reset} disabled={resetText !== "RESET"}>
              Erase and reset
            </button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-choc/85">
          All members, stamps, rewards and transactions on this device will be replaced with the original demo sample. Type <strong className="font-mono text-espresso">RESET</strong> to confirm.
        </p>
        <input className="field mt-5 font-mono" value={resetText} onChange={(e) => setResetText(e.target.value.toUpperCase())} placeholder="RESET" aria-label="Type RESET to confirm" />
        <p className="mt-4 text-[12px] text-muted">The reset also restores default settings, including the demo admin login (admin / 1234).</p>
      </Modal>
    </div>
  );
}

