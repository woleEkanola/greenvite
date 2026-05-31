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
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: '*.vercel-storage.com' },
      { protocol: 'https', hostname: '*.ufs.sh' },
      { protocol: 'https', hostname: '*.utfs.io' },
      { protocol: 'https', hostname: 'uploadthing.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
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
