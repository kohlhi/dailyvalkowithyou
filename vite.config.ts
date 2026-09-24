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
        // 音樂檔不要進安裝包，不然第一次安裝要下載好幾十 MB。
        // 預設的 globPatterns 本來就不含音訊格式，這裡寫明是為了以後不被改壞。
        globIgnores: ['**/lofi/**'],
        runtimeCaching: [
          {
            // 使用者自己放的音樂：放過一次就存起來，之後離線也聽得到
            urlPattern: /\/lofi\/.*\.(?:mp3|m4a|aac|ogg|wav)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'valko-lofi',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 180 },
              // <audio> 會用 Range 請求拿片段，沒開這個從快取放會失敗
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
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
