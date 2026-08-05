import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  // TTF files loaded via fs path at PDF render time — keep them in the serverless bundle.
  outputFileTracingIncludes: {
    "/api/buildings/[id]/koinoxrista/pdf": [
      "./src/domain/koinoxrista/pdf/fonts/**/*",
    ],
  },
};

export default nextConfig;
