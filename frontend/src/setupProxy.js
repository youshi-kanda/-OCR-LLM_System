const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // API リクエストのみをバックエンドにプロキシ（静的ファイルは除外）
  app.use(
    '/upload',
    createProxyMiddleware({
      target: 'http://backend:8000',
      changeOrigin: true,
      logLevel: 'silent' // ログを静かに
    })
  );

  app.use(
    '/results',
    createProxyMiddleware({
      target: 'http://backend:8000',
      changeOrigin: true,
      logLevel: 'silent'
    })
  );

  app.use(
    '/history',
    createProxyMiddleware({
      target: 'http://backend:8000',
      changeOrigin: true,
      logLevel: 'silent'
    })
  );

  // 学習APIエンドポイントをプロキシ
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://backend:8000',
      changeOrigin: true,
      logLevel: 'debug' // デバッグログを有効に
    })
  );

  // WebSocketをバックエンドにプロキシ
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://backend:8000',
      changeOrigin: true,
      ws: true, // WebSocket support
      logLevel: 'silent'
    })
  );
};