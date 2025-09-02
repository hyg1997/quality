import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude libSQL files from client-side bundling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // Ignore problematic files
      config.module.rules.push({
        test: /\.(md|node)$/,
        use: 'ignore-loader',
      });
      
      config.externals = [
        ...config.externals,
        '@libsql/darwin-arm64',
        '@libsql/linux-x64-gnu',
        '@libsql/win32-x64-msvc',
      ];
    }
    
    return config;
  },
  serverExternalPackages: ['@libsql/client', '@prisma/adapter-libsql'],
};

export default nextConfig;
