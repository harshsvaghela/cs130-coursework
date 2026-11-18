"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { useDb } from "@/lib/db";
import { Logo } from "./ui";

type IconName = "home" | "card" | "gift" | "user" | "plus";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, ReactElement> = {
    home: (
      <>
        <path d="M3.5 10.5 12 3.8l8.5 6.7" {...common} />
        <path d="M5.5 9.5V20h13V9.5" {...common} />
        <path d="M10 20v-5h4v5" {...common} />
      </>
    ),
    card: (
      <>
        <rect x="2.8" y="5.5" width="18.4" height="13" rx="2.6" {...common} />
        <path d="M2.8 10h18.4" {...common} />
        <path d="M6.5 14.5h4" {...common} />
      </>
    ),
    gift: (
      <>
        <rect x="3.5" y="8.5" width="17" height="4" rx="1" {...common} />
        <path d="M5 12.5V20h14v-7.5" {...common} />
        <path d="M12 8.5V20" {...common} />
        <path d="M12 8.5c-1.6-3.2-5.5-3.4-5.5-.9 0 1.4 2.4.9 5.5.9Zm0 0c1.6-3.2 5.5-3.4 5.5-.9 0 1.4-2.4.9-5.5.9Z" {...common} />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8.5" r="3.8" {...common} />
        <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" {...common} />
      </>
    ),
    plus: (
      <>
        <circle cx="12" cy="12" r="8.8" {...common} />
        <path d="M12 8v8M8 12h8" {...common} />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

const NAV = [
  { href: "/", label: "Home", icon: "home" as IconName },
  { href: "/card", label: "My Card", icon: "card" as IconName },
  { href: "/reward", label: "Rewards", icon: "gift" as IconName },
  { href: "/profile", label: "Profile", icon: "user" as IconName },
  { href: "/register", label: "Join", icon: "plus" as IconName },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-espresso/10 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 md:px-8">
        <Logo tone="dark" size="sm" />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {NAV.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={`relative py-2 text-[12px] font-semibold uppercase tracking-[0.2em] transition hover:text-gold ${
                isActive(pathname, item.href) ? "text-espresso after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-gold" : "text-choc/70"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/admin/login" className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-muted transition hover:text-choc lg:inline">
            Staff
          </Link>
          <Link href="/register" className="btn-espresso !px-5 !py-2.5 !text-[11px]">
            Join the club
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-espresso/10 bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Mobile"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                  active ? "text-espresso" : "text-muted"
                }`}
              >
                <span className={`grid h-9 w-14 place-items-center rounded-full transition ${active ? "bg-espresso text-gold shadow-soft" : ""}`}>
                  <Icon name={item.icon} className="h-[18px] w-[18px]" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  const { settings } = useDb();
  return (
    <footer className="relative mt-24 overflow-hidden bg-dark text-cream">
      <div className="hairline absolute inset-x-0 top-0" />
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-12 md:px-8 md:py-20">
        <div className="md:col-span-5">
          <Logo tone="light" size="md" />
          <p className="mt-6 max-w-sm font-serif text-[22px] leading-snug text-ivory/90">
            Tiramisù, made slowly and served with care — and a little thank-you for every visit.
          </p>
        </div>
        <div className="md:col-span-3">
          <p className="eyebrow mb-5">Visit</p>
          <address className="space-y-2 not-italic text-[14px] leading-relaxed text-ivory/75">
            <p>{settings.businessAddress}</p>
            <p>Open daily · 11:00 AM to 10:00 PM IST</p>
          </address>
        </div>
        <div className="md:col-span-4">
          <p className="eyebrow mb-5">Contact</p>
          <ul className="space-y-3 text-[14px] text-ivory/75">
            <li>
              <a className="transition hover:text-gold" href={`tel:${settings.businessPhone.replace(/\s/g, "")}`}>
                {settings.businessPhone}
              </a>
            </li>
            <li>
              <a className="transition hover:text-gold" href={`mailto:${settings.businessEmail}`}>
                {settings.businessEmail}
              </a>
            </li>
            <li className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-[12px] uppercase tracking-[0.2em] text-muted">
              <Link href="/reward" className="hover:text-gold">Rewards</Link>
              <Link href="/card" className="hover:text-gold">My card</Link>
              <Link href="/profile" className="hover:text-gold">Profile</Link>
              <Link href="/admin/login" className="hover:text-gold">Staff</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-[11px] uppercase tracking-[0.2em] text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <p>© {new Date().getFullYear()} Casa Tiramisù · Made in India · All prices in ₹ (INR)</p>
          <p>Demo loyalty platform · Data stored on this device</p>
        </div>
      </div>
    </footer>
  );
}

export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pb-28 md:pb-0">{children}</main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
