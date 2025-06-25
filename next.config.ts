import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    turbo: {
      rules: {
        '*.test.ts': {
          loaders: ['ignore-loader'],
        },
        '*.test.tsx': {
          loaders: ['ignore-loader'],
        },
        '*.spec.ts': {
          loaders: ['ignore-loader'],
        },
        '*.spec.tsx': {
          loaders: ['ignore-loader'],
        },
        'vitest.config.ts': {
          loaders: ['ignore-loader'],
        },
        'playwright.config.ts': {
          loaders: ['ignore-loader'],
        },
      },
    },
  },
  /* config options here */
};

export default nextConfig;
