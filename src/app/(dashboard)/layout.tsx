import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getSessionUser } from "@/lib/auth";

/**
 * Dashboard shell. When Supabase public config is present, require a session
 * (aligns with proxy + `getSessionUser` / API AuthZ).
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user = null;
  if (url && anon) {
    user = await getSessionUser();
    if (!user) {
      redirect("/");
    }
  }

  return (
    <AppShell user={user && { email: user.email, role: user.role }}>
      {children}
    </AppShell>
  );
}
