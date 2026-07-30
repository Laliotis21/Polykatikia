import { Prisma } from "@prisma/client";
import { AuthError } from "@/lib/auth";
import { KoinoxristaError, MSG_ALREADY_FINALIZED } from "./errors";

export type MappedHttpError = { status: number; error: string };

/**
 * Map domain / Prisma errors for κοινόχρηστα API routes.
 * Returns null when the error is not recognized (caller should 500).
 */
export function mapKoinoxristaHttpError(err: unknown): MappedHttpError | null {
  if (err instanceof AuthError) {
    return { status: err.status, error: err.message };
  }
  if (err instanceof KoinoxristaError) {
    return { status: err.status, error: err.message };
  }
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    return { status: 409, error: MSG_ALREADY_FINALIZED };
  }
  return null;
}
