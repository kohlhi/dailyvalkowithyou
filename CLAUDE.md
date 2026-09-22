# DailyValkowithyou — 給 Claude Code 的專案說明

黑白手繪風格的 RPG 任務 PWA。使用者設定每日 / 每週目標與成就，完成拿 exp 升級。
介面文字與程式註解一律用**繁體中文**。

這個專案是從 Daily Quest（https://github.com/kohlhi/daily-quest）分出來的獨立版本，
兩邊程式碼會各自演進，**不要互相同步，也不要假設對方還有同樣的功能**。
名稱設定集中在 `src/appConfig.ts`。

## 指令

```bash
npm install
npm run dev      # 開發伺服器 (Vite, port 5173)
npm run build    # 型別檢查 + 建置（prebuild 會先重新產生 src/heroPack.ts）
npm run icons    # 由 public/icon.svg 重新產生 PWA 圖示（只在改圖示時需要）
```

型別檢查單獨跑：`npx tsc -p tsconfig.app.json --noEmit`

## 部署

GitHub 已跟 Vercel 連動：**push 到 main 就會自動部署**到 https://dailyvalkowithyou.vercel.app。
不需要跑 Vercel CLI。改完記得提交並推送，否則線上版不會更新。

PWA 有 Service Worker，部署後手機上要開**兩次**才會換到新版，這是正常行為。

## 架構

沒有後端。任務與設定存 localStorage，使用者上傳的圖片存 IndexedDB。

```
src/
  App.tsx          畫面切換、彈窗佇列
  appConfig.ts     App 名稱設定（vite.config 也會讀）
  store.ts         全部狀態與操作，含版本升級
  achievements.ts  33 個成就的定義與判定
  stage.ts         進化階段的查詢與繼承
  level.ts         等級公式、日/週期間 key、連續天數、固定亂數
  images.ts        IndexedDB 圖片 + 內建圖包
  sound.ts         Web Audio 合成音效
  screens/         各個整頁畫面
  components/      彈窗與共用元件
```

## 這些決定有原因，改之前先讀

**資料版本**：`store.ts` 的 `VERSION` 常數是唯一來源，不要在別處寫死數字。
改資料結構就把 `VERSION` 加一，並在 `normalize()` 補上升級路徑。
載入時若發現儲存的版本較舊會立刻寫回，避免每次開啟都重跑升級。

**統計不從紀錄回推**：`logs` 只保留最新 2000 筆會被截斷。
長期成就一律讀 `state.stats` 裡的獨立累計欄位（`taskCounts`、`dayCounts`、`goalDays` 等）。
連續天數用 `streakFrom(Object.keys(stats.dayCounts))`，不要用 logs。

**彈窗一律走佇列**：教學、問候、事件、獎勵圖、升級、進化、徽章都塞進 `App.tsx` 的 `queue`，
一次只顯示最前面那個。新增任何全螢幕效果都往佇列丟，不要自己開一個 state，否則會互相蓋住。
徽章比較特別，是用 effect 監看 `state.unlocked` 長度自動排隊，所以任何來源解鎖都會跳。

**階段會向前繼承**：某個階段沒放圖或沒寫寄語時，`inherited()` 會往前找最近一個有內容的階段。
所以只設定第一階也能正常運作，不要改成直接回傳空陣列。

**內建圖不進 IndexedDB**：`public/heroes/` 的圖片 id 是 `builtin:/heroes/01.png` 這種字串，
`images.ts` 會直接當路徑用。`deleteImage()` 遇到這種 id 會跳過，匯出備份也不會塞進 JSON。
清單由 `scripts/heroes.mjs` 掃資料夾自動產生，**不要手動編輯 `src/heroPack.ts`**。

**隨機事件不能刷**：抽取用 `seeded(日期 + 身份 + 用途)`，同一天重開 App 永遠同一個結果。

**完成不可取消**：這是刻意的設計，任務、步驟、計數一旦完成就不能回頭。不要加「取消完成」。

**等級曲線**：`450 × (等級−1)^1.4`，刻意先快後慢。以每天約 1000 exp 估算，
第一天升一級、lv.10 約十天、lv.25 約三十九天、lv.45 約九十天。
改這個公式會讓所有現有使用者的等級跳動，要先確認。

## 樣式慣例

- 只有黑 `--ink` 與紙白 `--paper`，不要引入其他顏色（使用者自己上傳的圖除外）
- 邊框用不對稱圓角製造手繪感，例如 `border-radius: 18px 16px 20px 15px / 15px 20px 16px 18px`
- 所有樣式集中在 `src/styles.css`，依功能分區並標註版本註解
- 版面以 430px 寬的手機為準，`.app` 有 `max-width`

## iOS 限制

- **不支援震動**，`navigator.vibrate` 在 Safari 無效，不要再加震動回饋
- 剪影是把圖片壓成純黑，**背景不透明的圖會變黑方塊**，圖包請用去背的 png / gif
- 網頁 App 被切到背景後常常整個重新載入，所以「開啟時問候」有四小時冷卻

## 這個版本的方向

**這一版是要發布給同好的，重點是角色的陪伴感。**
原本的 Daily Quest 是作者自用與給朋友的極簡版，不需要太多陪伴功能，兩邊定位相反：

| | Daily Quest | DailyValkowithyou（本專案） |
|---|---|---|
| 對象 | 自己與朋友 | 對外發布 |
| 自訂功能 | 保留，使用者自己配 | 關掉，由作者配好 |
| 角色台詞 | 少即可 | 核心價值，要多要有個性 |

所以要做兩件方向相反的事：

**一、把自訂功能關掉。** 除了新增任務與系統設定以外，不開放上傳圖片、
不開放編輯身份與階段、不開放編輯事件池。內建圖包（`public/heroes/`）
會從「選項之一」變成唯一來源，預設的身份、各階段稱號與對應的圖
都要先在 `store.ts` 的 `defaultIdentity()` 裡配好。

**二、把角色台詞從設定變成內容。** 這是目前最大的缺口。
現在角色總共只會說約 17 句話：問候 5 句（`Greeting.tsx`）、
清單底部 7 句（`TaskList.tsx` 的 `footLine`）、確認問句 5 種（`ConfirmSheet.tsx`）。
使用者一天開兩次、用一個月就會看到同一句 60 次，撐不起陪伴感。
寄語目前也是使用者自己寫的（每階段的 `notes`），在這一版應該改成作者寫好的角色台詞。

做這一版時，判斷標準是：**這句話是設定，還是角色在說話？**
是角色在說話的，就要有量、有變化、有個性，並且照情境分類
（第一次見面、久沒來、連續達成、快睡了還沒完成、剛升級、剛進化…）。

## 還沒做的

任務提醒推播。需要後端：VAPID 金鑰、存推播訂閱的資料庫、定時觸發的排程器。
iOS 16.4 以上的 PWA 支援推播，但必須先加入主畫面且由使用者手動授權。
