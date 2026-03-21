/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['kiclear.ai', 'preview.kiclear.ai'] },
  },
  // Exclude puppeteer from client bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias.puppeteer = false;
    }
    return config;
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options',       value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
      ],
    },
    // Stripe webhook – needs raw body
    {
      source: '/api/webhooks/(.*)',
      headers: [{ key: 'x-middleware-skip', value: '1' }],
    },
  ],
};

module.exports = nextConfig;
