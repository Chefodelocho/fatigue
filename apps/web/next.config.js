/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fatigue/types', '@fatigue/core', '@fatigue/data', '@fatigue/ui'],
};

module.exports = nextConfig;
