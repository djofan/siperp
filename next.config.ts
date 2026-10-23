import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "51mb" } },
  async rewrites() {
    const backend = (process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");
    return {
      beforeFiles: [
        { source: "/uploads/sip/:filename", destination: `${backend}/sip/files/:filename` },
        { source: "/uploads/sarsip/:filename", destination: `${backend}/sarsip/files/:filename` },
        { source: "/uploads/lazsip/:filename", destination: `${backend}/lazsip/files/:filename` },
        { source: "/api/:path*", destination: `${backend}/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  allowedDevOrigins: ["127.0.0.1"],
  redirects() {
    return [
      { source: "/sip", destination: "/", permanent: true },
      { source: "/sip/:path*", destination: "/:path*", permanent: true },
    ];
  },
  outputFileTracingExcludes: {
    "/*": ["./api/**/*"],
  },
};

export default nextConfig;
