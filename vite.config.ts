import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { APP } from './src/appConfig.js'

export default defineConfig({
  plugins: [
    react(),
    {
      // 標題與加入主畫面的名稱都從 appConfig 取，只改一個地方
      name: 'app-name-html',
      transformIndexHtml(html: string) {
        return html
          .replace(/<title>[^<]*<\/title>/, `<title>${APP.name}</title>`)
          .replace(
            /(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/,
            `$1${APP.shortName}$2`,
          )
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // heroes/ 是內建圖包，一起預先快取才能離線使用
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'heroes/**/*', 'scenes/**/*'],
      manifest: {
        name: APP.name,
        short_name: APP.shortName,
        description: APP.description,
        lang: 'zh-Hant',
        theme_color: '#f6f3ee',
        background_color: '#f6f3ee',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
