import { serve } from "inngest/next";
import { inngest, inngestFunctions } from "@/inngest";
import { getEnv } from "@/lib/env";

getEnv();

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
