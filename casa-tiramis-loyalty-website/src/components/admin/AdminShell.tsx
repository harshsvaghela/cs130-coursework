"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { useDb } from "@/lib/db";
import type { AdminSession } from "@/lib/auth";
import { Logo } from "../ui";

type IconKey = "overview" | "customers" | "scanner" | "stamps" | "rewards" | "transactions" | "reports" | "settings";

const ICONS: Record<IconKey, ReactElement> = {
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M2.8 20c.8-3.5 3.2-5.4 6.2-5.4s5.4 1.9 6.2 5.4" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.2 14.8c1.6.9 2.6 2.7 3 5.2" />
    </>
  ),
  scanner: (
    <>
      <path d="M3.5 8V5.5a2 2 0 0 1 2-2H8M16 3.5h2.5a2 2 0 0 1 2 2V8M20.5 16v2.5a2 2 0 0 1-2 2H16M8 20.5H5.5a2 2 0 0 1-2-2V16" />
      <path d="M7.5 12h9" />
    </>
  ),
  stamps: (
    <>
      <ellipse cx="12" cy="12" rx="6.5" ry="8.5" transform="rotate(-22 12 12)" />
      <path d="M9.6 5.8c2.6 2.9 2.1 5.9 3.5 8.2 1 1.7 2 2.8 3 4" />
    </>
  ),
  rewards: (
    <>
      <rect x="3.5" y="8.5" width="17" height="4" rx="1" />
      <path d="M5 12.5V20h14v-7.5M12 8.5V20" />
      <path d="M12 8.5c-1.6-3.2-5.5-3.4-5.5-.9 0 1.4 2.4.9 5.5.9Zm0 0c1.6-3.2 5.5-3.4 5.5-.9 0 1.4-2.4.9-5.5.9Z" />
    </>
  ),
  transactions: (
    <>
      <path d="M8 6.5h12M8 12h12M8 17.5h12" />
      <circle cx="4" cy="6.5" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="17.5" r="1" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20.5h16" />
      <path d="M7 17V11M12 17V6.5M17 17v-3.5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
};

export const ADMIN_NAV: { href: string; label: string; icon: IconKey }[] = [
  { href: "/admin", label: "Overview", icon: "overview" },
  { href: "/admin/customers", label: "Customers", icon: "customers" },
  { href: "/admin/scanner", label: "QR Scanner", icon: "scanner" },
  { href: "/admin/stamps", label: "Stamp Management", icon: "stamps" },
  { href: "/admin/rewards", label: "Rewards", icon: "rewards" },
  { href: "/admin/transactions", label: "Transactions", icon: "transactions" },
  { href: "/admin/reports", label: "Reports", icon: "reports" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

function NavIcon({ name, className = "h-[18px] w-[18px]" }: { name: IconKey; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export function AdminShell({ session, onLogout, children }: { session: AdminSession; onLogout: () => void; children: ReactNode }) {
  const pathname = usePathname();
  const { settings } = useDb();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="min-h-screen bg-cream md:flex">
      {/* Desktop sidebar */}
      <aside className="panel-dark sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-gold/15 px-6 py-8 text-cream md:flex">
        <Logo tone="light" size="sm" href="/admin" />
        <div className="hairline mt-8 opacity-60" />
        <p className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted">Management</p>
        <nav className="mt-4 flex-1 space-y-1" aria-label="Admin">
          {ADMIN_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3.5 rounded-2xl px-4 py-3 text-[14px] transition ${
                  active ? "bg-gold/15 text-gold-soft shadow-[inset_0_0_0_1px_rgba(199,161,106,0.35)]" : "text-ivory/70 hover:bg-cream/5 hover:text-cream"
                }`}
              >
                <NavIcon name={item.icon} />
                <span className="font-medium">{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-2xl border border-gold/20 bg-dark/40 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Signed in as</p>
          <p className="mt-1 font-medium text-cream">{session.username}</p>
          <p className="mt-0.5 text-[11px] text-muted">{settings.brandName} · Staff</p>
          <button onClick={onLogout} className="mt-4 w-full rounded-full border border-gold/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold transition hover:bg-gold hover:text-espresso">
            Sign out
          </button>
        </div>
        <Link href="/" className="mt-5 text-center text-[11px] uppercase tracking-[0.2em] text-muted transition hover:text-gold">
          ← Customer website
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 border-b border-espresso/10 bg-cream/90 px-5 pb-3 pt-4 backdrop-blur-md md:hidden">
          <div className="flex items-center justify-between">
            <Logo tone="dark" size="sm" href="/admin" />
            <div className="flex items-center gap-2">
              <Link href="/" aria-label="Customer website" className="grid h-9 w-9 place-items-center rounded-full border border-espresso/15 text-choc">
                <span className="text-[13px]">↗</span>
              </Link>
              <button onClick={onLogout} className="rounded-full bg-espresso px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cream">
                Sign out
              </button>
            </div>
          </div>
          <nav className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1" aria-label="Admin sections">
            {ADMIN_NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                    active ? "bg-espresso text-gold" : "border border-espresso/15 bg-white/60 text-choc"
                  }`}
                >
                  <NavIcon name={item.icon} className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="min-w-0 flex-1 px-5 pb-16 pt-8 md:px-10 md:pt-12 lg:px-14">{children}</main>
      </div>
    </div>
  );
}
