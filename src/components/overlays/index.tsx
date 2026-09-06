"use client";

import { useEffect } from "react";
import { useUi } from "@/lib/store";
import { Floaters, Toasts } from "./toasts";
import { ClaimedModal, LevelUpModal, UnlockModal } from "./celebrations";
import { QuestForm } from "./quest-form";
import { GoalForm } from "./goal-form";
import { RewardForm } from "./reward-form";
import { CommandPalette } from "./palette";
import { Onboarding } from "./onboarding";

/**
 * Mọi thứ nổi lên trên nội dung. Gom một chỗ để thứ tự z-index đọc được ở đây
 * thay vì rải khắp các màn hình.
 */
export function Overlays() {
  const setTheme = useUi((s) => s.setTheme);

  // Đồng bộ store với data-theme mà script inline đã đặt trước khi hydrate.
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light") {
      useUi.setState({ theme: current });
    } else {
      setTheme("light");
    }
  }, [setTheme]);

  return (
    <>
      <Floaters />
      <Toasts />
      <QuestForm />
      <GoalForm />
      <RewardForm />
      <CommandPalette />
      <Onboarding />
      <LevelUpModal />
      <UnlockModal />
      <ClaimedModal />
    </>
  );
}
