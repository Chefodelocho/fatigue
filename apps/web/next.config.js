/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fatigue/types', '@fatigue/core', '@fatigue/data', '@fatigue/ui'],

  // Enable standalone output for Docker deployments
  output: 'standalone',
};

module.exports = nextConfig;
