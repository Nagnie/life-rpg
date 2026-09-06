# Life RPG — Kế hoạch triển khai

> Kèm theo [spec.md](spec.md) (v2). Spec trả lời **cái gì**, file này trả lời **theo thứ tự nào và vì sao**.

---

## 0. Nguyên tắc

Bốn quyết định định hình toàn bộ thứ tự dưới đây:

**1. Giả thuyết trước, ống nước sau.**
Câu hỏi sống còn của app là *"loop này có gây nghiện không"*, không phải *"auth có chạy không"*. Nên Juice (P4) đứng **trước** Auth (P5). Nếu tới P4 mà loop nhạt, bạn dừng ở tuần 4 thay vì tuần 7.

**2. Domain layer là TS thuần, tách khỏi DB và tRPC.**
`levelFromXp`, `computeStreak`, `evaluateRewards` là nơi 90% bug sẽ nằm. Chúng gần như pure function → test cực rẻ. Viết chúng trong `src/domain/`, không import Drizzle, không import tRPC.

**3. Server-authoritative, một transaction.**
§27–28 của spec. Hệ quả: **không** dùng Supabase client + RLS làm backend, vì reward evaluation phải là logic server atomic. Cần API layer thật.

**4. Không có background job trong MVP.**
Streak tính lazily lúc đọc (§11.2). Daily quest reset là suy ra, không phải cron. Không thêm queue/worker nào cho tới sau MVP.

---

## 1. Công nghệ

| Lớp | Chọn | Ghi chú |
|---|---|---|
| Framework | Next.js **16** App Router, TS strict | một repo, một deploy. 16 đã stable lúc scaffold |
| API | tRPC + TanStack Query | typed contract, khớp §29 |
| DB | Postgres (Neon) + Drizzle ORM | transaction + aggregate query gọn hơn Prisma |
| Auth | Better Auth | **Phase 5**, không phải Phase 0 |
| Validation | Zod | dùng chung tRPC input + form |
| Form | react-hook-form + zod | |
| UI | Tailwind v4 + shadcn/ui | |
| Animation | Motion + `canvas-confetti` | không phải phụ kiện — nó *là* sản phẩm |
| Sound | 3–4 SFX ngắn | rẻ nhất, tăng game-feel nhiều nhất |
| Icon | lucide-react + emoji cho reward | chi phí asset = 0 |
| State UI | Zustand | modal, toast queue |
| Test | Vitest (domain) + Playwright (golden path) | |
| Analytics | PostHog free | để **đo** được câu hỏi ở P7 |
| Deploy | Vercel + Neon | free tier đủ |

### Cấu trúc thư mục

```text
src/
  domain/          ← TS thuần, ZERO import DB/tRPC. Test ở đây.
    leveling.ts        levelFromXp, xpForLevel, levelProgress
    streak.ts          computeStreak, applyCompletion
    rewards.ts         evaluateReward, progressOf
    xp.ts              XP_BY_DIFFICULTY
  server/
    db/            schema.ts (Drizzle), migrations
    services/      completeQuest.ts, undoComplete.ts, claimReward.ts  ← transaction ở đây
    trpc/          routers
  app/             Next routes
  components/      UI
  lib/             sfx, analytics, formatting
```

Quy tắc: `services/` mở transaction và gọi `domain/`. `domain/` không bao giờ biết DB tồn tại.

---

## 2. Tổng quan phase

Ước lượng theo **tuần part-time** (~10–15h/tuần). Full-time chia 3.

