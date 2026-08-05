import { inngest, EVENTS } from "../client";
import { sendIssuanceNoticesForCharges } from "@/domain/notices";

type IssuedData = {
  settlementId: string;
  buildingId: string;
  buildingName: string;
  year: number;
  month: number;
  chargeIds: string[];
  appOrigin: string;
};

export const koinoxristaIssued = inngest.createFunction(
  {
    id: "koinoxrista-issued-notices",
    name: "Koinoxrista issuance notices",
    triggers: [{ event: EVENTS.KOINOXRISTA_ISSUED }],
  },
  async ({ event, step }) => {
    const data = event.data as IssuedData;
    const results = await step.run("send-notices", async () =>
      sendIssuanceNoticesForCharges({
        chargeIds: data.chargeIds,
        buildingName: data.buildingName,
        year: data.year,
        month: data.month,
        appOrigin: data.appOrigin,
      }),
    );
    return {
      settlementId: data.settlementId,
      emailed: results.filter((r) => r.emailed).length,
      total: results.length,
      results,
    };
  },
);
