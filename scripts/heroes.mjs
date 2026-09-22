// 掃描 public/heroes/ 產生內建圖包清單 src/heroPack.ts
// 建置前會自動執行（package.json 的 prebuild），所以只要把圖片丟進那個資料夾，
// 不用改任何程式，App 裡的「內建圖」就會出現新選項。
import { readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DIR = fileURLToPath(new URL('../public/heroes/', import.meta.url))
const OUT = fileURLToPath(new URL('../src/heroPack.ts', import.meta.url))
const OK = /\.(png|gif|jpe?g|webp|svg)$/i

const files = readdirSync(DIR)
  .filter((f) => OK.test(f))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))

const body = files.map((f) => `  '/heroes/${f}',`).join('\n')

writeFileSync(
  OUT,
  `// 這個檔案由 scripts/heroes.mjs 自動產生，不要手動編輯。
// 要增減內建圖，把檔案放進或移出 public/heroes/ 就好。
export const HERO_PACK: string[] = [
${body}
]
`,
  'utf8',
)

console.log(`heroPack: ${files.length} 張內建圖`)