| Phase | Nội dung | Thời gian | Mốc thoát |
|---|---|---|---|
| ✅ P0 | Domain model & game math | ~4–5 ngày | ~~test xanh toàn bộ game math~~ **xong — 44 unit test** |
| ✅ P1 | Core loop, xấu nhưng chạy | ~1 tuần | ~~complete + undo đúng~~ **xong — 16 integration test** |
| ✅ P2 | Reward engine | ~1 tuần | ~~flow §33 pass~~ **xong — 4 e2e test qua UI thật** |
| ✅ P3 | 5 màn hình thật | ~1.5–2 tuần | ~~dùng được cả ngày~~ **xong — dựng theo design** |
| 🟡 P4 | **Juice** | còn ~2 ngày | XP bay, level up, confetti, toast đã có; còn SFX + số đếm dần |
| P5 | Auth + multi-user | ~4–5 ngày | người khác đăng ký và dùng được |
| P6 | Ship | ~1 tuần | deploy production, tự dùng thật mỗi ngày |
| P7 | **Kiểm chứng** | 30 ngày | xem §9 — kill criteria |

**≈ 6–7 tuần part-time tới lúc ship.** P0–P3 đã xong, P4 gần xong — xem [README.md](README.md).

> **Quyết định ngữ nghĩa phát sinh khi implement:** khi undo, `longestStreak` được
> **tính lại** từ lịch sử completion còn lại chứ không giữ kỷ lục cũ. Nếu giữ, user
> có thể bơm longest bằng cách complete-rồi-undo, và Profile sẽ khoe một kỷ lục chưa
> từng đạt được. Luật "longest chỉ tăng" (§11.3) vẫn đúng trên đường đi tiến.

---

## Phase 0 — Domain model & game math · ~4–5 ngày

Mục tiêu: đóng đinh toàn bộ luật chơi và chứng minh nó đúng, **trước khi** có bất kỳ UI nào.

### Việc cần làm

- [ ] `create-next-app` + TS strict + Tailwind v4 + shadcn/ui init
- [ ] Neon project, Drizzle + drizzle-kit, `.env`
- [ ] **Schema theo spec v2** — chú ý các bảng mới:
  - [ ] `user` có `timezone` (§11.1)
  - [ ] `quest` — **không** có `status`/`completedAt` (§9.2)
  - [ ] `quest_completion` + `UNIQUE(questId, localDate)` (§9.3)
  - [ ] `xp_transaction` (§10.3)
  - [ ] `reward` có `baselineValue`, `repeatable`, `goalId` (§14.2, §16.1)
  - [ ] `reward_claim` (§16.1)
- [ ] `domain/leveling.ts` — `levelFromXp`, `xpForLevel`, `levelProgress`
- [ ] `domain/streak.ts` — `applyCompletion(lastActiveDate, localDate, streak)`, `readStreak(player, today)`
- [ ] `domain/rewards.ts` — `progressOf(reward, current)`, `evaluateReward`
- [ ] Seed script: 1 user, 3 goal, ~15 quest, 3 reward

### Test bắt buộc (Vitest)

Đây là danh sách ca kiểm thử, không phải gợi ý — mỗi dòng là một bug thật đã được nhận diện trong spec v1:

**leveling**
- [ ] `levelFromXp(0) === 1`
- [ ] đơn điệu tăng: `levelFromXp(n) <= levelFromXp(n+1)` với n trong 0..100000
- [ ] `levelFromXp(xpForLevel(k)) === k` với mọi k trong 1..100 (round-trip)

**streak** ← nhiều bug nhất ở đây
- [ ] 2 quest **cùng ngày** → streak **không** tăng lần thứ hai (§11.3)
- [ ] hôm qua active, hôm nay chưa làm gì → streak **giữ nguyên**, KHÔNG reset (§11.2)
- [ ] bỏ lỡ trọn 1 ngày (daysSince ≥ 2) → streak = 0
- [ ] active trở lại sau khi đứt → streak = 1, không phải 0
- [ ] `longestStreak` chỉ tăng, không bao giờ giảm
- [ ] user GMT+7 complete lúc 23:30 local → `localDate` là hôm nay local, không phải hôm qua UTC
- [ ] qua ranh giới DST (dùng một timezone có DST để test)

