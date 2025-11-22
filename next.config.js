/** @type {import('next').NextConfig} */
const nextConfig = {
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
  },
}

module.exports = nextConfig

