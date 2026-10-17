import type { NextConfig } from 'next';

// The browser talks to /api/* on its own origin; Next.js forwards it to the Express API.
// Same-origin means the auth cookies are first-party and no CORS setup is needed.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5001';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
