import withPWAInit from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  async rewrites() {
    const backendOrigin = (() => {
      const fromEnv = process.env.BACKEND_ORIGIN;
      const fromPublic = process.env.NEXT_PUBLIC_API_BASE_URL;
      const isDocker = process.env.IS_DOCKER === 'true';
      const backendPort = process.env.BACKEND_PORT || '4000';
      const useHttps = process.env.USE_HTTPS === 'true';
      const protocol = useHttps ? 'https' : 'http';

      if (fromEnv) return fromEnv;
      if (isDocker) return `${protocol}://backend:${backendPort}`;
      if (fromPublic) return fromPublic.replace(/\/?api\/?$/, '');

      return `${protocol}://localhost:${backendPort}`;
    })();

    console.log('[Next.js] Rewriting API requests to:', backendOrigin);

    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  cacheStartUrl: true,
  dynamicStartUrl: true,
  reloadOnOnline: true,
  // Exclude health checks and SSE streams from service worker interception entirely.
  // These are the requests that cause "no-response" errors under load.
  publicExcludes: ['!sw.js', '!workbox-*.js'],
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    // Health check & SSE stream: NEVER cache, NEVER intercept
    {
      urlPattern: /\/api\/public\/(health|stream)/i,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'api-realtime-bypass',
      },
    },
    // All other API routes: network only (no caching)
    {
      urlPattern: /\/api\/.*/i,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'api-bypass',
      },
    },
    // Everything else: network first with offline fallback
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offline-cache',
        networkTimeoutSeconds: 15,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
  ],
});

export default withPWA(nextConfig);
