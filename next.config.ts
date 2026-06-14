import type { NextConfig } from "next";

const nextConfig = {
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
} satisfies NextConfig as NextConfig;

export default nextConfig;
