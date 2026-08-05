import { dunningDaily } from "./functions/dunning-daily";
import { notifyAdmin } from "./functions/notify-admin";
import { receiptsProcess } from "./functions/receipts-process";
import { koinoxristaIssued } from "./functions/koinoxrista-issued";

export { inngest, EVENTS } from "./client";
export {
  sendAlertNotifyEvent,
  sendReceiptProcessEvent,
  sendKoinoxristaIssuedEvent,
} from "./events";

export const inngestFunctions = [
  notifyAdmin,
  dunningDaily,
  receiptsProcess,
  koinoxristaIssued,
];
