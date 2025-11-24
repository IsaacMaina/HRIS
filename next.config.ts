import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      'bcryptjs',
      'jspdf',
      'jspdf-autotable',
      'xlsx'
    ],
  },
  // Turbopack configuration
  compiler: {
    // Empty compiler config to make Turbopack work properly
  },
  // Only use webpack for specific builds if needed
  // Turbopack will be used by default for development
};

export default nextConfig;
