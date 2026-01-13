/** @type {import('next').NextConfig} */

// Check if building for Capacitor (iOS/Android)
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@halcyon-rcm/core'],

  // Use static export for Capacitor, standalone for server deployment
  output: isCapacitorBuild ? 'export' : 'standalone',

  // Disable image optimization for static export (Capacitor)
  ...(isCapacitorBuild && {
    images: {
      unoptimized: true,
    },
    trailingSlash: true,
    env: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://japghm2r7s.us-east-1.awsapprunner.com',
      NEXT_PUBLIC_IS_CAPACITOR: 'true',
    },
  }),
};

module.exports = nextConfig;
