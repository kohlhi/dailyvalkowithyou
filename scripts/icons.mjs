// 由 public/icon.svg 產生 PWA / iOS 需要的 PNG 圖示：npm run icons
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const svg = readFileSync(fileURLToPath(new URL('../public/icon.svg', import.meta.url)))
const out = [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['apple-touch-icon.png', 180],
]
for (const [name, size] of out) {
  await sharp(svg).resize(size, size).png().toFile(fileURLToPath(new URL(`../public/${name}`, import.meta.url)))
  console.log('wrote', name)
}
