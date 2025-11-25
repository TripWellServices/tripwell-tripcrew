/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'openweathermap.org',
      },
    ],
  },
  eslint: {
    // ESLint is now properly configured
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Allow build to continue with type errors (for now)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

