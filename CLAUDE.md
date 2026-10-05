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
  內容.ts          預設任務／事件、小狼系列、33 個徽章、角色台詞，純資料，給使用者自己改
  series.ts        把 內容.ts 的小狼系列同步進存檔（補新系列、套稱號與圖、隱藏未開放）
  台詞.ts          角色台詞的情境判斷、階段繼承、防重複（台詞本身在 內容.ts）
  store.ts         全部狀態與操作，含版本升級
  achievements.ts  讀內容.ts 組出成就，這裡只放判定算法
  stage.ts         進化階段的查詢與繼承
  level.ts         等級公式、日/週期間 key、連續天數、固定亂數
  images.ts        IndexedDB 圖片 + 內建圖包
  sound.ts         Web Audio 合成音效
  focus.ts         番茄鐘狀態，獨立 localStorage key
  notes.ts         記事本（便條紙），獨立 localStorage key
  tilt.ts          背景視差：滑鼠／陀螺儀、iPhone 權限、開關（獨立 localStorage key）
  ambience.ts      Web Audio 即時合成的環境音（雨／海浪／風／爐火）
  screens/         各個整頁畫面
  components/      彈窗與共用元件
```

## 這些決定有原因，改之前先讀

**可改的文案集中在 `src/內容.ts`**：預設任務、預設事件、預設身份、33 個徽章都在那裡，
純資料沒有邏輯，使用者會自己在 GitHub 上編輯。新增這類內容一律往那個檔案加，不要寫死在畫面或 store 裡。
徽章的達成條件從 `內容.ts` 的 `條件` 型別挑名字，算法寫在 `achievements.ts` 的 `量表`；
要新條件就兩邊各加一筆。**徽章 id 是使用者解鎖紀錄的對應鍵，永遠不要改既有的 id。**

**小狼系列（v8）**：一個系列＝一隻各自升級的小狼＝`內容.ts`「三、小狼系列」的一筆＋一張台詞表。
身份的 `role` 對應系列的 `角色`，**`角色` 取了永遠不要改**。每次載入 `syncSeries()` 會：
舊存檔沒有 role 的用第一階段稱號認回來、把稱號／圖／場景／技能名重新套上（所以作者改了馬上生效，
不用升版本）、開放中但存檔沒有的系列補一隻 lv.1。系列的階段 id 固定是 `角色:第幾階`，
evolvedIds 靠第幾階對應，舊的亂數 id 也能接上。`開放: false` 的系列只有練過等級（exp > 0）的人看得到。
系列身份不能刪（刪了下次載入會補回一隻 lv.1）。畫面上列身份一律用 `visibleIdentities()`。
載入後只要內容和存檔不同就寫回，否則新補的小狼每次開啟都會拿到不同 id。

**角色台詞分兩層**：台詞寫在 `內容.ts` 的「五、角色台詞」，每隻狼一張表，
用身份的 `role` 對應到同名的台詞表。
找台詞的順序是「這一階 → 往前的階段 → 整隻狼 → 共用」，階段台詞加權兩倍混著抽。
開場情境由上往下第一個符合的為準；條件清單在 `內容.ts` 的 `台詞條件`，算法在 `台詞.ts` 的 `matches()`，
要新條件就兩邊各加一筆。最近說過的台詞存在 `valko-lines-v1`，跟番茄鐘一樣不進 store。
畫面上抽台詞一律用 `useState(() => ...)` 只抽一次，否則重新渲染會換句、也會把沒說出口的記成說過。

**資料版本**：`store.ts` 的 `VERSION` 常數是唯一來源，不要在別處寫死數字。
改資料結構就把 `VERSION` 加一，並在 `normalize()` 補上升級路徑。
載入時若發現儲存的版本較舊會立刻寫回，避免每次開啟都重跑升級。
`normalize()` 只擋沒有版本的資料，**比程式碼新的版本要照讀**，不要改回 `v <= VERSION`：
Service Worker 會讓使用者先開到新版再被餵回舊版，擋掉就等於把他的資料洗掉。
同理，有資料卻解不開時要先備份到 `KEY_BROKEN` 再開新的。

**番茄鐘刻意不進 store**：它不給 EXP、不算 RPG 資料、也不進備份 JSON，
所以 `focus.ts` 自己存 `valko-focus-v1`，完全不碰 `VERSION` 與升級路徑。
要加新功能前先想想能不能也這樣切開，能切就不要動使用者的任務資料。
記事本（`notes.ts`，`valko-notes-v1`）也是這樣切開的，目前**不在備份 JSON 裡**。
首頁是四頁橫向滑動：記事本／主頁／番茄鐘／陪伴，`HomePages` 掛載時先捲到主頁（index 1）。

**倒數用時間戳，不要用計數器**：`focus.ts` 存的是 `endsAt`，畫面每次都用
`endsAt - Date.now()` 重算。iOS 的 PWA 被切到背景常常整個重新載入，
用累加的一定會算錯。回到前景時 `結算()` 會自動補算，離開超過一分鐘就不自動接休息。

**首頁背景是圖層清單、雨用程式畫**：`內容.ts` 的場景寫成 `{ 圖層: [...] }`，第一層在最底下並決定高度
（舊的 `{ 房間, 窗外, 雨 }` 會被 `series.ts` 的 `toLayers()` 轉成兩層）。每層可設深度、放大、雨、混合模式、強度、閃爍。
房間圖的窗戶玻璃是透明的，所以窗框、檯燈會自然擋住後面的層，不用另外畫遮罩；雨的 canvas 拿它所在那層的圖當
CSS mask。雨在 `components/Scene.tsx`，看不到（滑到別頁、App 在背景）就停，關掉「動畫」或減少動態時畫一格靜止的雨。
混合模式只跟背景混：`.scene` 有 `isolation: isolate`，不要拿掉，否則會跟頁面底色、小狼混在一起。

**視差（tilt.ts）**：`useParallax()` 把傾斜量寫進 `.stage-view` 的 CSS 變數 `--px / --py`，
各層用 `depthShift(深度)` 的 `translate: calc(...)` 自己乘，不經過 React 重新渲染。
iPhone 讀陀螺儀要 `DeviceOrientationEvent.requestPermission()`，必須在點擊裡呼叫，所以陀螺儀預設關、
設定頁打開開關時才要權限；Mac 的 Safari 也有這個函式，用 `maxTouchPoints > 0` 區分。滑鼠視差不用權限，
沒被明確關掉就會動。開關存在 `valko-tilt-v1`，不進 store。頁面隱藏時瀏覽器不跑 requestAnimationFrame，
在預覽面板被隱藏時測不出動態，這是正常的。

**環境音不放音檔**：`ambience.ts` 用 OfflineAudioContext 離線算出無縫循環，
編成 WAV 再交給 `<audio loop>` 播。0 KB、離線可用、沒有授權問題。
要加新音色就在 `建場()` 多寫一個分支，不要改成下載 mp3。

**自訂音樂放 `public/lofi/`**：檔案清單在 `內容.ts` 的 `自訂音樂`，使用者自己維護。
**音樂不進安裝包**（`vite.config.ts` 有 `globIgnores`），否則第一次安裝要下載幾十 MB；
改用 runtimeCaching 放過一次就快取，離線也聽得到。
那條規則的 `rangeRequests: true` 不能拿掉，`<audio>` 會用 Range 請求拿片段。

**環境音一定要走 `<audio>`，不要改回 Web Audio 直接接 destination**：
iOS 把 `<audio>` 當成媒體播放才會在背景繼續。**已在 iPhone 實機驗證：鎖屏後聲音會繼續，
鎖定畫面也有控制項。** 改回純 Web Audio 就會壞掉，而且在桌機測不出來。
另外 `play()` 必須由點擊直接觸發，算音訊是非同步的會斷掉手勢鏈，
所以點下去當下要先用無聲音訊解鎖 `<audio>`，算完再換內容。

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
- **但 `<audio>` 的播放在鎖屏後會繼續**（實機驗證過），只有純 Web Audio 會被暫停

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
會從「選項之一」變成唯一來源，各系列的階段稱號與對應的圖在 `內容.ts` 的「小狼系列」配好（已完成）。
**還沒做：關掉下列入口**（作者已決定要關，只是時候未到）：

| 要關的 | 位置 |
|---|---|
| 編輯每日事件池 | `Settings.tsx` 的 `onEvents` 那顆 ghost 鈕 |
| 編輯身份（鉛筆） | `Settings.tsx` `aria-label="編輯身份"` |
| 新增身份＋輸入框 | `Settings.tsx` `aria-label="新增身份"`、`MAX_IDENTITIES` |
| 上傳角色圖片 | `IdentityEditor.tsx` 的 `type="file"` |

**不要關錯：`Settings.tsx` 裡另一個 `type="file"` 是「匯入備份」，那要留著**，
換手機就靠它。`EventPool.tsx` 與 `IdentityEditor.tsx` 兩個畫面可以不刪，
只是沒有入口，之後要開回來比較容易。

**關之前要先決定一件事**：已經自訂過的使用者怎麼辦。
他們的 localStorage 裡可能有自己建的身份、上傳到 IndexedDB 的圖。
入口關掉之後那些資料還在，但沒有畫面可以管理。
選項是：照常顯示（最安全）、或是在升級時併回官方系列（會蓋掉他們的東西，要很小心）。
**不要預設沒有人自訂過**。

還沒做：新系列上架時的通知畫面。

**二、把角色台詞從設定變成內容。** 已完成：架構、讀書狼四個階段、開場／點小狼／確認／完成後／進化／升級／清單底部／切換身份。
還沒做：健身狼與生活狼的台詞（目前只有原本的寄語，其他用共用）。
以下是當初的缺口說明。
現在角色總共只會說約 17 句話：問候 5 句（`Greeting.tsx`）、
清單底部 7 句（`TaskList.tsx` 的 `footLine`）、確認問句 5 種（`ConfirmSheet.tsx`）。
使用者一天開兩次、用一個月就會看到同一句 60 次，撐不起陪伴感。
寄語目前也是使用者自己寫的（每階段的 `notes`），在這一版應該改成作者寫好的角色台詞。

做這一版時，判斷標準是：**這句話是設定，還是角色在說話？**
是角色在說話的，就要有量、有變化、有個性，並且照情境分類
（第一次見面、久沒來、連續達成、快睡了還沒完成、剛升級、剛進化…）。

## 通知：分清楚「推播」跟「自己彈橫幅」

這兩件事常常被混為一談，但需求差很多：

- **自己彈橫幅**（番茄鐘在用的）：網頁還活著的時候自己叫出通知。
  **不需要後端、不需要金鑰**，只要使用者授權過一次。
  番茄鐘專注期間有那段聽不見的音軌把頁面保住，所以叫得動。
  程式在 `notify.ts`。**iOS 的 PWA 不支援 `new Notification()`，
  一定要走 `ServiceWorkerRegistration.showNotification()`**，而且要先加到主畫面。
  開發伺服器沒有 Service Worker，這功能只有正式建置版測得到。

- **推播**（任務提醒還沒做的那個）：App 完全關著時由伺服器叫醒手機。
  這個才要後端：VAPID 金鑰、存訂閱的資料庫、定時觸發的排程器。

## 還沒做的

任務提醒推播（見上面的區別）。
