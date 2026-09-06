# Life RPG — MVP Product & Technical Specification

> **v2 — design flaws fixed.** Everything marked ⚠️ is a change from v1.
>
> | # | What was fixed | Where |
> |---|---|---|
> | 1 | Split `Quest` (definition) from `QuestCompletion` (event) — v1 could not represent DAILY quests, history, or undo | §9 |
> | 2 | Added **Undo Complete** — completely missing in v1; one mis-click and the data is wrong | §10.2 |
> | 3 | XP became a **ledger** (`XpTransaction`) instead of a `+=` counter — so undo is reversible | §10.3 |
> | 4 | Added `baselineValue` to rewards — in v1 **every newly created reward unlocked immediately** | §14.2 |
> | 5 | Added `User.timezone` + streaks computed **lazily on read** — v1 had no cron to reset the streak | §11.1, §11.2 |
> | 6 | Streak is **idempotent per day** — v1 allowed +2 streak for two quests on the same day | §11.3 |
> | 7 | Reward conditions settled on `goalId`, dropping `category` — v1 contradicted itself across §14/§15/§25 | §14.1 |
> | 8 | Added `repeatable` — in v1 claiming a reward lost it forever and the app would run dry | §16.1 |
> | 9 | `level` is **derived** from `totalXp`, not stored as a source of truth | §7.1 |
> | 10 | `completeQuest` returns the "juice payload" straight to the client instead of making it poll | §10.4 |

## 1. Product Overview

### 1.1. Concept

**Life RPG** is a productivity app that gamifies your life.

Users turn personal goals into **Quests**, complete them to earn **XP / Points**, keep a **Streak**, and unlock **Rewards** they define themselves.

Core loop:

```text
Goal
  ↓
Quest
  ↓
Complete Quest
  ↓
Earn XP / Points
  ↓
Progress / Streak
  ↓
Reach Reward Condition
  ↓
Reward Unlocked
  ↓
Claim Reward
```

Example:

```text
Goal: Improve DSA

Quest:
- Solve LeetCode #283
- Solve LeetCode #11
- Solve LeetCode #3
...

Reward:
10 DSA quests
→ Unlock: "1 cup of Matcha 🍵"
```

Or:

```text
10 Reading sessions
→ Unlock: "1 Sushi meal 🍣"
```

If the user does not create their own reward:

```text
1000 XP
→ 1 month Premium
```

---

# 2. MVP Goals

The MVP focuses on proving three things:

### Product

The user should feel:

> "I want to finish this task because it moves me closer to a reward."

### UX

The app should feel like a **lightweight RPG** rather than a to-do list.

### Engineering

The MVP must have a foundation good enough to later extend into:

- Quest dependency
- Character progression
- Achievement
- Economy
- Event-driven architecture
- Analytics
- AI quest generation
- Canvas / world map

---

# 3. MVP Scope

## Included

### Player

- Profile
- Level
- XP
- Total completed quests
- Current streak
- Longest streak

### Goals

- Create goal
- Edit goal
- Delete goal
- Track progress

### Quests

- Create quest
- Edit quest
- Delete quest
- Complete quest
- Assign quest to goal
- Quest difficulty
- Quest XP reward
- Daily quest
- One-time quest

### Rewards

- Create custom reward
- Define unlock condition
- Reward progress
- Reward unlocked notification
- Claim reward
- Reward history

### Progression

- XP
- Level
- XP progress bar
- Streak

### Dashboard

- Today's quests
- XP progress
- Current streak
- Active rewards
- Recently unlocked rewards

---

# 4. Explicitly Out of Scope for MVP

None of this is built in the MVP:

- Character customization
- Inventory
- Gold economy
- Items
- Skill tree
- Combat
- Monsters
- World map
- Multiplayer
- Realtime collaboration
- AI-generated quests
- AI-generated rewards
- Social features
- Mobile app
- Complex animations
- Multiple currencies
- Quest dependency graph
- Recurring complex schedules
- Calendar integration
- External reward purchasing / payment
- Automatic verification that a real-world reward was redeemed

