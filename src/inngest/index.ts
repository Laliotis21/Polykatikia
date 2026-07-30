import { dunningDaily } from "./functions/dunning-daily";
import { notifyAdmin } from "./functions/notify-admin";
import { receiptsProcess } from "./functions/receipts-process";

export { inngest, EVENTS } from "./client";
export { sendAlertNotifyEvent, sendReceiptProcessEvent } from "./events";

export const inngestFunctions = [notifyAdmin, dunningDaily, receiptsProcess];
