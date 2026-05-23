import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/portal-v2" : "",
  assetPrefix: isProd ? "/portal-v2/" : "",
  images: { unoptimized: true },
};

export default nextConfig;
