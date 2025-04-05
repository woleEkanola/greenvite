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
  // Configure allowed image domains and patterns
  images: {
    domains: [
      'pfirenjlvylwekls.public.blob.vercel-storage.com',
      'public.blob.vercel-storage.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '*.vercel-storage.com',
      },
    ],
  },
  // Webpack configuration to handle Konva library
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark Konva as external on the server-side to prevent SSR issues
      config.externals = [...config.externals, 'konva', 'react-konva'];
    }
    return config;
  },
}

module.exports = nextConfig
