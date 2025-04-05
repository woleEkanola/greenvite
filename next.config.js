/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/:path*',
        has: [{ type: 'host', value: 'jessegeorge.greenvites.online' }],
      },
    ]
  },
  // Skip specific problematic pages during build
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

module.exports = nextConfig
