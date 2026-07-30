import { EVENTS, inngest } from "./client";

/**
 * Enqueue admin notify for a HIGH alert.
 * Agent 2: call after `$transaction` commits (or let `createAlert` do it
 * when `enqueueNotify` is left true outside a transaction).
 *
 * Idempotency: Inngest event id `alert:{alertId}:notify`
 */
export async function sendAlertNotifyEvent(alertId: string): Promise<void> {
  await inngest.send({
    id: `alert:${alertId}:notify`,
    name: EVENTS.ALERT_CREATED,
    data: { alertId },
  });
}

/** Optional hook for Agent 2 async OCR path */
export async function sendReceiptProcessEvent(
  receiptId: string,
): Promise<void> {
  await inngest.send({
    id: `receipt:${receiptId}`,
    name: EVENTS.RECEIPT_PROCESS,
    data: { receiptId },
  });
}
