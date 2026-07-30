import {
  ensureDunningNoticeForCharge,
  findOverdueCharges,
  markDunningNoticeSent,
  resolveOwnerEmailForApartment,
  sendDunningReminderEmail,
  utcDayKey,
  type OverdueCharge,
} from "@/domain/dunning";
import { inngest } from "../client";

type SerializedCharge = Omit<OverdueCharge, "occurredAt"> & {
  occurredAt: string | Date;
};

function reviveCharge(c: SerializedCharge): OverdueCharge {
  return {
    ...c,
    occurredAt:
      c.occurredAt instanceof Date
        ? c.occurredAt
        : new Date(c.occurredAt),
  };
}

/**
 * Daily dunning: overdue CHARGE transactions → reminder email → DunningNotice.
 * Idempotent by charge+day (`dunning:{chargeId}:{yyyy-mm-dd}`).
 */
export const dunningDaily = inngest.createFunction(
  {
    id: "dunning-daily",
    name: "dunning/daily",
    triggers: [{ cron: "0 8 * * *" }],
  },
  async ({ step }) => {
    const dayKey = utcDayKey();

    const charges = await step.run("find-overdue-charges", async () => {
      const rows = await findOverdueCharges();
      // Step output is JSON — serialize dates explicitly
      return rows.map((c) => ({
        ...c,
        occurredAt: c.occurredAt.toISOString(),
      }));
    });

    let processed = 0;
    let emailed = 0;
    let skipped = 0;

    for (const raw of charges) {
      const charge = reviveCharge(raw);
      const result = await step.run(
        `dunning-${charge.id}-${dayKey}`,
        async () => {
          const owner = await resolveOwnerEmailForApartment(charge.apartmentId);
          const ensured = await ensureDunningNoticeForCharge({
            charge,
            dayKey,
            ownerId: owner?.ownerId ?? null,
            ownerEmail: owner?.email ?? null,
          });

          if (ensured.alreadySent) {
            return { status: "already_sent" as const };
          }

          if (!owner?.email) {
            return { status: "no_email" as const, noticeId: ensured.noticeId };
          }

          const sendResult = await sendDunningReminderEmail({
            to: owner.email,
            amountCents: charge.amountCents,
            dueDate: charge.occurredAt,
            buildingId: charge.buildingId,
          });

          await markDunningNoticeSent(ensured.noticeId, charge.id, dayKey);

          return {
            status: "sent" as const,
            noticeId: ensured.noticeId,
            emailed: sendResult.sent,
          };
        },
      );

      processed += 1;
      if (result.status === "sent" && result.emailed) emailed += 1;
      if (result.status === "already_sent" || result.status === "no_email") {
        skipped += 1;
      }
    }

    return { dayKey, processed, emailed, skipped, total: charges.length };
  },
);
