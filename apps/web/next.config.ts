import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@certiva/ui", "@certiva/types"],
};

export default nextConfig;
