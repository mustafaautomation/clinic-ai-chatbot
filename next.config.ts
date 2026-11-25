import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingIncludes: {
    "/api/chat": ["./kb/**/*"],
    "/api/channels/whatsapp": ["./kb/**/*"],
    "/api/channels/messenger": ["./kb/**/*"],
    "/api/admin/evals": ["./kb/**/*", "./evals/cases.yaml"],
    "/knowledge": ["./kb/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
