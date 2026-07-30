"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client for Auth (login / logout). */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Supabase public config is missing");
  }
  return createBrowserClient(url, anon);
}
