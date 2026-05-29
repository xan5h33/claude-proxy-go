import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone only needed for Docker self-hosting (set NEXT_STANDALONE=true), not Vercel
  ...(process.env.NEXT_STANDALONE === "true" ? { output: "standalone" } : {}),
};

export default nextConfig;
