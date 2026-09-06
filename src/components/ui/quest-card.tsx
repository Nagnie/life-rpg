"use client";

import { useUi } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { QuestView } from "@/server/services/read";
import { DiffBadge } from "./primitives";

/**
 * Quest card — thành phần xuất hiện nhiều nhất trong app, và là nơi diễn ra
 * hành động duy nhất thật sự quan trọng: bấm Complete.
 */
export function QuestCard({
  quest,
  onComplete,
  onUndo,
  busy,
}: {
  quest: QuestView;
  onComplete: () => void;
  onUndo: () => void;
  busy: boolean;
}) {
  const selectedId = useUi((s) => s.selectedQuestId);
  const setSelected = useUi((s) => s.setSelectedQuest);
  const selected = selectedId === quest.id;
  const done = quest.isDone;

  return (
    <div
      onClick={() => setSelected(quest.id)}
      data-testid="quest-item"
      data-quest-title={quest.title}
      data-quest-done={done}
      className={cn(
        "relative flex items-center gap-3.5 rounded-[13px] border px-4 py-3.5 transition-all duration-150",
        "hover:-translate-y-px hover:shadow-e2",
        done ? "bg-surface-2 opacity-70" : "bg-surface",
        selected ? "border-primary shadow-[0_0_0_3px_var(--primary-soft),var(--sh2)]" : "border-line shadow-e1",
      )}
    >
      {selected && (
        <span className="absolute -top-2 left-3.5 rounded-[5px] bg-primary px-1.5 py-px font-mono text-[9.5px] font-semibold tracking-[0.06em] text-primary-ink">
          SELECTED · C
        </span>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (done) onUndo();
          else onComplete();
        }}
        disabled={busy}
        aria-label={done ? "Hoàn tác" : "Hoàn thành"}
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-lg border-2 text-[13px] font-extrabold transition-colors",
          done
            ? "border-success bg-success text-white"
            : "border-line-2 bg-transparent text-transparent hover:border-primary",
        )}
      >
        {done ? "✓" : ""}
      </button>

      <div className={cn("shrink-0 text-lg", done && "grayscale-[0.6]")}>{quest.displayIcon}</div>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "mb-1.5 text-[14.5px] font-bold tracking-[-0.01em]",
            done ? "text-ink-3 line-through" : "text-ink",
          )}
        >
          {quest.title}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-3">
            {quest.goalTitle ? `${quest.goalIcon ?? "🎯"} ${quest.goalTitle}` : "— No goal"}
          </span>
          <DiffBadge difficulty={quest.difficulty} />
          <span className="rounded-[5px] border border-line-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.05em] text-ink-3">
            {quest.type}
          </span>
          <span
            className={cn(
              "text-[11.5px] font-semibold",
              !done && quest.dueLabel.includes("today") ? "text-flame" : "text-ink-3",
              quest.dueLabel === "Overdue" && "text-danger",
            )}
          >
            {quest.dueLabel}
          </span>
        </div>
      </div>

      <div className="rounded-lg bg-accent-soft px-2.5 py-1 font-display text-sm font-bold tracking-[-0.01em] text-accent-ink tnum">
        +{quest.xpReward} XP
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (done) onUndo();
          else onComplete();
        }}
        disabled={busy}
        data-testid={done ? "undo-button" : "complete-button"}
        className={cn(
          "rounded-[9px] border px-3.5 py-2 text-[12.5px] font-bold whitespace-nowrap transition-[filter] hover:brightness-105 disabled:opacity-40",
          done
            ? "border-line bg-transparent text-ink-3"
            : "border-transparent bg-primary text-primary-ink",
        )}
      >
        {done ? "Undo" : "Complete"}
      </button>
    </div>
  );
}
