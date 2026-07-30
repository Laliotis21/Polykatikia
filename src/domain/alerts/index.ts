export {
  createAlert,
  isTransactionClient,
  listAlerts,
  listOpenAlerts,
  shouldEnqueueAlertNotify,
  type CreateAlertInput,
  type CreateAlertResult,
  type DbClient,
} from "./create";
export {
  ackAlert,
  ackOrResolveAlert,
  resolveAlert,
  type AckOrResolveAlertInput,
} from "./resolve";

/** Re-export for Agent 2 — call after $transaction commits for HIGH alerts. */
export { sendAlertNotifyEvent } from "@/inngest/events";
