import createMDX from "@next/mdx";

const dev = process.env.NODE_ENV !== "production";

// Browser may talk only to us, to the testnet RPC for the send page, to Cloudflare Web Analytics, and load token icons.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  `connect-src 'self' https://sepolia-rollup.arbitrum.io https://cloudflareinsights.com${dev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // self-contained server bundle for the Docker image (node server.js)
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR || ".next",
  pageExtensions: ["ts", "tsx", "mdx"],
  async redirects() {
    return [{ source: "/aml", destination: "/token", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default createMDX({})(nextConfig);