The goal is to **ship a playable product first**.

---

# 5. Core User Flow

## 5.1. First-time Setup

The user opens the app for the first time:

```text
Welcome

"What are you working toward?"

[ + Create Goal ]
```

The user creates:

```text
Goal:
"Become a better Software Engineer"

Category:
Career

Target:
Optional
```

Then creates quests:

```text
+ Create Quest

Solve 2 LeetCode problems
Difficulty: Medium
XP: 100
```

---

# 6. Player System

## 6.1. Player

Every user has one progression profile.

```text
Player
├── Level             ⚠️ derived from Total XP (§7.1)
├── Current XP        ⚠️ derived — XP within the current level
├── Total XP          ⚠️ a cache of SUM(XpTransaction) — the ledger is the source of truth (§10.3)
├── Current Streak
├── Longest Streak
└── Completed Quests  ⚠️ derived — COUNT(QuestCompletion)
```

Only three values are genuinely stored as state: `totalXp` (a cache of the ledger), `currentStreak`, `longestStreak`, and `lastActiveDate`. Everything else is a pure function of those.

Example:

```text
Level 12

██████████████░░░░
1,240 / 1,500 XP

🔥 7 Day Streak

Completed
42 Quests
```

---

# 7. XP System

The MVP uses a single currency:

**XP**

No Gold in the MVP.

Quests carry an XP reward based on difficulty.

Suggested defaults:

```text
Easy      20 XP
Medium    50 XP
Hard      100 XP
Epic      250 XP
```

The user can override the XP when creating a quest.

---

## 7.1. Level Calculation

The MVP uses this formula:

```text
XP required for next level = 100 × level^1.5
```

No need to tune the formula for the MVP. It only has to increase monotonically and stay retunable later.

### ⚠️ `level` is a derived value, not a source of truth

Only `totalXp` is stored in the DB. `level` is always recomputed:

```ts
// domain/leveling.ts — pure functions, unit-testable
levelFromXp(totalXp: number): number
xpForLevel(level: number): number
levelProgress(totalXp: number): { level, currentXp, requiredXp }
```

Reason: storing both `level` and `totalXp` as two independent sources of truth means they will drift apart sooner or later — on undo, on a data fix, on a formula change.

`level` may be cached as a denormalized column for fast reads, but **always recompute it from `totalXp` on every write**.

Flow:

```text
XP changes
    ↓
Recompute level from totalXp
    ↓
Emit LEVEL_UP if the level went up
```

---

# 8. Goal System

## 8.1. Goal

A goal is a large objective that many quests can contribute to.

Example:

```text
Goal
"Become a Strong SWE"

Progress
████████░░ 80%

Quests
42 / 50 completed
```

Goal fields:

```text
id
userId
title
description
category
status
createdAt
updatedAt
```

MVP statuses:

```text
ACTIVE
COMPLETED
ARCHIVED
```

---

# 9. Quest System

## 9.1. ⚠️ Split Quest from QuestCompletion

A `Quest` with a single `status` field **cannot** represent:

- A DAILY quest: "done today, but back to TODO tomorrow"
- Completion history — which both the streak and the reward count need
- Undo complete

So it is split into two tables:

```text
Quest             = DEFINITION  (template, rarely changes)
QuestCompletion   = EVENT       (append-only log)
```

That single split solves four problems at once:

| Problem | Solution |
|---|---|
| Reward quest-count | `COUNT(QuestCompletion)` |
| Streak | count of distinct `localDate` in `QuestCompletion` |
| Is a DAILY quest done today | a completion exists with `localDate = today` |
| Undo complete | delete one row |

## 9.2. Quest (the definition)

```text
id
userId
goalId          nullable — a quest may belong to no goal
title
description
type            ONE_TIME | DAILY
difficulty      EASY | MEDIUM | HARD | EPIC
xpReward
isArchived      boolean
dueDate         nullable — only used for ONE_TIME
createdAt
updatedAt
```

⚠️ **`status` and `completedAt` no longer exist on Quest.** The displayed state is derived:

