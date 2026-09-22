# DailyValkowithyou

黑白手繪風格的 RPG 任務 App：把每日目標、週目標、成就變成任務，完成就拿 exp 升級。
做成 PWA（漸進式網頁 App），iPhone 上用 Safari「加入主畫面」即可全螢幕、離線使用。

## 功能

- **第一次開啟**：五張圖卡教學介紹玩法，之後可在使用者偏好重看
- **開啟時打招呼**：隔一段時間再開啟，小人會出來問候並報今天的進度（有冷卻時間，不會一直跳）
- **首頁**：身份的小人圖庫隨機顯示一張（jpeg / png / gif，點小人可再抽）、寄語氣泡隨機顯示一句、身份名稱、等級與 exp 進度條、連續天數 streak、技能等級
- **每日任務 / 週任務 / 成就**：底部三個圓形按鈕切換；每日 00:00、每週一 00:00 自動重置，成就永久保留
- **點一下完成**：小人會先跳出來問「確定完成了嗎？」，確認後才反白打勾、星星爆開、加 exp。**完成後不能取消**
- **每日隨機事件**：每天開啟 App 有機會遇到一件事，接下後變成當天限定任務，沒完成隔天消失；稀有事件 exp 加倍
- **每日達成獎勵**：當天每日任務全部完成時，全螢幕播放自己放的慶祝 gif
- **計數任務**（如「運動 3 次」）每點一次 +1；**步驟任務**在卡片內逐步打勾，全部完成才算完成
- **清單底部的小人**：依當前進度說不同的話，例如還剩幾個、今天全清了
- **自訂任務**：任務名、分類、EXP（簡單 / 普通 / 困難 / 史詩或自訂）、對應身份、對應技能、自訂步驟、需完成次數
- **身份**：每個身份（繪師、健身…）有自己的技能、任務組與等級；首頁「身份轉換」切換
- **進化階段**：每個身份可設定 1～6 個階段（預設四階，門檻 lv.1 / 10 / 25 / 45）。每階有自己的稱號、小人圖庫、獎勵圖庫與寄語，等級到了就自動切換並播放進化動畫
- **階段剪影**：點首頁的稱號與等級，彈出「進化之路」視窗，左右滑動看所有階段。未解鎖的只顯示黑色剪影、「lv.X 解鎖」與還差多少 exp
- **升級**：全螢幕 LEVEL UP 動畫與音效；技能對應的任務完成時技能一起加 exp
- **成就徽章**：33 個自動頒發的徽章，涵蓋累計完成、連續天數、清空每日目標、單一習慣重複、等級、進化、技能、隨機事件、身份與作息。達成時跳出徽章動畫，沒達成的在徽章櫃顯示進度條
- **任務總覽**（左上格子圖示）：今日 / 本週完成、連續天數、總 exp、徽章櫃入口、編輯 / 刪除任務、最近完成紀錄
- **使用者偏好**（右上笑臉）：使用者名、六個獨立開關（完成前確認 / 開啟時打招呼 / 音效 / 特效動畫 / 隨機事件 / 獎勵圖）、事件池編輯、重看教學、身份與階段管理、匯出 / 匯入備份（含圖片）、全部重置

沒有震動回饋，因為 iOS Safari 不支援 Web 震動 API。

資料全部存在裝置本機（任務與設定在 localStorage，小人圖片在 IndexedDB），沒有後端。音效由 Web Audio 即時合成，不需要音檔。

## 開發

```bash
npm install
npm run dev
```

## 建置與部署

```bash
npm run build      # 產出 dist/
npm run preview    # 本機預覽正式版
npm run icons      # 由 public/icon.svg 重新產生 PNG 圖示
```

要在 iPhone 上安裝，網站必須用 **https** 提供（Service Worker 的要求）。最簡單的方式是部署到 Vercel：

```bash
npm i -g vercel
vercel
```

也可以放到 GitHub Pages、Netlify、Cloudflare Pages 等任何靜態主機。

## 內建圖包

`public/heroes/` 裡的圖片會自動變成 App 裡的「內建圖」選項，
使用者在 身份編輯 → 小人圖庫 / 獎勵圖庫 點「內建圖」就能直接選用，不必自己上傳。

要增加或移除選項，把圖片檔放進或移出 `public/heroes/` 就好，
清單由 `scripts/heroes.mjs` 在每次建置前自動掃描產生（`npm run prebuild`），不用改任何程式。

兩個注意事項：

- **背景要透明**。未解鎖階段的剪影是把整張圖壓成純黑，白底的圖會變成一塊黑方塊。
  請用去背的 png 或 gif。
- 內建圖會被預先快取以便離線使用，所以檔案盡量小，單張控制在數十 KB 以內比較好。

