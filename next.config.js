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
}

module.exports = nextConfig
