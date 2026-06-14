import type { NextConfig } from "next";

// Vercel's serverless functions only bundle files that Next.js can statically
// trace. Dynamic fs access via process.cwd() is not traceable, so
// content/posts/** must be declared explicitly so it is included in the API
// route bundle and available at request time.
// `outputFileTracingIncludes` is a top-level key in Next.js 16 but the
// published @types/next still types it under `experimental`, so we cast.
const nextConfig = {
  serverExternalPackages: ["isomorphic-dompurify"],
  outputFileTracingIncludes: {
    "/api/**": ["./content/posts/**/*"],
  },
} satisfies NextConfig as NextConfig;

export default nextConfig;
