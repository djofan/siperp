import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects() {
    return [
      { source: "/sip", destination: "/", permanent: true },
      { source: "/sip/:path*", destination: "/:path*", permanent: true },
    ];
  },
  outputFileTracingIncludes: {
    "/admin/super/backup": ["./scripts/erp-backup.mjs", "./scripts/lib/erp-backup.mjs", "./node_modules/@next/env/**/*"],
  },
  // Uploaded academy files are persistent runtime data, not build assets.
  outputFileTracingExcludes: {
    "/*": ["./.erp-backups/**/*", "./.erp-restore-test/**/*"],
    "/api/academy/**": ["./.academy-uploads/**/*"],
    "/admin/academy/**": ["./.academy-uploads/**/*"],
  },
};

export default nextConfig;
