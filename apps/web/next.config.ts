import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://pharos-production-9b4e.up.railway.app/api/:path*",
      },
    ];
  },
};

export default nextConfig;

