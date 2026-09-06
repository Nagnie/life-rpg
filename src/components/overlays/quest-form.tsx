"use client";

import { useState, type FormEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useUi } from "@/lib/store";
import { useRefreshAll } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Backdrop } from "@/components/ui/overlay";
import { DIFF_CLASS, Kbd } from "@/components/ui/primitives";
import { DIFFICULTIES, QUEST_TYPES, type Difficulty, type QuestType } from "@/domain/types";
import { XP_BY_DIFFICULTY } from "@/domain/xp";

const input =
  "w-full rounded-[11px] border border-line bg-surface-2 px-3.5 py-3 text-ink placeholder:text-ink-3";

export function QuestForm() {
  const open = useUi((s) => s.questFormOpen);
  const close = useUi((s) => s.closeQuestForm);
  const pushToast = useUi((s) => s.pushToast);
  const refresh = useRefreshAll();
  const goals = trpc.goal.list.useQuery(undefined, { enabled: open });

  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [type, setType] = useState<QuestType>("ONE_TIME");
  const [goalId, setGoalId] = useState("");

  const create = trpc.quest.create.useMutation({
    onSuccess: async (quest) => {
      pushToast({ icon: "⚔️", title: "Quest created", body: quest.title });
      setTitle("");
      setIcon("");
      close();
      await refresh();
    },
    onError: (e) => pushToast({ icon: "⚠️", title: "Không tạo được quest", body: e.message }),
  });

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate({
      title: title.trim(),
      icon: icon.trim() || null,
      difficulty,
      type,
      goalId: goalId || null,
    });
  };

  return (
    <Backdrop
      testId="quest-form-modal"
      onClose={close}
      className="z-96 grid place-items-start justify-center bg-[oklch(0.15_0.02_285/.55)] pt-[12vh] backdrop-blur-[3px]"
    >
      <form
        onSubmit={submit}
        data-testid="quest-form"
        className="animate-pop-in w-[520px] max-w-[94vw] rounded-[18px] border border-line bg-surface px-6 pt-5.5 pb-6 shadow-e3"
      >
        <div className="mb-4 flex items-center gap-2.5">
          <div className="text-base font-extrabold tracking-[-0.015em]">New quest</div>
          <div className="flex-1" />
          <Kbd>ESC</Kbd>
        </div>

        <div className="flex gap-2">
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="⚔️"
            aria-label="Emoji"
            data-testid="quest-icon-input"
            className={cn(input, "w-16 shrink-0 text-center text-lg")}
          />
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Solve 2 LeetCode problems"
            data-testid="quest-title-input"
            className={cn(input, "text-[15px] font-bold")}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              data-testid="quest-difficulty-option"
              data-value={d}
              data-active={difficulty === d}
              className={cn(
                "rounded-[9px] border-[1.5px] px-3 py-2 text-xs font-extrabold tracking-[0.04em]",
                difficulty === d
                  ? cn(DIFF_CLASS[d], "border-current")
                  : "border-line bg-surface-2 text-ink-3",
              )}
            >
              {d} <span className="font-display opacity-70">+{XP_BY_DIFFICULTY[d]}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <select
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            data-testid="quest-goal-select"
            className="flex-1 rounded-[10px] border border-line bg-surface-2 px-3 py-2.5 text-[13px] font-semibold text-ink"
          >
            <option value="">— No goal</option>
            {(goals.data ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.icon ?? "🎯"} {g.title}
              </option>
            ))}
          </select>
          <div className="flex gap-1 rounded-[10px] border border-line bg-surface-2 p-1">
            {QUEST_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                data-testid="quest-type-option"
                data-value={t}
                data-active={type === t}
                className={cn(
                  "rounded-[7px] px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors",
                  type === t ? "bg-surface text-ink shadow-e1" : "text-ink-3",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-2.5">
          <button
            type="submit"
            disabled={create.isPending || !title.trim()}
            data-testid="quest-submit"
            className="flex-1 rounded-[11px] bg-primary py-3.5 text-[13.5px] font-extrabold text-primary-ink transition-colors hover:bg-primary-hi disabled:opacity-40"
          >
            Create quest
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
