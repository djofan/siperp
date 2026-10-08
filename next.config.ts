import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev saja: izinkan membuka app lewat 127.0.0.1 (cookie terpisah dari localhost) untuk menguji
  // dua sesi sekaligus, mis. superadmin di localhost & akun demo Tanwir di 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
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
    "/api/tanwir/**": ["./.tanwir-uploads/**/*"],
    "/tanwir/**": ["./.tanwir-uploads/**/*"],
    "/api/ojol/**": ["./.ojol-uploads/**/*"],
    "/ojol/**": ["./.ojol-uploads/**/*"],
  },
};

export default nextConfig;
