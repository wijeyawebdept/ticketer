const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Forward requests with /api prefix to the backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8081',
      changeOrigin: true,
      logLevel: 'debug', // Enable logging for debugging
      pathRewrite: { '^/api': '/api' }, // Keep the /api prefix
      onProxyReq: (proxyReq, req, res) => {
        // Log outgoing requests for debugging
        console.log(`[Proxy] ${req.method} ${req.url} -> http://localhost:8081${req.url}`);
      }
    })
  );
  
  // Also explicitly handle /auth routes to ensure they're properly proxied with /api prefix
  app.use(
    '/auth',
    createProxyMiddleware({
      target: 'http://localhost:8081',
      changeOrigin: true,
      logLevel: 'debug',
      pathRewrite: { '^/auth': '/api/auth' }, // Rewrite /auth to /api/auth
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Proxy] ${req.method} ${req.url} -> http://localhost:8081/api${req.url}`);
      }
    })
  );

  // Proxy for static uploads
  app.use(
    '/uploads',
    createProxyMiddleware({
      target: 'http://localhost:8081',
      changeOrigin: true,
      logLevel: 'debug',
    })
  );

  // Proxy WebSocket connections so they work through tunnels (ngrok, etc.)
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://localhost:8081',
      changeOrigin: true,
      ws: true,
      logLevel: 'debug',
    })
  );
};
