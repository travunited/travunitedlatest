/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // This completely skips ESLint in `next build`
    ignoreDuringBuilds: true,
  },
  images: {
    // Allow images from any domain - simplified configuration
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // Disable strict mode for external images
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Allow unoptimized images for domains that don't support optimization
    unoptimized: false,
    // Minimum cache time for optimized images
    minimumCacheTTL: 60,
    // Formats to allow
    formats: ['image/avif', 'image/webp'],
    // Disable image optimization errors from breaking the page
    loader: 'default',
    // Add retry configuration
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Add error handling configuration
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Webpack configuration for better chunk handling
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Improve chunk loading reliability
      if (config.optimization) {
        config.optimization.splitChunks = {
          ...config.optimization.splitChunks,
          chunks: 'all',
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        };
      }
    }
    return config;
  },
}

module.exports = nextConfig