**rewards**
- [ ] user đã có 50 quest, tạo reward target 10 → progress = **0/10**, KHÔNG unlock (§14.2 — bug lớn nhất của v1)
- [ ] user đã có 3000 XP, tạo reward "1000 XP" → progress = 0/1000
- [ ] `QUEST_COUNT` có `goalId` chỉ đếm quest thuộc goal đó
- [ ] `STREAK` **không** trừ baseline
- [ ] progress bị clamp, không vượt quá target
- [ ] reward `repeatable` sau claim → baseline reset, status về LOCKED

### Mốc thoát
`pnpm test` xanh. Chưa có một dòng UI nào. Nếu bạn thấy sốt ruột vì "chưa thấy gì" — đó chính là phase này đang làm đúng việc của nó.

---

## Phase 1 — Core loop, xấu nhưng chạy · ~1 tuần

Mục tiêu: cú click Complete đầu tiên chạy đúng end-to-end. **Chưa có auth, chưa có style.**

### Việc cần làm

- [ ] tRPC setup + TanStack Query provider
- [ ] `CURRENT_USER_ID` hardcode trong một file duy nhất (để P5 gỡ ra trong 10 phút)
- [ ] Router `goal`: list / create / update / archive
- [ ] Router `quest`: list / create / update / archive
- [ ] `services/completeQuest.ts` — transaction đủ 8 bước §10.1
- [ ] `services/undoComplete.ts` — §10.2, chỉ cho undo trong ngày
- [ ] Router `player.get` — streak tính lazily lúc đọc (§11.2)
- [ ] UI trần trụi: `<ul>` quest + nút Complete + dòng text `Lv.X — N XP — streak M`

### Bẫy cần tránh
- `completeQuest` phải là **một** `db.transaction()`, không phải nhiều await rời rạc
- Ném lỗi rõ ràng khi DAILY quest đã done hôm nay (đụng UNIQUE constraint) — đừng để 500 trần
- Optimistic update ở client thì **rollback được** khi server từ chối

### Mốc thoát
Complete một quest → XP, level, streak đúng. Undo → mọi thứ trở lại chính xác như cũ. Kiểm tra bằng cách đọc thẳng bảng `xp_transaction`: phải thấy `+50` rồi `−50`, hai row, không phải một row bị xoá.

---

## Phase 2 — Reward engine · ~1 tuần

Đây là feature quan trọng nhất của MVP (§12).

### Việc cần làm

- [ ] Router `reward`: create / list / update / delete
- [ ] Create reward **snapshot `baselineValue`** ngay tại thời điểm tạo (§14.2)
- [ ] `domain/rewards.evaluateRewards()` gọi **bên trong** transaction của `completeQuest`
- [ ] Chỉ đánh giá reward `status = LOCKED` (§26 — tránh notification trùng)
- [ ] Undo → revert UNLOCKED chưa claim về LOCKED; **CLAIMED không revert**
- [ ] `services/claimReward.ts` — §17.1, kèm reset baseline nếu `repeatable`
- [ ] `RewardClaim` rows (trophy case)
- [ ] Notification rows + router `notification.list/markRead`
- [ ] `completeQuest` trả **juice payload** đầy đủ (§10.4)

### Test
- [ ] Playwright: **viết đúng flow §33 thành một test** — create goal → quest → reward → complete đủ số → unlock → claim
- [ ] Vitest: complete → unlock → undo → back to LOCKED
- [ ] Vitest: complete → unlock → claim → undo → **vẫn CLAIMED**
- [ ] Vitest: complete 5 lần sau khi đã unlock → chỉ có **1** notification

### Mốc thoát
Test §33 pass. Toàn bộ logic sản phẩm đã xong — mọi thứ sau đây chỉ là làm cho nó đẹp và dùng được.

---

## Phase 3 — 5 màn hình thật · ~1.5–2 tuần

Chỉ 5 màn (§32). Không thêm màn nào.