```text
ONE_TIME  → done if ANY QuestCompletion exists
DAILY     → done if a QuestCompletion exists with localDate = today
```

A nullable `goalId` is deliberate: forcing the user to create a Goal before they can create a Quest is unnecessary friction on first use.

## 9.3. QuestCompletion (the event)

```text
id
userId
questId
xpAwarded       snapshot of the XP at completion time
completedAt     timestamptz
localDate       DATE — the date in the user's timezone
```

**`xpAwarded` must be a snapshot**, because the user can edit the quest's `xpReward` later — history must not change with it.

**`localDate` is computed at write time** (from `user.timezone`), so streak queries never have to convert timezones on read.

Constraints:

```text
UNIQUE (questId, localDate)   -- DAILY: at most once per day
INDEX  (userId, localDate)    -- for the streak query
INDEX  (userId, questId)      -- for the reward count query
```

---

# 10. Quest Completion

## 10.1. Complete

When the user clicks `[ Complete Quest ]`, the server runs this inside **a single transaction**:

```text
BEGIN

1. Validate  (quest belongs to the user, not archived, not already done today)
2. INSERT QuestCompletion
3. INSERT XpTransaction (+xpReward)
4. Recompute player.totalXp → derive level
5. Update the streak (idempotent per day — §11.3)
6. Evaluate active rewards
7. Unlock rewards whose condition is met
8. INSERT Notifications

COMMIT
```

## 10.2. ⚠️ Undo Complete — mandatory in the MVP

v1 was missing this entirely. Users **will** mis-click. Without undo: XP inflates, rewards unlock wrongly, and there is no way to fix it.

```text
BEGIN

1. DELETE QuestCompletion
2. INSERT XpTransaction (−xpAwarded)   -- a reversal; do NOT delete the original row
3. Recompute player.totalXp → derive level
4. Recompute the streak
5. Re-evaluate rewards that are UNLOCKED but NOT YET CLAIMED
   → revert to LOCKED if the condition no longer holds
6. Delete the corresponding notification

COMMIT
```

Two rules:

- **A CLAIMED reward never reverts.** Once the matcha is drunk, it's drunk.
- **Undo is only allowed same-day** (`localDate = today`), so historical streaks never have to be recomputed. That limit keeps the MVP simple while still covering 99% of mis-clicks.

## 10.3. ⚠️ XP is a ledger, not a counter

Do not use `player.totalXp += n`.

```text
XpTransaction  (append-only)
- id
- userId
- amount               may be negative (reversal)
- source               QUEST_COMPLETE | QUEST_UNDO | ADJUSTMENT
- questCompletionId    nullable
- createdAt
```

`player.totalXp` = `SUM(amount)`, cached on the Player table for fast reads — **but the ledger is the source of truth**.

This buys three things:

- Undo becomes reversible and auditable
- Bad data can be corrected without losing history
- It is the foundation for the event-driven architecture in §35 Phase 6, almost for free

## 10.4. ⚠️ The response returned to the client (the "juice payload")

`completeQuest` must **return everything that just happened, directly**. Don't make the client poll — the entire feel of the app lives in the latency between the click and the animation.

```ts
type CompleteQuestResult = {
  completionId: string
  xpAwarded: number
  totalXp: number
  level: number
  levelUp?: { from: number; to: number }
  streak: { current: number; longest: number; isNewRecord: boolean }
  unlockedRewards: Reward[]
  notifications: Notification[]
}
```

The client receives the payload and fires animations in order: **XP bar → level up → reward unlock**.

Example display:

```text
Quest completed!

+50 XP

🔥 8 Day Streak

Reward Unlocked!

🍵 Matcha
"10 DSA quests completed"
```

---

# 11. Streak System

A daily completion streak: complete at least one quest in a day → that day is "active".

```text
Mon ✓  Tue ✓  Wed ✓  Thu ✓  Fri ✓

🔥 5 Day Streak
```

## 11.1. ⚠️ Timezone is mandatory

`User` must have a `timezone` field (IANA, e.g. `Asia/Ho_Chi_Minh`), asked for during onboarding.

