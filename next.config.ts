// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Adicione esta linha
  serverExternalPackages: ["@prisma/client", "pg"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