### Design system trước (~2 ngày)
- [ ] Token: color, spacing, radius, elevation, dark mode
- [ ] `<XpBar>` — có prop `animated`
- [ ] `<QuestCard>` — difficulty badge, XP, goal, nút Complete
- [ ] `<RewardCard>` — icon emoji, progress bar, trạng thái
- [ ] `<LevelBadge>`, `<StreakFlame>`
- [ ] `<EmptyState>` cho từng màn

### Màn hình
- [ ] **Dashboard** (§20) — quan trọng nhất: level+XP bar, streak, Today's Quests, Active Rewards, Goals
- [ ] **Quests** (§22) — tab Today / Upcoming / Completed, filter goal + difficulty + status
- [ ] **Goals** (§21) — progress = `completedQuestCount / totalQuestCount`
- [ ] **Rewards** (§23) — Active / Unlocked / Claimed(trophy case) + form tạo reward
- [ ] **Profile** — level, tổng XP, streak hiện tại + dài nhất, tổng quest, heatmap ngày active (rẻ, dùng `quest_completion.localDate`)

### Logic hiển thị dễ sai
- [ ] DAILY quest: hôm nay done → hiện checked nhưng **vẫn nằm trong list**, mai tự bỏ check
- [ ] ONE_TIME quest done → chuyển sang tab Completed
- [ ] Tab "Today" = DAILY chưa done + ONE_TIME có `dueDate <= today`

### Mốc thoát
Dùng được cả ngày mà không cần mở DB hay console.

---

## Phase 4 — Juice · ~1 tuần ← ĐỪNG SKIP

Đây không phải polish. Đây **chính là giả thuyết cần kiểm chứng**. Spec §30 nói rõ: "The UI itself should create the RPG feeling."

### Việc cần làm
- [ ] XP bar chạy mượt (spring), số XP **đếm** lên chứ không nhảy
- [ ] `+50 XP` bay lên rồi tan (floating text)
- [ ] Quest card: check animation + strike-through + fade
- [ ] Modal Level Up — chặn màn hình, có trọng lượng, phải bấm để đóng
- [ ] Reward Unlock celebration + `canvas-confetti` — **đây là khoảnh khắc đắt nhất của app**
- [ ] Streak flame nhảy khi tăng; milestone (7/30/100) có xử lý riêng
- [ ] 3–4 SFX: complete / level up / reward unlock. **Kèm nút tắt tiếng.**
- [ ] Hàng đợi toast (Zustand) — nhiều event cùng lúc phải xếp hàng, không đè nhau
- [ ] Thứ tự animation theo juice payload: **XP bar → level up → reward unlock**
- [ ] Tôn trọng `prefers-reduced-motion`

### Mốc thoát — chủ quan và đó là chủ ý
Complete một quest xong, bạn thấy **muốn làm quest tiếp theo**. Nếu chưa thấy vậy, ở lại phase này. Đây là điểm quyết định của cả dự án — nếu không đạt được sau 2 tuần cố gắng, hãy nghiêm túc cân nhắc dừng, vì auth và deploy sẽ không cứu được nó.

---

## Phase 5 — Auth + multi-user · ~4–5 ngày

- [ ] Better Auth (email + Google)
- [ ] Gỡ `CURRENT_USER_ID`, scope `userId` ở **mọi** query — rà lại từng router một
- [ ] tRPC `protectedProcedure` middleware
- [ ] Tạo `Player` row tự động khi đăng ký
- [ ] **Onboarding hỏi timezone** (auto-detect `Intl.DateTimeFormat().resolvedOptions().timeZone`, cho sửa)
- [ ] **Template lúc onboard** — SWE / Reading / Fitness, mỗi cái kèm sẵn goal + 5 quest + 1 reward

Template là để xử lý rủi ro "3 form trống lúc mở app lần đầu": user phải thấy được cảm giác complete quest **trước khi** phải tự nghĩ ra quest.

### Test
- [ ] User A không đọc/ghi được dữ liệu của user B — thử thẳng qua tRPC bằng id của A

---

