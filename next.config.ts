import type { NextConfig } from "next";

const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN || "http://localhost:8000"; // 本地默认

const nextConfig: NextConfig = {
  reactCompiler: true,

  async rewrites() {
    return [
      // 1) auth API 仍然走前端自己的 handler
      { source: "/api/auth/:path*", destination: "/api/auth/:path*" },
      {
        source: "/cdn-cgi/:path*",
        destination: "/cdn-cgi/:path*",
      },

      // 2) 其他 /api/* 转发到后端
      { source: "/api/:path*", destination: `${BACKEND_ORIGIN}/api/:path*` },
    ];
  },
};

export default nextConfig;
