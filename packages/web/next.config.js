/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@halcyon-rcm/core'],
  output: 'standalone',
};

module.exports = nextConfig;
