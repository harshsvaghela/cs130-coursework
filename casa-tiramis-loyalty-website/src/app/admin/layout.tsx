"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Spinner } from "@/components/ui";
import { endSession, getSession, type AdminSession } from "@/lib/auth";
import { toast } from "@/lib/toast";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [session, setSession] = useState<AdminSession | null | undefined>(undefined);

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (!current && !isLogin) router.replace("/admin/login");
    if (current && isLogin) router.replace("/admin");
  }, [pathname, isLogin, router]);

  const logout = useCallback(() => {
    endSession();
    setSession(null);
    toast("You have signed out securely.", "info");
    router.replace("/admin/login");
  }, [router]);

  if (isLogin) return <>{children}</>;

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream text-muted">
        <div className="flex items-center gap-3 text-[13px] uppercase tracking-[0.2em]">
          <Spinner /> Verifying staff access
        </div>
      </div>
    );
  }

  return (
    <AdminShell session={session} onLogout={logout}>
      {children}
    </AdminShell>
  );
}
