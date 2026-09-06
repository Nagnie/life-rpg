"use client";

/**
 * State của giao diện (không phải state của server).
 *
 * Server state đi qua TanStack Query. Ở đây chỉ có thứ thuần UI: theme, modal
 * đang mở, hàng đợi toast, quest đang được chọn bằng bàn phím.
 */

import { create } from "zustand";
import type { CompleteQuestResult } from "@/server/services/completeQuest";

export type Theme = "light" | "dark";
const THEME_KEY = "life-rpg-theme";

export type Toast = {
  id: number;
  icon: string;
  title: string;
  body: string;
  right?: string;
  kind?: "xp" | "plain";
};

export type Floater = { id: number; gain: number };

/** Reward vừa unlock, đã rút gọn cho modal ăn mừng. */
export type UnlockPayload = {
  rewardId: string;
  icon: string;
  name: string;
  conditionLabel: string;
};

export type ClaimedPayload = {
  icon: string;
  name: string;
  cost: string;
  repeatable: boolean;
};

type UiState = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;

  selectedQuestId: string | null;
  setSelectedQuest: (id: string | null) => void;

  questFormOpen: boolean;
  rewardFormOpen: boolean;
  goalFormOpen: boolean;
  paletteOpen: boolean;
  onboardingOpen: boolean;
  openQuestForm: () => void;
  closeQuestForm: () => void;
  openRewardForm: () => void;
  closeRewardForm: () => void;
  openGoalForm: () => void;
  closeGoalForm: () => void;
  openPalette: () => void;
  closePalette: () => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  closeAllOverlays: () => void;

  levelUp: { from: number; to: number; streak: number; nextNeed: number } | null;
  closeLevelUp: () => void;

  unlock: UnlockPayload | null;
  /** Reward unlock đang xếp hàng sau modal level up (xem celebrate). */
  pendingUnlock: UnlockPayload | null;
  showUnlock: (u: UnlockPayload) => void;
  dismissUnlock: () => void;

  claimed: ClaimedPayload | null;
  showClaimed: (c: ClaimedPayload) => void;
  closeClaimed: () => void;

  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dropToast: (id: number) => void;

  floaters: Floater[];
  pushFloater: (gain: number) => void;
};

let nextId = 1;
const id = () => nextId++;

export const useUi = create<UiState>((set, get) => ({
  theme: "light",
  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Chế độ riêng tư hoặc chặn site data — theme vẫn đổi trong phiên này.
    }
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),

  selectedQuestId: null,
  setSelectedQuest: (selectedQuestId) => set({ selectedQuestId }),

  questFormOpen: false,
  rewardFormOpen: false,
  goalFormOpen: false,
  paletteOpen: false,
  onboardingOpen: false,
  openQuestForm: () => set({ questFormOpen: true, paletteOpen: false }),
  closeQuestForm: () => set({ questFormOpen: false }),
  openRewardForm: () => set({ rewardFormOpen: true, paletteOpen: false }),
  closeRewardForm: () => set({ rewardFormOpen: false }),
  openGoalForm: () => set({ goalFormOpen: true, paletteOpen: false }),
  closeGoalForm: () => set({ goalFormOpen: false }),
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
  openOnboarding: () => set({ onboardingOpen: true }),
  closeOnboarding: () => set({ onboardingOpen: false }),
  closeAllOverlays: () =>
    set({
      questFormOpen: false,
      rewardFormOpen: false,
      goalFormOpen: false,
      paletteOpen: false,
      onboardingOpen: false,
    }),

  levelUp: null,
  closeLevelUp: () =>
    set((s) => ({ levelUp: null, unlock: s.pendingUnlock, pendingUnlock: null })),

  unlock: null,
  pendingUnlock: null,
  showUnlock: (unlock) => set({ unlock }),
  dismissUnlock: () => set({ unlock: null }),

  claimed: null,
  showClaimed: (claimed) => set({ claimed, unlock: null }),
  closeClaimed: () => set({ claimed: null }),

  toasts: [],
  pushToast: (t) => {
    const toast = { ...t, id: id() };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    setTimeout(() => get().dropToast(toast.id), 3600);
  },
  dropToast: (dropped) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== dropped) })),

  floaters: [],
  pushFloater: (gain) => {
    const f = { id: id(), gain };
    set((s) => ({ floaters: [...s.floaters, f] }));
    setTimeout(() => set((s) => ({ floaters: s.floaters.filter((x) => x.id !== f.id) })), 1300);
  },
}));

/**
 * Dàn dựng phần "juice" sau khi complete quest, từ payload server trả về (§10.4).
 *
 * Thứ tự cố ý: XP bay lên và toast ngay lập tức, còn modal chờ 700ms để user
 * kịp thấy thanh XP chạy trước khi bị chặn màn hình.
 */
export function celebrate(result: CompleteQuestResult, questTitle: string) {
  const ui = useUi.getState();

  ui.pushFloater(result.xpAwarded);
  ui.pushToast({
    icon: "⚔️",
    title: "Quest complete",
    body: questTitle,
    right: `+${result.xpAwarded} XP`,
    kind: "xp",
  });

  if (result.streak.milestone) {
    ui.pushToast({
      icon: "🔥",
      title: `${result.streak.milestone} day streak`,
      body: "Giữ nhịp nhé.",
    });
  }

  const first = result.unlockedRewards[0];
  const unlock: UnlockPayload | null = first
    ? {
        rewardId: first.id,
        icon: first.icon,
        name: first.name,
        conditionLabel: first.conditionLabel,
      }
    : null;

  // Chờ 700ms để user kịp thấy thanh XP chạy trước khi bị chặn màn hình.
  //
  // ⚠️ Level up và reward unlock có thể xảy ra CÙNG một cú complete. Level up
  // hiện trước vì nó hiếm hơn, nhưng reward phải được XẾP HÀNG chứ không bị
  // bỏ — user đã mở khoá nó rồi, nuốt mất thông báo là mất luôn khoảnh khắc
  // đắt nhất của app.
  if (result.levelUp) {
    const { levelUp } = result;
    setTimeout(
      () =>
        useUi.setState({
          levelUp: {
            from: levelUp.from,
            to: levelUp.to,
            streak: result.streak.current,
            nextNeed: 0,
          },
          pendingUnlock: unlock,
        }),
      700,
    );
    return;
  }

  if (unlock) setTimeout(() => useUi.setState({ unlock }), 700);
}
