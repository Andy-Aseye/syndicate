/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
  // Run on Cloud Run — needs standalone output.
  output: 'standalone',
};

export default nextConfig;