A streak without a timezone is a wrong streak — "today" for a user in GMT+7 is not the server's UTC "today". It's one field, but without it the whole streak system is meaningless.

Every `QuestCompletion` stores a `localDate` precomputed from this timezone.

## 11.2. ⚠️ No cron — compute lazily on read

v1 said "no completion for a day → reset to 0", but the MVP has no background job to run that reset.

→ The streak is computed **lazily on read**, from `player.lastActiveDate`:

```text
daysSince = today − lastActiveDate

daysSince = 0   → unchanged   (already active today)
daysSince = 1   → unchanged   (active yesterday, nothing today yet — NOT lost)
daysSince ≥ 2   → streak = 0
```

⚠️ Critical boundary: the streak does **not** reset merely because the user hasn't done anything today. It only resets once a full day has been missed. Get this wrong and users who open the app in the morning see a streak of 0 — an app-killing bug.

## 11.3. ⚠️ Idempotent per day

Completing 2 quests on the same day must **not** add +2 to the streak.

```text
onQuestCompleted(localDate):
    if localDate == player.lastActiveDate:
        return                        # already counted today → no-op
    if localDate == player.lastActiveDate + 1 day:
        currentStreak += 1
    else:
        currentStreak = 1             # start a new run
    player.lastActiveDate = localDate
    longestStreak = max(longestStreak, currentStreak)
```

The MVP does not need: streak freeze, recovery, protection, or multiple streak types.

---

# 12. Reward System

This is the most important feature of the MVP.

A reward is something unlocked when the user meets a given condition.

Examples:

```text
10 DSA quests
→ Matcha 🍵
```

```text
10 Reading quests
→ Sushi 🍣
```

```text
1000 XP
→ 1 Month Premium
```

---

# 13. Reward Types

The MVP only needs 2 types:

### Custom Reward

Defined by the user.

Examples:

```text
🍵 Matcha
🍣 Sushi
🎮 Play games for 2 hours
📚 Buy a new manga
🎬 Watch a movie
```

### Premium Reward

A system-defined reward.

Example:

```text
1000 XP
→ 1 Month Premium
```

The premium reward only needs to exist as product logic.

No payment/subscription infrastructure needs to be implemented in the MVP.

---

# 14. Reward Conditions

The MVP supports 3 condition types:

| conditionType | conditionValue | Scope |
|---|---|---|
| `QUEST_COUNT` | number of quests | all quests, or scoped by `goalId` |
| `XP_TOTAL` | amount of XP | all |
| `STREAK` | consecutive days | all |

## 14.1. ⚠️ Use `goalId`, drop `category`

v1 contradicted itself: §14 said "scoped by Goal", the §15 example wrote "Category: DSA", and §25 queried `goal = DSA`.

→ Settled: **`goalId` (FK, nullable)**. `category` is removed from every reward condition. `category` remains only a display label on Goal.

## 14.2. ⚠️ Baseline — without it EVERY newly created reward unlocks immediately

This was v1's most serious flaw.

§25 (v1) counted **all** quests ever completed:

```text
The user has already done 50 DSA quests
    ↓
Creates the reward "10 DSA quests → Matcha"
    ↓
progress = 50 / 10
    ↓
UNLOCKS IMMEDIATELY   ✗
```

Same for XP: "Earn 1000 XP" when the user already has 3000 XP → instant unlock.

→ **Fix:** on reward creation, snapshot the current value into `baselineValue`.

```text
progress = clamp(current − baselineValue, 0, target)
target   = conditionValue
```

Example: the user is at 50 DSA quests → `baselineValue = 50`, target 10 → they must reach quest #60 to unlock. That matches the intended meaning: "do 10 more from now on".

**Exception — `STREAK`:** a streak does not increase monotonically (it resets), so a baseline is meaningless. For streaks, evaluate absolutely with `currentStreak >= conditionValue`, but **only evaluate on events occurring after `reward.createdAt`** to avoid an instant unlock.

---

# 15. Reward Examples

### Example 1 — Quest count scoped by Goal

