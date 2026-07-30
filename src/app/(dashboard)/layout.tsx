import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { getSessionUser } from "@/lib/auth";

/**
 * Dashboard shell. When Supabase public config is present, require a session
 * (aligns with middleware + `getSessionUser` / API AuthZ).
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    const user = await getSessionUser();
    if (!user) {
      redirect("/");
    }
  }

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-5 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
