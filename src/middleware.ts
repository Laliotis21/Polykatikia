import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth middleware placeholder.
 * When Supabase keys are set, Agent 2 should refresh session cookies here.
 * Public paths stay open for health/dev until Auth is wired.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
