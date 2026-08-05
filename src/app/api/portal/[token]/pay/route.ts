import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  assertOwnerCanPayCharge,
  payCharge,
  PaymentError,
} from "@/domain/payments";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

const bodySchema = z.object({
  chargeId: z.string().min(1),
});

/** System actor for portal demo payments (seeded). */
const PORTAL_ACTOR_EMAIL = "portal@polykatoikia.local";

/**
 * POST /api/portal/[token]/pay
 * Demo pay — creates INCOME linked to CHARGE; no real PSP.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    await assertOwnerCanPayCharge(prisma, {
      portalToken: token,
      chargeId: parsed.data.chargeId,
    });

    let actor = await prisma.user.findUnique({
      where: { email: PORTAL_ACTOR_EMAIL },
      select: { id: true },
    });
    if (!actor) {
      actor = await prisma.user.create({
        data: {
          email: PORTAL_ACTOR_EMAIL,
          name: "Portal Demo",
          role: "OPERATOR",
        },
        select: { id: true },
      });
    }

    const result = await payCharge(prisma, {
      chargeId: parsed.data.chargeId,
      createdById: actor.id,
      description: `Πληρωμή portal (demo)`,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PaymentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
