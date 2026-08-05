import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getSessionUser } from "@/lib/auth";

/**
 * Dashboard shell. Require a resolved session via `getSessionUser`
 * (Supabase cookie and/or `DEMO_AUTH_EMAIL` fallback). Aligns with proxy AuthZ.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const demoAuth = Boolean(process.env.DEMO_AUTH_EMAIL?.trim());

  // When neither Supabase nor demo auth is configured, allow local shell
  // (APIs still return 401 until DEMO_AUTH_EMAIL or Supabase is set).
  const user = await getSessionUser();
  if (((url && anon) || demoAuth) && !user) {
    redirect("/");
  }

  return (
    <AppShell user={user && { email: user.email, role: user.role }}>
      {children}
    </AppShell>
  );
}
