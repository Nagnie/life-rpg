"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUi } from "@/lib/store";
import { NAV_ITEMS } from "./nav-items";

/**
 * Phím tắt toàn cục — lợi thế của web app trên desktop.
 *
 *   ⌘K / Ctrl+K  command palette
 *   N            quest mới
 *   R            reward mới
 *   C            hoàn thành quest đang chọn
 *   J / K        di chuyển lựa chọn
 *   G rồi D/Q/G/R/P   nhảy màn hình
 *   Esc          đóng overlay
 */
export function Shortcuts({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();
  // "G" mở một chuỗi hai phím; lưu thời điểm bấm để chuỗi tự hết hạn.
  const pendingGoto = useRef(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select";

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useUi.getState().openPalette();
        return;
      }

      if (e.key === "Escape") {
        // Nhả focus rồi đóng luôn trong CÙNG một lần bấm. Design gốc chỉ blur
        // và bắt bấm Escape lần hai — với form có autoFocus thì đó là bug UX.
        if (typing) target?.blur();
        const ui = useUi.getState();
        ui.closeAllOverlays();
        ui.dismissUnlock();
        return;
      }

      // Khi đang gõ vào ô nhập, mọi phím đơn thuộc về ô đó.
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      const ui = useUi.getState();
      if (ui.levelUp) {
        if (e.key === "Enter") ui.closeLevelUp();
        return;
      }
      if (ui.unlock || ui.claimed) return;

      const k = e.key.toLowerCase();

      if (Date.now() - pendingGoto.current < 1200) {
        const dest = NAV_ITEMS.find((n) => n.key === k);
        pendingGoto.current = 0;
        if (dest) {
          e.preventDefault();
          router.push(dest.href);
          return;
        }
      }

      if (k === "g") {
        pendingGoto.current = Date.now();
        return;
      }
      if (k === "c") {
        e.preventDefault();
        onComplete();
      } else if (k === "n") {
        e.preventDefault();
        ui.openQuestForm();
      } else if (k === "r") {
        e.preventDefault();
        ui.openRewardForm();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, onComplete]);

  return null;
}
