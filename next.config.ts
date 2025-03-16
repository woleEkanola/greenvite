import { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/:path*',
        has: [{ type: 'host', value: 'jessegeorge.greenvites.online' }],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/event',
        destination: 'https://jessegeorge.greenvites.online',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