```text
🍵 Matcha
Complete 10 quests · Goal: Become a Strong SWE

baseline 42 · current 49

███████░░░  7 / 10
```

### Example 2 — Condition already met

```text
🍣 Sushi
Complete 10 quests · Goal: Read More Books

██████████  10 / 10       UNLOCKED
```

### Example 3 — XP (system reward)

```text
⭐ 1 Month Premium
Earn 1000 XP

baseline 0 · current 780

████████░░  780 / 1000
```

### Example 4 — Streak (no baseline)

```text
🎬 Movie Night
Reach 7 Day Streak

█████░░  5 / 7 days
```

---

# 16. Reward Lifecycle

```text
LOCKED
   ↓  condition met (evaluated synchronously inside the transaction)
UNLOCKED
   ↓  user confirms
CLAIMED
```

⚠️ v1's `ELIGIBLE` state is gone — evaluation happens in the same transaction as the quest completion, so there is no window of time in that state. A redundant state is a state that can be wrong.

### LOCKED
Condition not met. Can return to LOCKED if the user undoes a completion (§10.2).

### UNLOCKED
Condition met. Set `unlockedAt`, emit a notification.

### CLAIMED
The user confirmed receiving the reward. **Terminal — never reverts.**

## 16.1. ⚠️ `repeatable` — without it the app runs out of rewards

A one-way lifecycle means that once the matcha is claimed, the matcha is gone forever and the user has to recreate an identical reward by hand every time. Nobody does that more than twice.

→ Add `repeatable: boolean` **from day 1**. Because `baselineValue` already exists (§14.2), the cost is close to zero:

```text
CLAIMED  +  repeatable = true
    ↓
baselineValue = the current value
unlockedAt = null, claimedAt = null
status = LOCKED
    ↓
a new cycle begins
```

Claim history lives in its own table — this is the "trophy case", and the trophy case is what makes claiming feel earned:

```text
RewardClaim
- id
- rewardId
- userId
- claimedAt
```

---

# 17. Claim Reward

When a reward is unlocked:

```text
🎉 Reward Unlocked!

🍵 Matcha

You completed 10 DSA quests.

[ Claim Reward ]
```

After claiming:

```text
🍵 Matcha

CLAIMED

Claimed on Sep 2, 2026
```

The MVP only stores the state. No need to prove the user actually bought the matcha.

## 17.1. Claim transaction

```text
BEGIN

1. Validate  (reward belongs to the user, status = UNLOCKED)
2. reward.status = CLAIMED, claimedAt = now
3. INSERT RewardClaim              -- the trophy case (§16.1)
4. If reward.repeatable:
       baselineValue = the current value for conditionType
       status = LOCKED
       unlockedAt = null, claimedAt = null

COMMIT
```

⚠️ Step 4 is why `RewardClaim` must be its own table: `reward.claimedAt` is reset when the reward repeats, so history cannot live on the reward row itself.

## 17.2. Why Claim must be its own action

Data-wise, `UNLOCKED → CLAIMED` carries no extra information — it could auto-claim on unlock. But this is the app's **number one product risk**: a reward granted by the user can be cheated by the user.

Making the user deliberately press `[ Claim ]`, with an animation and a line written into the trophy case, is the only thing the MVP has to turn it into a commitment rather than a toast drifting by.

---

# 18. Reward Progress

The dashboard shows active rewards:

```text
ACTIVE REWARDS

🍵 Matcha
DSA quests

███████░░░ 7 / 10

🍣 Sushi
Reading quests

████░░░░░░ 4 / 10

⭐ Premium
XP

████████░░ 780 / 1000
```

Progress must update automatically when quests/XP/streak change.

---

# 19. Notification System

The MVP has **in-app notifications**.

No email/push notifications needed.

Events:

```text
LEVEL_UP
REWARD_UNLOCKED
STREAK_MILESTONE
GOAL_COMPLETED
```

Example:

```text
🎉 You reached Level 12!

🍵 Reward Unlocked!
You earned your Matcha reward.

🔥 7 Day Streak!
Keep going!
```

