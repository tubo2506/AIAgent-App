import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api/gemini-proxy': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini-proxy/, ''),
        secure: true,
        timeout: 120000,
        proxyTimeout: 120000,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.error('[Vite Proxy Error]:', err.message);
            const httpRes = res as any;
            if (httpRes && !httpRes.headersSent && typeof httpRes.writeHead === 'function') {
              httpRes.writeHead(504, { 'Content-Type': 'application/json' });
              httpRes.end(
                JSON.stringify({
                  error: {
                    code: 504,
                    message: `Proxy Error (${err.message}). Hãy thử chuyển sang chế độ "Gọi trực tiếp" (tắt Local Proxy) để tăng tốc và tránh nghẽn Node proxy.`,
                  },
                })
              );
            }
          });
        },
      },
    },
  },
})
