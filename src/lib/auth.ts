import type { Role } from "@prisma/client";

export type { Role };

export const ROLES = ["ADMIN", "OPERATOR", "VIEWER"] as const satisfies readonly Role[];

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
};

/** Role capability helpers (app-level AuthZ; service-role Prisma in v1). */
export function canCreateTransactions(role: Role): boolean {
  return role === "ADMIN" || role === "OPERATOR";
}

export function canAckAlerts(role: Role): boolean {
  return role === "ADMIN";
}

export function canView(role: Role): boolean {
  return role === "ADMIN" || role === "OPERATOR" || role === "VIEWER";
}

/**
 * Thin auth stub: returns null when Supabase keys are missing.
 * Agent 2/3 should call this and map to 401 when null.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return null;
  }
  // Full Supabase session wiring lands with Agent 2 receipts API.
  return null;
}

export function requireRole(
  user: SessionUser | null,
  allowed: Role[],
): SessionUser {
  if (!user) {
    throw new Error("Unauthorized");
  }
  if (!allowed.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}
