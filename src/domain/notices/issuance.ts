import { formatEurFromCents } from "@/domain/money";
import { resolveOwnerEmailForApartment } from "@/domain/dunning";
import { sendEmail } from "@/lib/resend";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

type DbClient = PrismaClient;

export type IssuanceNoticeResult = {
  chargeId: string;
  emailed: boolean;
  to: string | null;
  reason?: string;
};

/**
 * Email each apartment owner a post-finalize κοινόχρηστα notice with portal link.
 * Soft-fails per charge when email missing or Resend unconfigured.
 */
export async function sendIssuanceNoticesForCharges(
  input: {
    chargeIds: string[];
    buildingName: string;
    year: number;
    month: number;
    /** Public origin for portal links, e.g. https://app.example.com */
    appOrigin: string;
  },
  db: DbClient = prisma,
): Promise<IssuanceNoticeResult[]> {
  const results: IssuanceNoticeResult[] = [];
  const period = `${String(input.month).padStart(2, "0")}/${input.year}`;

  for (const chargeId of input.chargeIds) {
    const charge = await db.transaction.findUnique({
      where: { id: chargeId },
      include: {
        apartment: { select: { id: true, label: true } },
      },
    });
    if (!charge || charge.type !== "CHARGE") {
      results.push({
        chargeId,
        emailed: false,
        to: null,
        reason: "not_charge",
      });
      continue;
    }

    const owner = await resolveOwnerEmailForApartment(charge.apartmentId, db);
    if (!owner) {
      results.push({
        chargeId,
        emailed: false,
        to: null,
        reason: "no_owner_email",
      });
      continue;
    }

    const portalOwner = charge.apartmentId
      ? await db.apartmentOwner.findFirst({
          where: {
            apartmentId: charge.apartmentId,
            ownerId: owner.ownerId,
          },
          include: { owner: { select: { portalToken: true } } },
        })
      : null;
    const token = portalOwner?.owner.portalToken;
    const portalUrl = token
      ? `${input.appOrigin.replace(/\/$/, "")}/portal/${token}`
      : null;

    const euros = formatEurFromCents(charge.amountCents);
    const lines = [
      `Κοινόχρηστα ${period} — ${input.buildingName}`,
      `Διαμέρισμα: ${charge.apartment?.label ?? "—"}`,
      `Ποσό: ${euros}`,
      charge.description ? `Ανάλυση: ${charge.description}` : null,
      portalUrl
        ? `Πληρωμή / λεπτομέρειες: ${portalUrl}`
        : "Επικοινωνήστε με τη διαχείριση για πληρωμή.",
    ]
      .filter(Boolean)
      .join("\n");

    const sent = await sendEmail({
      to: owner.email,
      subject: `Ειδοποιητήριο κοινοχρήστων ${period} — ${euros}`,
      text: lines,
    });

    results.push({
      chargeId,
      emailed: sent.sent,
      to: owner.email,
      reason: sent.sent
        ? undefined
        : sent.reason === "missing_api_key"
          ? "missing_api_key"
          : "send_error",
    });
  }

  return results;
}
