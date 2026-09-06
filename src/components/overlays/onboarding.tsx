"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useUi } from "@/lib/store";
import { useRefreshAll } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Backdrop } from "@/components/ui/overlay";
import type { Difficulty, QuestType } from "@/domain/types";

/**
 * Template onboarding. Xử lý rủi ro "3 form trống lúc mở app lần đầu"
 * (PLAN.md §3): user phải thấy cảm giác complete quest TRƯỚC khi phải tự nghĩ
 * ra quest của mình.
 */
type Template = {
  emoji: string;
  title: string;
  desc: string;
  quests: { icon: string; title: string; difficulty: Difficulty; type: QuestType }[];
  reward: { icon: string; name: string; value: number };
};

const TEMPLATES: Template[] = [
  {
    emoji: "💻",
    title: "Software Engineer",
    desc: "Interview-shaped practice with a steady daily floor.",
    quests: [
      { icon: "⚔️", title: "Solve 2 LeetCode problems", difficulty: "MEDIUM", type: "DAILY" },
      { icon: "🧠", title: "Review system design notes", difficulty: "EASY", type: "DAILY" },
      { icon: "🗂", title: "Ship one side-project PR", difficulty: "HARD", type: "ONE_TIME" },
    ],
    reward: { icon: "🍵", name: "Matcha", value: 10 },
  },
  {
    emoji: "📚",
    title: "Reading Habit",
    desc: "Pages every day beats a chapter every month.",
    quests: [
      { icon: "📖", title: "Read 20 pages", difficulty: "EASY", type: "DAILY" },
      { icon: "✍️", title: "Write 3 lines of notes", difficulty: "EASY", type: "DAILY" },
      { icon: "📗", title: "Finish a chapter", difficulty: "HARD", type: "ONE_TIME" },
    ],
    reward: { icon: "🍣", name: "Sushi", value: 10 },
  },
  {
    emoji: "🏃",
    title: "Fitness",
    desc: "Small, boring, repeatable. That is the point.",
    quests: [
      { icon: "🏃", title: "Walk 30 minutes", difficulty: "EASY", type: "DAILY" },
      { icon: "🤸", title: "10 minute mobility", difficulty: "EASY", type: "DAILY" },
      { icon: "🏋️", title: "Full gym session", difficulty: "HARD", type: "ONE_TIME" },
    ],
    reward: { icon: "🎬", name: "Movie Night", value: 10 },
  },
];

export function Onboarding() {
  const open = useUi((s) => s.onboardingOpen);
  const close = useUi((s) => s.closeOnboarding);
  const pushToast = useUi((s) => s.pushToast);
  const refresh = useRefreshAll();

  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const createGoal = trpc.goal.create.useMutation();
  const createQuest = trpc.quest.create.useMutation();
  const createReward = trpc.reward.create.useMutation();

  if (!open) return null;

  const apply = async () => {
    if (picked === null || busy) return;
    const t = TEMPLATES[picked];
    setBusy(true);
    try {
      const goal = await createGoal.mutateAsync({ title: t.title, icon: t.emoji });
      // Tuần tự chứ không song song: thứ tự tạo quyết định thứ tự hiển thị.
      for (const q of t.quests) {
        await createQuest.mutateAsync({ ...q, goalId: goal.id });
      }
      // ⚠️ Tạo reward SAU quest là an toàn: baseline chụp tại thời điểm này,
      // và lúc này chưa có completion nào nên baseline = 0 (§14.2).
      await createReward.mutateAsync({
        name: t.reward.name,
        icon: t.reward.icon,
        conditionType: "QUEST_COUNT",
        conditionValue: t.reward.value,
        goalId: goal.id,
        repeatable: true,
      });
      pushToast({
        icon: t.emoji,
        title: "Goal created",
        body: `${t.title} · ${t.quests.length} quests seeded`,
      });
      setPicked(null);
      close();
      await refresh();
    } catch (error) {
      pushToast({
        icon: "⚠️",
        title: "Không dựng được template",
        body: error instanceof Error ? error.message : "Lỗi không rõ",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Backdrop
      testId="onboarding-modal"
      className="z-105 grid place-items-center bg-[oklch(0.14_0.02_285/.82)] p-6 backdrop-blur-lg"
    >
      <div className="animate-modal-in w-[800px] max-w-[96vw] rounded-[22px] border border-line bg-surface px-8.5 pt-8.5 pb-7 shadow-e3">
        <div className="mb-6.5 text-center">
          <div className="text-[11.5px] font-extrabold tracking-[0.16em] text-primary">
            PICK A TEMPLATE
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-[-0.025em]">
            What are you levelling up?
          </div>
          <p className="mt-1.5 text-[13.5px] text-ink-2">
            We&apos;ll seed one goal, three quests and a starter reward. Edit anything later.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3.5">
          {TEMPLATES.map((t, i) => (
            <button
              key={t.title}
              onClick={() => setPicked(i)}
              data-testid="template-card"
              data-template={t.title}
              data-active={picked === i}
              className={cn(
                "rounded-2xl border-[1.5px] px-4.5 py-5 text-left transition-transform duration-150 hover:-translate-y-0.5",
                picked === i
                  ? "border-primary bg-primary-soft shadow-e2"
                  : "border-line bg-surface-2",
              )}
            >
              <div className="grid size-11 place-items-center rounded-[13px] border border-line bg-surface text-[22px]">
                {t.emoji}
              </div>
              <div className="mt-3.5 text-[15.5px] font-extrabold tracking-[-0.015em] text-ink">
                {t.title}
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{t.desc}</p>
              <div className="mt-3 flex flex-col gap-1.5">
                {t.quests.map((q) => (
                  <div key={q.title} className="flex items-center gap-1.5 text-xs text-ink-2">
                    <span className="w-3.5 text-center">{q.icon}</span>
                    <span className="flex-1 truncate">{q.title}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3.5 rounded-[9px] border border-dashed border-line-2 bg-surface px-2.5 py-2 text-[11.5px] text-ink-2">
                Reward:{" "}
                <strong className="text-ink">
                  {t.reward.icon} {t.reward.name} after {t.reward.value} quests
                </strong>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="text-xs text-ink-3">
            You can run several templates — each becomes its own goal.
          </div>
          <div className="flex-1" />
          <button onClick={close} className="px-4 py-2.5 text-[13px] font-bold text-ink-3 hover:text-ink">
            Skip, I&apos;ll set it up myself
          </button>
          <button
            onClick={apply}
            disabled={picked === null || busy}
            data-testid="onboarding-continue"
            className="rounded-[11px] bg-primary px-5 py-3 text-[13.5px] font-extrabold text-primary-ink shadow-e1 transition-colors hover:bg-primary-hi disabled:opacity-40"
          >
            {busy ? "Creating…" : "Continue →"}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}
