import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "polykatoikia",
  name: "Polykatoikia",
});

/** Event names used across domain + jobs */
export const EVENTS = {
  ALERT_CREATED: "alert/created",
  RECEIPT_PROCESS: "receipt/process",
  KOINOXRISTA_ISSUED: "koinoxrista/issued",
} as const;
