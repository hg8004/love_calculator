import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // astronomy-engine 은 외부 모듈로 두지 않고 함께 번들한다.
  // (외부로 두면 Vercel의 Node가 esm/astronomy.js 를 CommonJS로 읽어 "Unexpected token 'export'" 로 모든 API가 실패함)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
