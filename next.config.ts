import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? "/rag-chat-ui" : undefined,
  assetPrefix: isGitHubPages ? "/rag-chat-ui/" : undefined,
  // Send /api/* to the RAG backend in dev so the browser doesn't need CORS.
  // In production set NEXT_PUBLIC_API_URL and skip the rewrite.
  ...(isGitHubPages
    ? {}
    : {
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
      }),
};

export default nextConfig;
