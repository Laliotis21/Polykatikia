import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

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
 * Resolve the current operator from Supabase Auth cookies + Prisma `User`.
 * Returns null when Supabase public config is missing or session is absent.
 *
 * Demo fallback: when Supabase is unset and `DEMO_AUTH_EMAIL` matches a User,
 * return that user (local demos without Auth).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    const demoEmail = process.env.DEMO_AUTH_EMAIL?.trim();
    if (demoEmail) {
      const dbUser = await prisma.user.findUnique({
        where: { email: demoEmail },
        select: { id: true, email: true, role: true },
      });
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
        };
      }
    }
    return null;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component context where cookies are read-only.
        }
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: data.user.email },
    select: { id: true, email: true, role: true },
  });
  if (!dbUser) {
    return null;
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
  };
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

export class AuthError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/** Require OPERATOR or ADMIN for create/upload paths. */
export function requireOperator(user: SessionUser | null): SessionUser {
  if (!user) {
    throw new AuthError(401, "Unauthorized");
  }
  if (!canCreateTransactions(user.role)) {
    throw new AuthError(403, "Forbidden: OPERATOR or ADMIN required");
  }
  return user;
}

/** Require any authenticated role that can view (VIEWER+). */
export function requireViewer(user: SessionUser | null): SessionUser {
  if (!user) {
    throw new AuthError(401, "Unauthorized");
  }
  if (!canView(user.role)) {
    throw new AuthError(403, "Forbidden");
  }
  return user;
}
