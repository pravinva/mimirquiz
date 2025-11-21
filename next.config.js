/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    domains: ['public.blob.vercel-storage.com'],
  },
};

module.exports = nextConfig;
