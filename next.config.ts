import type { NextConfig } from "next";

const nextConfig = {
  serverExternalPackages: ["isomorphic-dompurify"],
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
} satisfies NextConfig as NextConfig;

export default nextConfig;
