# Prompt for Claude Design

> Copy everything in the block below and paste it into Claude Design.

---

Design the UI for **Life RPG** — a productivity app that gamifies your life.

**This is a web app running in a browser, designed desktop-first.** Not a native mobile app. The main layout targets laptop screens (~1280–1440px). No separate mobile design is needed — just make sure the layout doesn't break when the window narrows (single column, collapsed nav).

The typical user is a developer sitting in front of a laptop: their quests are solving LeetCode, reading books, studying system design. They keep this app open in a tab next to their code tab — design for that context.

## What makes this different from Habitica

The key point: **the rewards are real things, defined by the user themselves.** No virtual gold, no virtual armor. The user sets it up: "finish 10 DSA quests → I get one cup of matcha". The app tracks progress and, once the condition is met, unlocks it so the user can reward themselves.

That makes the **Reward Unlocked** moment the most valuable moment in the entire app. Everything else exists to lead up to it.

Core loop:
`Create Goal → create Quest → create Reward → complete Quest → +XP, +Streak → condition met → Reward Unlocked → Claim`

## Aesthetic direction

**A modern productivity app with an RPG feel — NOT a fantasy game.**

Should have:
- XP bar, level badge, streak flame, progress ring
- Quest card, reward card
- Achievement/trophy-style notifications
- Micro-interactions, progress animations
- Emoji as reward icons (🍵 🍣 🎮 📚 🎬) — this is deliberate: zero asset cost and the user gets to pick

**Absolutely avoid:**
- Character sprites, pixel art, large illustrations
- Detailed fantasy settings, wood/stone frames, gothic fonts
- Garish F2P mobile-game coloring

The "RPG" feeling has to come from **the progression system shown in the UI**, not from the art style. Spiritual reference: Linear meets Duolingo. Clean, compact, highly readable type — but progress numbers are present and carry weight.

Both **light mode and dark mode** are required.

## Design system to deliver

- Palette: 1 primary color, 1 accent color for XP/rewards, semantics (success/warning/danger), a neutral scale
- A 4-step difficulty color scale: **Easy / Medium / Hard / Epic** (Epic is the rarest → it should stand out the most)
- Typography: a readable body font plus a distinct treatment for **numbers** (level, XP, streak) — numbers need weight
- Spacing, radius, elevation
- Components: XP bar, progress bar, level badge, streak flame, quest card, reward card, difficulty badge, empty state, toast

## Screens to design (only 5 — don't add more)

### 1. Dashboard — the most important one
Top to bottom:
- Header: `Lv. 12` + XP bar `1,240 / 1,500 XP` + `🔥 7 Day Streak`
- **TODAY'S QUESTS** — 3–5 quest cards, some ticked, some not
- **ACTIVE REWARDS** — 2–3 reward cards with progress (`🍵 Matcha  7/10`)
- **GOALS** — a compact list with % progress

### 2. Quests
- Tabs: `Today` / `Upcoming` / `Completed`
- Filters: goal, difficulty, status
- Quest card contains: title, goal name, difficulty badge, `+100 XP`, due date, a `[ Complete ]` button
- Clearly distinguish **DAILY** quests (recurring) from **ONE_TIME** quests
- Also draw the state of a DAILY quest **already completed today** — still in the list, but ticked

### 3. Goals
A card grid: emoji, title, progress bar, `42 / 50 quests`, `80%`

### 4. Rewards
Three groups: `ACTIVE` (in progress) / `UNLOCKED` (with a `[ CLAIM ]` button) / `CLAIMED` — present the CLAIMED group as a **trophy case**, not a drab gray list. It's the evidence of the effort the user put in.
Include the **reward creation form** screen: name, emoji picker, description, condition type (Quest Count / XP / Streak), amount, goal (optional), repeatable toggle.

### 5. Profile
Level, total XP, current and longest streak, total quests, and a **heatmap of active days** (GitHub contribution graph style).

## The three "juice" moments — design them individually, they are the soul of the app

1. **Quest Complete** — `+50 XP` floats up, the XP bar animates smoothly, the number counts up
2. **Level Up** — a blocking modal, weighty, requires a click to dismiss
3. **Reward Unlocked** — celebration + confetti. Show the reward emoji large, the name, the line stating the condition met, and a genuinely prominent `[ CLAIM REWARD ]` button. **This is the single most important screen in the whole app — spend the most effort here.**

Also design the post-claim screen: `✓ Claimed — Enjoy your matcha! 🍵`. Claiming has to feel like an earned ritual, not a toast drifting by.

## Also needed

- Empty states for all 5 screens (especially the Dashboard on first launch — the user has nothing yet)
- Onboarding: pick a starter template (SWE / Reading / Fitness) so the user isn't staring at three blank forms
- **A fixed left sidebar**: Dashboard · Quests · Goals · Rewards · Profile — with a level badge + miniature XP bar permanently visible at the bottom of the sidebar
- Since this is a desktop app, lean into it: clear hover states, and **keyboard shortcut hints right in the UI** (`C` to complete the selected quest, `N` to create a quest, `⌘K` for the command palette). Cheap to do, and it makes the app feel like "a dev tool" rather than "a phone app opened on a computer".

## Sample data to fill the design with

```
Player:  Lv. 12 · 1,240 / 1,500 XP · 🔥 7 days · 42 quests

Goals:   💻 Become a Strong SWE     42/50   80%
         🎨 Improve Drawing         12/40   30%
         📚 Read More Books         18/40   45%

Quests:  ⚔ Solve 2 LeetCode Problems   SWE · Medium · +100 XP · Due Today
         📖 Read 20 pages              Reading · Easy · +50 XP · Daily
         ✓ Review System Design        SWE · Medium · +50 XP · done
         🏃 Walk 30 minutes            Easy · +30 XP · Daily
         🔥 Finish portfolio site      SWE · Epic · +250 XP

Rewards: 🍵 Matcha        Complete 10 SWE quests      7/10
         🍣 Sushi         Complete 10 Reading quests  10/10  → UNLOCKED
         ⭐ 1 Month Premium  Earn 1000 XP             780/1000
         🎬 Movie Night   Reach 7 Day Streak          CLAIMED
```

All UI copy is in **English**.
