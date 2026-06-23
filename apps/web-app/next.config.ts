import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@pipevitta/database", "@pipevitta/design-system"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;