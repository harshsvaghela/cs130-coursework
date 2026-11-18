"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { attemptLogin } from "@/lib/auth";
import { useDb } from "@/lib/db";
import { toast } from "@/lib/toast";
import { Logo, Spinner } from "@/components/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const { settings } = useDb();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const usernameError = username.trim() ? null : "Enter your staff username.";
  const pinError = /^\d{4,6}$/.test(pin) ? null : "Enter your 4 to 6 digit PIN.";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (usernameError || pinError) return;
    setBusy(true);
    const res = attemptLogin(username, pin);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setPin("");
      return;
    }
    toast(`Welcome back, ${username.trim()}.`, "success");
    router.replace("/admin");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="panel-dark relative hidden flex-col justify-between overflow-hidden p-12 text-cream lg:flex">
        <div className="pointer-events-none absolute inset-[14px] rounded-[30px] border border-gold/15" />
        <Logo tone="light" size="md" />
        <div className="relative">
          <p className="eyebrow mb-5">Staff & cashier access</p>
          <h1 className="display text-[64px] leading-[1.02]">
            Every stamp, <span className="italic text-gold-soft">honoured.</span>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ivory/75">
            Manage the Dolce Fedeltà programme: confirm purchases, redeem rewards and keep a complete audit trail for every stamp.
          </p>
        </div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Casa Tiramisù · Mumbai · IST</p>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center px-6 py-14 md:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Logo tone="dark" size="md" />
          </div>
          <p className="eyebrow mb-4">Staff sign in</p>
          <h2 className="display text-[44px] leading-[1.02] text-espresso">Welcome back.</h2>
          <p className="mt-3 text-[15px] text-choc/70">Sign in to open the staff dashboard.</p>

          <form onSubmit={submit} noValidate className="card-luxe relative mt-10 space-y-6 overflow-hidden p-7 sm:p-9">
            <div className="hairline absolute inset-x-0 top-0" />
            <div>
              <label htmlFor="username" className="label">
                Username
              </label>
              <input
                id="username"
                className={`field ${touched && usernameError ? "field-invalid" : ""}`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="admin"
                aria-invalid={touched && !!usernameError}
              />
              {touched && usernameError && <p className="mt-2 text-[13px] text-red-800">{usernameError}</p>}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="pin" className="label !mb-0">
                  PIN or password
                </label>
                <button type="button" onClick={() => setShowPin((s) => !s)} className="text-[11px] font-semibold uppercase tracking-[0.18em] text-choc hover:text-gold">
                  {showPin ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="pin"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={6}
                className={`field tracking-[0.4em] ${touched && pinError ? "field-invalid" : ""}`}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                aria-invalid={touched && !!pinError}
              />
              {touched && pinError && <p className="mt-2 text-[13px] text-red-800">{pinError}</p>}
            </div>

            {error && (
              <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-900">
                {error}
              </p>
            )}

            <button type="submit" className="btn-espresso w-full" disabled={busy}>
              {busy ? <Spinner /> : null} Sign in securely
            </button>
          </form>

          <div className="mt-6 rounded-[24px] border border-gold/40 bg-gold/10 p-6 text-[13px] leading-relaxed text-choc">
            <p className="eyebrow mb-3 !text-choc">Demo credentials</p>
            <p>
              Username: <strong className="font-mono text-espresso">{settings.adminUsername}</strong>
              <br />
              PIN: <strong className="font-mono text-espresso">{settings.adminPin === "1234" ? "1234" : "•••• (changed in Settings)"}</strong>
            </p>
            <p className="mt-3 text-[12px] text-choc/75">
              For demonstration only. Change the username and PIN in <em>Settings → Admin access</em> and use a secure server-side login before any real business use.
            </p>
          </div>

          <p className="mt-8 text-center text-[13px] text-muted">
            <Link href="/" className="font-semibold text-choc underline underline-offset-4 hover:text-gold">
              ← Back to the customer website
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
