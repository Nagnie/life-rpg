import type { Difficulty } from "./types";

/** spec §7 — XP mặc định theo difficulty. User được phép override khi tạo quest. */
export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 20,
  MEDIUM: 50,
  HARD: 100,
  EPIC: 250,
};

export function defaultXpFor(difficulty: Difficulty): number {
  return XP_BY_DIFFICULTY[difficulty];
}

/** Emoji mặc định cho quest chưa đặt icon. */
export const DEFAULT_QUEST_ICON: Record<Difficulty, string> = {
  EASY: "🌱",
  MEDIUM: "⚔️",
  HARD: "🗂",
  EPIC: "🔥",
};

export function questIcon(icon: string | null, difficulty: Difficulty): string {
  return icon?.trim() || DEFAULT_QUEST_ICON[difficulty];
}
