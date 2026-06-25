// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],
  typescript: {
    ignoreBuildErrors: true, // Adicione esta linha
  },
};

export default nextConfig;
