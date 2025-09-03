import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      config.module.rules.push({
        test: /\.(md|node)$/,
        use: "ignore-loader",
      });

      config.externals = [
        ...config.externals,
        "@libsql/darwin-arm64",
        "@libsql/linux-x64-gnu",
        "@libsql/win32-x64-msvc",
      ];
    }

    return config;
  },
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
  // PWA Configuration
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/sw.js',
        destination: '/sw.js',
      },
    ];
  },
};

export default nextConfig;
