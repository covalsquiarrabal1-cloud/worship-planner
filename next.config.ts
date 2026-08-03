import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimize for mobile
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  // Ensure googleapis doesn't leak to client bundle
  serverExternalPackages: ['googleapis'],
};

export default nextConfig;
