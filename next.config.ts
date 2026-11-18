import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  experimental: { cpus: 1 },
  images: { unoptimized: true, remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }] }
};
export default nextConfig;

