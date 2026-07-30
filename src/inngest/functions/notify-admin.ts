import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import { EVENTS, inngest } from "../client";

/**
 * Email ADMIN users when a HIGH OCR_MISMATCH / ANOMALY alert is created.
 * Trigger: event `alert/created`. Idempotency via event id `alert:{id}:notify`.
 */
export const notifyAdmin = inngest.createFunction(
  {
    id: "alerts-notify-admin",
    name: "alerts/notify-admin",
    triggers: [{ event: EVENTS.ALERT_CREATED }],
  },
  async ({ event, step }) => {
    const alertId = event.data.alertId as string;

    const alert = await step.run("load-alert", async () => {
      return prisma.alert.findUnique({ where: { id: alertId } });
    });

    if (!alert) {
      return { skipped: true, reason: "alert_not_found" };
    }

    if (alert.type !== "OCR_MISMATCH" && alert.type !== "ANOMALY") {
      return { skipped: true, reason: "type_not_notifiable" };
    }

    if (alert.severity !== "HIGH") {
      return { skipped: true, reason: "not_high" };
    }

    const admins = await step.run("load-admins", async () => {
      return prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { email: true, name: true },
      });
    });

    if (admins.length === 0) {
      return { skipped: true, reason: "no_admins" };
    }

    const recipients = admins.map((a) => a.email);

    await step.run("send-email", async () => {
      return sendEmail({
        to: recipients,
        subject: `[Polykatoikia] ${alert.type}: ${alert.title}`,
        text: [
          `Alert: ${alert.type} (${alert.severity})`,
          `Title: ${alert.title}`,
          alert.body ? `Body: ${alert.body}` : null,
          alert.buildingId ? `Building: ${alert.buildingId}` : null,
          alert.transactionId ? `Transaction: ${alert.transactionId}` : null,
          `Alert id: ${alert.id}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    });

    return { sent: true, alertId, recipients: recipients.length };
  },
);