內建圖在資料裡只記一行路徑（`builtin:/heroes/01.png`），不佔 IndexedDB，
匯出備份時也不會把圖片內容塞進 JSON。

## 在 GitHub 上直接改文案

這個儲存庫已經跟 Vercel 連動，在 GitHub 網頁上編輯檔案並 Commit 之後，
Vercel 會自動重新建置部署，一兩分鐘後線上版就會更新。常改的東西在這幾個地方：

| 想改什麼 | 檔案 |
|---|---|
| 新使用者的預設任務 | `src/store.ts` 的 `starterTasks` |
| 隨機事件池的預設內容 | `src/store.ts` 的 `starterEvents` |
| 四個階段的預設稱號 | `src/store.ts` 的 `defaultIdentity` |
| 五張教學卡的標題與內文 | `src/components/Tutorial.tsx` |
| 徽章名稱、說明與門檻 | `src/achievements.ts` |
| 小人確認時說的話 | `src/components/ConfirmSheet.tsx` |
| 開啟時的問候語 | `src/components/Greeting.tsx` |
| 任務清單底部小人的台詞 | `src/screens/TaskList.tsx` 的 `footLine` |
| 等級曲線 | `src/level.ts` 的 `levelStart` |
| 內建圖包 | 直接增減 `public/heroes/` 裡的圖片檔 |

改完之後在 Vercel 的 Deployments 頁可以看到建置進度。手機上要關掉 App 再開兩次才會換成新版。

## 安裝到 iPhone

1. 用 Safari 開啟部署後的網址
2. 點下方「分享」→「加入主畫面」
3. 從主畫面開啟，就是全螢幕的 App，離線也能用

換手機前，先在「使用者偏好 → 資料」匯出備份，再到新手機匯入。

## 專案結構

```
src/
  App.tsx            畫面切換、標題列、底部按鈕、身份轉換視窗、提示訊息
  store.ts           狀態與 localStorage 儲存、所有操作（完成任務、步驟、發 exp、重置、備份）
  images.ts          小人圖庫（IndexedDB）
  sound.ts           Web Audio 合成音效
  level.ts           等級公式、日 / 週期間 key、連續天數、固定亂數種子
  stage.ts           進化階段的查詢與繼承規則
  achievements.ts    33 個成就的定義、進度計算與解鎖判定
  types.ts           資料型別
  Icons.tsx          線條圖示與預設小人
  screens/
    Home.tsx         首頁
    TaskList.tsx     任務清單
    TaskForm.tsx     自訂 / 編輯任務
    Overview.tsx     任務總覽
    Settings.tsx     使用者偏好
    IdentityEditor.tsx 身份編輯（小人圖庫、獎勵圖庫、寄語、技能）
    EventPool.tsx    隨機事件池編輯
    Badges.tsx       徽章櫃
  components/
    Hero.tsx         隨機小人
    ConfirmSheet.tsx 小人詢問「確定完成了嗎？」
    EventSheet.tsx   今日隨機事件
    RewardOverlay.tsx 每日達成的全螢幕獎勵圖
    Greeting.tsx     開啟時的問候
    Tutorial.tsx     五張圖卡教學
    StageHero.tsx    單一階段的小人（未解鎖時是剪影）
    StageSheet.tsx   進化之路：可左右滑動的階段浮動視窗
    EvolveOverlay.tsx 進化動畫
    Badge.tsx        徽章圖樣（三個等第）
    BadgeOverlay.tsx 解鎖徽章的動畫
  styles.css         全部樣式
```

等級公式：第 N 級起始 exp = 450 × (N−1)^1.4，可在 `src/level.ts` 調整。曲線刻意先快後慢，
以每天約 1000 exp 估算：第一天就會升一級，lv.10 約十天、lv.25 約三十九天、lv.45 約九十天，
之後單次升等也維持在三天左右，不會卡住。

隨機事件用日期加身份當亂數種子，所以同一天關掉 App 再開不會重抽，不能靠重開刷事件。

教學、問候、今日事件、獎勵圖、升級動畫共用 `App.tsx` 裡的彈窗佇列，一次只顯示一個，關掉才換下一個。

階段沒放圖或沒寫寄語時，會自動沿用前一個有內容的階段，所以只設定第一階也能正常運作。
未解鎖階段的剪影是把圖片整張壓成純黑，背景透明的 png / gif 效果最好，不透明的圖會變成黑色方塊。

成就的統計（每個任務完成幾次、每天完成幾個、清空每日目標的日子）是獨立累計的欄位，
不從完成紀錄回推，所以紀錄超過兩千筆被截斷後，長期成就依然準確。
舊版資料升級時會用現有紀錄盡量回推，已經達成的徽章直接補上且不跳動畫。

測試自動部署用的空行