## Phase 6 — Ship · ~1 tuần

- [ ] **Desktop-first**, chỉ cần responsive tối thiểu — app không vỡ layout khi thu hẹp cửa sổ (một cột, sidebar thu gọn). Không đầu tư thiết kế riêng cho mobile ở MVP.
- [ ] Keyboard shortcut: `C` complete quest đang chọn, `N` tạo quest, `⌘K` command palette — đây là thứ web app trên desktop làm được mà app điện thoại không có, và nó rẻ
- [ ] PWA manifest + icon — ~30 phút, để mở app trong cửa sổ riêng không có thanh URL. Không phải để cài lên điện thoại.
- [ ] Empty state, error state, loading skeleton cho cả 5 màn
- [ ] Dark mode
- [ ] PostHog: `quest_completed`, `reward_created`, `reward_claimed`, `level_up`, `session_start`
- [ ] Deploy Vercel + Neon production, chạy migration
- [ ] Sentry (tuỳ chọn nhưng nên có)

---

## Phase 7 — Kiểm chứng · 30 ngày ← phase quan trọng nhất

Tự dùng mỗi ngày + 10–20 người bạn.

### Đo
| Chỉ số | Ngưỡng chấp nhận |
|---|---|
| D7 retention | ≥ 40% |
| D14 retention | ≥ 25% |
| Quest/ngày trên user active | ≥ 2 |
| % user tạo ≥ 1 custom reward | ≥ 60% |
| % reward unlocked được **claim** | ≥ 70% |

Chỉ số cuối là quan trọng nhất. Unlock cao mà claim thấp nghĩa là reward không đáng để user quan tâm — và toàn bộ luận điểm của app sụp ở đó.

### ⚠️ Kill criteria
**Nếu chính bạn ngừng mở app trước ngày 14 → không đụng vào §35 Phase 2.**

Vẽ thêm 500 asset, thêm skill tree, thêm world map không cứu được một loop không gây nghiện. Đúng như bạn tự viết ở cuối spec.

### Nếu đạt ngưỡng, thứ tự mở rộng
1. Achievement + badge (rẻ nhất, dùng lại nguyên reward engine)
2. Quest template / quest chain
3. Character + stat (§35 Phase 2)
4. AI quest breakdown (§35 Phase 5)
5. World map (§35 Phase 4) — đắt nhất, để cuối

---

## 3. Rủi ro đã biết

| Rủi ro | Loại | Xử ở đâu |
|---|---|---|
| Reward tự cấp thì tự phá được | **Sản phẩm — #1** | §17.2: Claim là nghi thức + trophy case. Đo bằng tỉ lệ claim ở P7 |
| Lần đầu mở app là 3 form trống | Sản phẩm | P5: template onboarding |
| Novelty decay ở tuần 3 | Sản phẩm | P7 đo, không đoán |
| Streak logic sai (timezone/ranh giới) | Kỹ thuật | P0: 7 ca test bắt buộc |
| Reward unlock ngay khi tạo | Kỹ thuật | P0/P2: `baselineValue` |
| Notification trùng lặp | Kỹ thuật | §26: chỉ đánh giá reward LOCKED |
| Desktop-only → không dùng được lúc rời bàn làm việc | Sản phẩm | Chấp nhận ở MVP. Nếu P7 cho thấy user bỏ lỡ streak vì không ở gần máy tính → lúc đó mới đầu tư mobile |
| Vàng thau lẫn lộn giữa domain và DB | Kỹ thuật | Nguyên tắc #2: `domain/` không import Drizzle |

---

## 4. Thứ tự làm đầu tiên

1. `pnpm create next-app` + Drizzle + Neon
2. Viết `src/domain/streak.ts` **và 7 ca test của nó** trước khi viết bất kỳ thứ gì khác

Nếu streak đúng thì phần còn lại của app dễ hơn nhiều. Nếu streak sai, mọi con số user nhìn thấy đều sai và không ai tin app nữa.
