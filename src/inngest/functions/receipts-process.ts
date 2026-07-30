import { EVENTS, inngest } from "../client";

/**
 * Optional async OCR for slow providers. Agent 2 owns OCR internals;
 * this stub loads the receipt id and no-ops until wired.
 * Idempotency: event id `receipt:{receiptId}`.
 */
export const receiptsProcess = inngest.createFunction(
  {
    id: "receipts-process",
    name: "receipts/process",
    triggers: [{ event: EVENTS.RECEIPT_PROCESS }],
  },
  async ({ event, step }) => {
    const receiptId = event.data.receiptId as string;

    await step.run("noop-placeholder", async () => {
      // Agent 2 wires real OCR update here via domain/ocr.
      return { receiptId, status: "deferred_to_agent_2" };
    });

    return { receiptId, handled: true };
  },
);