---

# 20. Dashboard

The dashboard is the most important screen.

Suggested layout:

```text
┌─────────────────────────────────────────┐
│ LIFE RPG                                │
│                                         │
│ Lv. 12                                  │
│ █████████████░░░ 1,240 / 1,500 XP      │
│                                         │
│ 🔥 7 Day Streak                         │
├─────────────────────────────────────────┤
│                                         │
│ TODAY'S QUESTS                          │
│                                         │
│ ○ Solve 2 LeetCode          +100 XP     │
│ ○ Read 20 pages              +50 XP     │
│ ✓ Review System Design       +50 XP     │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│ ACTIVE REWARDS                          │
│                                         │
│ 🍵 Matcha                  7 / 10       │
│ ███████░░░                              │
│                                         │
│ 🍣 Sushi                   4 / 10       │
│ ████░░░░░░                              │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│ GOALS                                   │
│                                         │
│ Become a Strong SWE       65%           │
│ Improve Drawing           30%           │
│ Read More Books           45%           │
│                                         │
└─────────────────────────────────────────┘
```

---

# 21. Goals Page

Display all goals:

```text
GOALS

┌─────────────────────────┐
│ 💻 Become a Strong SWE  │
│ ████████░░ 80%          │
│ 42 / 50 quests          │
└─────────────────────────┘

┌─────────────────────────┐
│ 🎨 Improve Drawing      │
│ ███░░░░░░░ 30%          │
│ 12 / 40 quests          │
└─────────────────────────┘
```

---

# 22. Quest Page

Quest list supports:

```text
Today
Upcoming
Completed
```

Filters:

```text
Goal
Difficulty
Status
```

Quest card:

```text
┌──────────────────────────────┐
│ ⚔ Solve 2 LeetCode Problems │
│                              │
│ DSA                          │
│ Medium                       │
│                              │
│ +100 XP          Due Today   │
│                              │
│ [ Complete ]                 │
└──────────────────────────────┘
```

---

# 23. Reward Page

Reward page:

```text
REWARDS

ACTIVE

🍵 Matcha
Complete 10 DSA quests

███████░░░ 7 / 10


🍣 Sushi
Complete 10 Reading quests

████░░░░░░ 4 / 10


UNLOCKED

🎬 Movie Night
7 Day Streak

[ CLAIM ]
```

Reward creation:

```text
Create Reward

Name:
[ Matcha ]

Icon:
[ 🍵 ]

Description:
[ One cup of matcha ]

Condition:
[ Quest Count ▼ ]

Amount:
[ 10 ]

Goal:
[ DSA ▼ ]

[ Create Reward ]
```

---

# 24. MVP Data Model

⚠️ Revised from v1. Changes are marked with `⚠️` on each field.

## User

```text
User
- id
- name
- email
- timezone        ⚠️ NEW — IANA, e.g. "Asia/Ho_Chi_Minh". Required (§11.1)
- createdAt
```

## Player

```text
Player
- userId
- totalXp         a cache of SUM(XpTransaction.amount) — the ledger is the source of truth
- level           ⚠️ DERIVED from totalXp, cache only (§7.1)
- currentStreak
- longestStreak
- lastActiveDate  DATE — in the user's timezone
```

## Goal

```text
Goal
- id
- userId
- title
- description
- category        display label only, NOT used in reward conditions (§14.1)
- status          ACTIVE | COMPLETED | ARCHIVED
- createdAt
- updatedAt
```

## Quest — the definition

```text
Quest
- id
- userId
- goalId          ⚠️ nullable
- title
- description
- type            ONE_TIME | DAILY
- difficulty      EASY | MEDIUM | HARD | EPIC
- xpReward
- isArchived      ⚠️ replaces status
- dueDate         nullable
- createdAt
- updatedAt
```

⚠️ `status` and `completedAt` are gone — see §9.2.

## QuestCompletion — the event ⚠️ NEW TABLE

