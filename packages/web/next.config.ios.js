/** @type {import('next').NextConfig} */

/**
 * Next.js configuration for iOS/Android Capacitor static export build
 *
 * This configuration is used when building for App Store deployment.
 * It exports the app as static HTML/CSS/JS that Capacitor wraps in a native shell.
 *
 * API calls will be made to the production server (AWS App Runner), not bundled locally.
 *
 * Usage:
 *   Mac/Linux: NEXT_CONFIG_FILE=next.config.ios.js next build
 *   Windows: set NEXT_CONFIG_FILE=next.config.ios.js && next build
 *   Or use the npm script: npm run build:ios (Mac) or npm run build:ios:win (Windows)
 */

const nextConfig = {
  // Enable static export for Capacitor
  output: 'export',

  // Keep transpile packages from main config
  transpilePackages: ['@halcyon-rcm/core'],

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Trailing slashes help with static file serving
  trailingSlash: true,

  // Environment variables to bake into the static build
  // The app will call the production API (AWS App Runner) for all data
  env: {
    // Update this to your production API URL
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://japghm2r7s.us-east-1.awsapprunner.com',
    NEXT_PUBLIC_IS_CAPACITOR: 'true',
  },

  // Optimize imports for smaller bundle size on mobile
  experimental: {
    optimizePackageImports: [
      'date-fns',
      'lodash',
      'recharts',
      'zod',
    ],
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Client-side only optimizations
    if (!isServer) {
      // Reduce bundle size for mobile
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
