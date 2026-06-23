import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pipevitta/database", "@pipevitta/design-system"],
};

export default nextConfig;