```text
QuestCompletion
- id
- userId
- questId
- xpAwarded       snapshot
- completedAt     timestamptz
- localDate       DATE

UNIQUE (questId, localDate)
INDEX  (userId, localDate)
INDEX  (userId, questId)
```

## XpTransaction — the ledger ⚠️ NEW TABLE

```text
XpTransaction
- id
- userId
- amount              may be negative
- source              QUEST_COMPLETE | QUEST_UNDO | ADJUSTMENT
- questCompletionId   nullable
- createdAt
```

## Reward

```text
Reward
- id
- userId
- name
- description
- icon
- conditionType    QUEST_COUNT | XP_TOTAL | STREAK
- conditionValue
- goalId           nullable — only used with QUEST_COUNT (§14.1)
- baselineValue    ⚠️ NEW — snapshot at creation time (§14.2)
- repeatable       ⚠️ NEW — boolean (§16.1)
- status           LOCKED | UNLOCKED | CLAIMED
- unlockedAt
- claimedAt
- createdAt
```

## RewardClaim ⚠️ NEW TABLE

```text
RewardClaim
- id
- rewardId
- userId
- claimedAt
```

## Notification

```text
Notification
- id
- userId
- type       LEVEL_UP | REWARD_UNLOCKED | STREAK_MILESTONE | GOAL_COMPLETED
- title
- message
- read
- createdAt
```

---

# 25. Reward Calculation

⚠️ Revised: every progress value subtracts `baselineValue` (§14.2).

## QUEST_COUNT

```sql
current = SELECT COUNT(*) FROM quest_completion qc
          JOIN quest q ON q.id = qc.quest_id
          WHERE qc.user_id = :userId
            AND (:goalId IS NULL OR q.goal_id = :goalId)
```

## XP_TOTAL

```sql
current = SELECT COALESCE(SUM(amount), 0) FROM xp_transaction
          WHERE user_id = :userId
```

## STREAK

```text
current = player.currentStreak      -- do NOT subtract the baseline
```

## General formula

```text
QUEST_COUNT / XP_TOTAL:
    progress = clamp(current − baselineValue, 0, conditionValue)

STREAK:
    progress = min(currentStreak, conditionValue)

ratio    = progress / conditionValue
unlocked = progress >= conditionValue
```

`baselineValue` is set when the reward is created, and set again each time a `repeatable` reward is claimed.

---

# 26. Reward Unlock Logic

`evaluateRewards(userId, tx)` runs **inside** the transaction of every event that can affect progression:

```text
completeQuest      → §10.1
undoComplete       → §10.2  (may revert UNLOCKED → LOCKED)
claimReward        → §17    (resets the baseline if repeatable)
```

The full flow:

```text
QuestCompleted
      ↓
INSERT QuestCompletion + XpTransaction(+50)
      ↓
totalXp = SUM(ledger) → derive level → LEVEL_UP?
      ↓
Update streak (idempotent per day)
      ↓
evaluateRewards(userId)
      ↓
   Matcha   49 − 42 = 7  / 10   → LOCKED
   Sushi    52 − 42 = 10 / 10   → UNLOCK ⚡
   Premium  780 − 0      / 1000 → LOCKED
      ↓
Reward.status = UNLOCKED, unlockedAt = now
      ↓
INSERT Notification(REWARD_UNLOCKED)
      ↓
Return the juice payload to the client (§10.4)
```

⚠️ **Only evaluate rewards with `status = LOCKED`.** Skip rewards already UNLOCKED or CLAIMED, so no duplicate notification is emitted on every quest completion.

---

# 27. Important Backend Rule

Reward unlocking must be **server-authoritative**.

Frontend must never decide:

```text
"User has completed 10 quests,
therefore reward is unlocked."
```

Frontend only displays backend state.

Backend:

```text
completeQuest()
    ↓
transaction
    ↓
quest = COMPLETED
player XP += reward
update streak
evaluate rewards
create notification
commit
```

This prevents users from manipulating XP/rewards through client-side state.

---

# 28. Transaction Boundary

Quest completion should be atomic.

Conceptually:

