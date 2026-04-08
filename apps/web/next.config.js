const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@trimio/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'trimio-bucket-dev-387092482546-ap-south-1-an.s3.ap-south-1.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = withNextIntl(nextConfig);
