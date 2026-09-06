"use client";

import { useState, type FormEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useUi } from "@/lib/store";
import { useRefreshAll } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Backdrop } from "@/components/ui/overlay";
import { Kbd } from "@/components/ui/primitives";

/**
 * Design gốc không có form tạo Goal — goal chỉ đến từ template onboarding.
 * Nhưng §33 yêu cầu "Create Goal" là bước đầu của core loop, nên bổ sung ở đây
 * theo đúng ngôn ngữ hình ảnh của form quest.
 */
const GOAL_ICONS = ["💻", "📚", "🏃", "🎨", "🎯", "🧠", "💰", "🌱", "🎸", "🍳"];

export function GoalForm() {
  const open = useUi((s) => s.goalFormOpen);
  const close = useUi((s) => s.closeGoalForm);
  const pushToast = useUi((s) => s.pushToast);
  const refresh = useRefreshAll();

  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("🎯");

  const create = trpc.goal.create.useMutation({
    onSuccess: async (goal) => {
      pushToast({ icon: goal.icon ?? "🎯", title: "Goal created", body: goal.title });
      setTitle("");
      close();
      await refresh();
    },
    onError: (e) => pushToast({ icon: "⚠️", title: "Không tạo được goal", body: e.message }),
  });

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim()) create.mutate({ title: title.trim(), icon });
  };

  return (
    <Backdrop
      testId="goal-form-modal"
      onClose={close}
      className="z-96 grid place-items-start justify-center bg-[oklch(0.15_0.02_285/.55)] pt-[14vh] backdrop-blur-[3px]"
    >
      <form
        onSubmit={submit}
        data-testid="goal-form"
        className="animate-pop-in w-[480px] max-w-[94vw] rounded-[18px] border border-line bg-surface px-6 pt-5.5 pb-6 shadow-e3"
      >
        <div className="mb-1 flex items-center gap-2.5">
          <div className="text-base font-extrabold tracking-[-0.015em]">New goal</div>
          <div className="flex-1" />
          <Kbd>ESC</Kbd>
        </div>
        <p className="mb-4 text-[12.5px] text-ink-3">The long arc your quests ladder up to.</p>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Become a Strong SWE"
          data-testid="goal-title-input"
          className="w-full rounded-[11px] border border-line bg-surface-2 px-3.5 py-3 text-[15px] font-bold text-ink placeholder:text-ink-3"
        />

        <div className="mt-3.5">
          <div className="mb-2 text-[11.5px] font-extrabold tracking-[0.07em] text-ink-3">ICON</div>
          <div className="flex flex-wrap gap-1.5">
            {GOAL_ICONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setIcon(g)}
                data-testid="goal-icon-option"
                data-value={g}
                className={cn(
                  "grid size-10 place-items-center rounded-[11px] border-[1.5px] text-lg transition-colors",
                  icon === g ? "border-primary bg-primary-soft" : "border-line bg-surface-2",
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4.5 flex gap-2.5">
          <button
            type="submit"
            disabled={create.isPending || !title.trim()}
            data-testid="goal-submit"
            className="flex-1 rounded-[11px] bg-primary py-3.5 text-[13.5px] font-extrabold text-primary-ink transition-colors hover:bg-primary-hi disabled:opacity-40"
          >
            Create goal
          </button>
          <button
            type="button"
            onClick={close}
            className="rounded-[11px] border border-line bg-surface-2 px-4.5 py-3.5 text-[13px] font-bold text-ink-2 transition-colors hover:bg-surface-3"
          >
            Cancel
          </button>
        </div>
      </form>
    </Backdrop>
  );
}
