/**
 * 這個版本的名稱設定。
 * vite.config.ts 也會讀它來換掉 HTML 標題與 PWA manifest，
 * 所以這裡不能用 import.meta.env。
 */
export const APP = {
  name: 'DailyValkowithyou',
  /** 主畫面圖示下方的短名稱 */
  shortName: 'Valko',
  description: '把每天的目標變成冒險，和你的夥伴一起升級。',
  /** 標題列下方的小字 */
  tagline: 'DAILY VALKO W/Y',
  /** 新使用者的預設使用者名，顯示在標題列 */
  defaultUserName: 'DAILY VALKO',
}
