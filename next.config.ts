import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Send /api/* to the RAG backend in dev so the browser doesn't need CORS.
  // In production set NEXT_PUBLIC_API_URL and skip the rewrite.
  async rewrites() {
    const target = process.env.RAG_API_PROXY_TARGET;
    if (!target) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
