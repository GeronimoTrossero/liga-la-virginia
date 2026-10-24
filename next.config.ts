import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  experimental: {
    serverActions: {
      // The v0 preview proxy forwards requests with an Origin that differs from x-forwarded-host.
      allowedOrigins: ["localhost:3000", "*.v0.build", "*.vercel.run", "*.vusercontent.net", "*.v0.app"],
    },
  },
};

export default nextConfig;
