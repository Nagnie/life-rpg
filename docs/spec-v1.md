# Life RPG — MVP Product & Technical Specification

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
├── Level
├── Current XP
├── Total XP
├── Current Streak
├── Longest Streak
└── Completed Quests
```

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

The MVP can use fixed progression.

Example:

```text
Level 1 → 0 XP
Level 2 → 100 XP
Level 3 → 250 XP
Level 4 → 450 XP
Level 5 → 700 XP
...
```

Or use a formula:

```text
XP required for next level =
100 × level^1.5
```

No need to tune the formula for the MVP.

What matters is:

```text
XP gained
    ↓
Check level
    ↓
Level up if necessary
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

## 9.1. Quest

A quest is the smallest unit of work.

Fields:

```text
id
userId
goalId
title
description
type
difficulty
xpReward
status
dueDate
completedAt
createdAt
updatedAt
```

Quest types:

```text
ONE_TIME
DAILY
```

Statuses:

```text
TODO
COMPLETED
ARCHIVED
```

---

# 10. Quest Completion

When the user clicks:

```text
[ Complete Quest ]
```

The system does:

```text
1. Validate quest
2. Mark quest completed
3. Award XP
4. Update player progression
5. Update streak
6. Check reward conditions
7. Unlock eligible rewards
8. Create notification
```

Example:

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

The MVP only needs a **daily completion streak**.

If the user completes at least one quest in a day:

```text
Day completed
```

If the next day is also completed:

```text
Streak +1
```

Example:

```text
Mon ✓
Tue ✓
Wed ✓
Thu ✓
Fri ✓

🔥 5 Day Streak
```

If the user completes no quest in a day:

```text
Streak resets to 0
```

The MVP does not need:

- Streak freeze
- Recovery
- Streak protection
- Multiple streak types

Those come later.

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

## 14.1. Quest Count

```text
Complete 10 quests
```

Can be scoped by Goal.

Example:

```text
Complete 10 quests
from Goal = DSA
```

---

## 14.2. XP

```text
Earn 1000 XP
```

---

## 14.3. Streak

```text
Reach 7 Day Streak
```

---

# 15. Reward Examples

### Example 1

```text
Reward:
🍵 Matcha

Condition:
Complete 10 quests

Category:
DSA

Progress:
7 / 10

███████░░░
```

### Example 2

```text
Reward:
🍣 Sushi

Condition:
Complete 10 quests

Category:
Reading

Progress:
10 / 10

UNLOCKED
```

### Example 3

```text
Reward:
⭐ 1 Month Premium

Condition:
Earn 1000 XP

Progress:
780 / 1000 XP

████████░░
```

### Example 4

```text
Reward:
🔥 7 Day Streak

Condition:
7 consecutive active days

Progress:
5 / 7 days

█████░░
```

---

# 16. Reward Lifecycle

A reward has this lifecycle:

```text
LOCKED
   ↓
ELIGIBLE
   ↓
UNLOCKED
   ↓
CLAIMED
```

### LOCKED

Condition not met.

### UNLOCKED

Condition met.

The user gets a notification.

### CLAIMED

The user confirmed receiving the reward.

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

The MVP only stores the state.

No need to prove the user actually bought the matcha.

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

## User

```text
User
- id
- name
- email
- createdAt
```

## Player

```text
Player
- userId
- level
- totalXp
- currentStreak
- longestStreak
- lastActiveDate
```

## Goal

```text
Goal
- id
- userId
- title
- description
- category
- status
- createdAt
- updatedAt
```

## Quest

```text
Quest
- id
- userId
- goalId
- title
- description
- type
- difficulty
- xpReward
- status
- dueDate
- completedAt
- createdAt
- updatedAt
```

## Reward

```text
Reward
- id
- userId
- name
- description
- icon
- conditionType
- conditionValue
- goalId
- status
- unlockedAt
- claimedAt
- createdAt
```

## Notification

```text
Notification
- id
- userId
- type
- title
- message
- read
- createdAt
```

---

# 25. Reward Calculation

Reward progress should be calculated from existing user data.

Example:

```text
Reward:
10 DSA quests
```

Query:

```text
COUNT(completed quests)
WHERE
    user = current user
    AND goal = DSA
```

Progress:

```text
min(completedQuestCount / requiredCount, 1)
```

---

# 26. Reward Unlock Logic

Whenever a meaningful progression event occurs:

```text
QuestCompleted
XPChanged
StreakChanged
```

run:

```text
checkRewards(user)
```

Example:

```text
QuestCompleted
      ↓
+50 XP
      ↓
Update Player
      ↓
Update Streak
      ↓
Check Active Rewards
      ↓
Matcha: 9 / 10
Sushi: 10 / 10
Premium: 780 / 1000
      ↓
Unlock Sushi
      ↓
Create Notification
```

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
