import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