```text
BEGIN TRANSACTION

1. Complete quest
2. Award XP
3. Update player
4. Update streak
5. Evaluate rewards
6. Unlock rewards
7. Create notifications

COMMIT
```

If something fails:

```text
ROLLBACK
```

This prevents situations such as:

```text
Quest = completed
XP = not awarded
Reward = unlocked
```

---

# 29. Frontend State

MVP can use:

```text
Server state:
TanStack Query

Local UI state:
Zustand
```

Server is source of truth for:

- XP
- Level
- Quest status
- Rewards
- Streak
- Notifications

---

# 30. Visual Direction

MVP should **not** attempt to build a full RPG art style.

Use:

### Visual style

**Modern productivity app + RPG UI**

Core visual elements:

- XP bars
- Quest cards
- Reward cards
- Level badge
- Icons
- Achievement-like notifications
- Small micro-interactions
- Progress animations

Avoid:

- Character sprites
- Large illustrations
- Detailed fantasy environments
- Complex pixel art

The UI itself should create the RPG feeling.

---

# 31. Suggested Main Navigation

```text
Dashboard
Quests
Goals
Rewards
Profile
```

Keep navigation extremely small for MVP.

---

# 32. MVP Screens

Only build these screens:

### 1. Dashboard

Main gameplay loop.

### 2. Quests

Create / edit / complete quests.

### 3. Goals

Create / manage goals.

### 4. Rewards

Create / track / claim rewards.

### 5. Profile

Level, XP, streak, statistics.

No additional screens unless needed.

---

# 33. MVP Success Criteria

MVP is considered successful if a user can complete this flow without friction:

```text
Create Goal
    ↓
Create Quest
    ↓
Create Reward
    ↓
Complete Quest
    ↓
Earn XP
    ↓
See Progress
    ↓
Complete enough quests
    ↓
Receive Notification
    ↓
Reward becomes UNLOCKED
    ↓
Claim Reward
```

If this loop feels satisfying, the project has enough product potential to continue.

---

# 34. Example Full Session

User opens app.

```text
Level 8
████████░░ 820 / 1000 XP

🔥 6 Day Streak
```

Today's quests:

```text
○ Solve 2 LeetCode problems       +100 XP
○ Read 20 pages                    +50 XP
○ Walk 30 minutes                  +30 XP
```

User completes LeetCode quest.

```text
Quest Complete!

+100 XP
🔥 7 Day Streak
```

Then:

```text
🎉 REWARD UNLOCKED

🍵 Matcha

You completed 10 DSA quests.

[ CLAIM REWARD ]
```

User clicks:

```text
✓ Reward Claimed

Enjoy your matcha! 🍵
```

That is the **entire MVP gameplay loop**.

---

# 35. Future Expansion Roadmap

Once MVP proves the concept:

## Phase 2 — RPG Layer

- Character
- Stats
- XP categories
- Achievements
- Badges
- Gold
- Inventory
- Shop
- Items
- Skill tree

## Phase 3 — Quest Engine

- Quest dependencies
- Quest chains
- Main quests
- Side quests
- Daily quests
- Weekly quests
- Boss quests
- Quest templates

## Phase 4 — World

- Interactive world map
- Goals become regions
- Milestones become landmarks
- Quest paths
- Fog of war
- Unlockable areas
- Procedural world generation

## Phase 5 — Intelligence

- Automatic quest breakdown
- Adaptive difficulty
- Smart daily planning
- Goal prioritization
- AI-generated quest suggestions

## Phase 6 — Advanced Engineering

- Event-driven architecture
- Background jobs
- Offline-first
- Realtime synchronization
- Collaborative quests
- Analytics
- Recommendation engine
- Web Workers
- Canvas/WebGL world rendering

---

A strong recommendation: **don't build more than this spec on the first pass.** This MVP is already enough to answer the most important question: **"Wait — is using this app actually fun, and does it actually make me want to finish quests?"**

If the answer is yes, that's when it becomes worth pouring effort into **character/world/skill tree/economy/AI**. And if the `Quest → XP → Reward` loop isn't addictive already, drawing another 500 assets won't save the app.
