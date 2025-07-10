import {withSentryConfig} from '@sentry/nextjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude Node.js modules from client-side bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        http2: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        path: false,
        os: false,
        util: false,
        assert: false,
        buffer: false,
        events: false,
        querystring: false,
        punycode: false,
        string_decoder: false,
        timers: false,
        tty: false,
        vm: false,
        worker_threads: false,
      };
    }
    return config;
  },
  turbopack: {
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
  /* config options here */
};

export default withSentryConfig(nextConfig, {
// For all available options, see:
// https://www.npmjs.com/package/@sentry/webpack-plugin#options

org: "shane-d0",
project: "tos-analyst",

// Only print logs for uploading source maps in CI
silent: !process.env.CI,

// For all available options, see:
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

// Upload a larger set of source maps for prettier stack traces (increases build time)
widenClientFileUpload: true,

// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
// This can increase your server load as well as your hosting bill.
// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
// side errors will fail.
tunnelRoute: "/monitoring",

// Automatically tree-shake Sentry logger statements to reduce bundle size
disableLogger: true,

// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
// See the following for more information:
// https://docs.sentry.io/product/crons/
// https://vercel.com/docs/cron-jobs
automaticVercelMonitors: true,
});