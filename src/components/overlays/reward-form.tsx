"use client";

import { useState, type FormEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useUi } from "@/lib/store";
import { useRefreshAll } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Backdrop } from "@/components/ui/overlay";
import { conditionLabel } from "@/domain/rewards";
import type { ConditionType } from "@/domain/types";

const EMOJI = ["🍵", "🍣", "🎮", "📚", "🎬", "☕", "🍜", "🎧", "🏖", "🍰", "⭐", "🛍"];

const CONDITIONS: { key: ConditionType; icon: string; label: string; hint: string; step: number; initial: number }[] = [
  { key: "QUEST_COUNT", icon: "⚔️", label: "Quest Count", hint: "N quests done", step: 1, initial: 10 },
  { key: "XP_TOTAL", icon: "✦", label: "XP Earned", hint: "N total XP", step: 100, initial: 1000 },
  { key: "STREAK", icon: "🔥", label: "Streak", hint: "N days in a row", step: 1, initial: 14 },
];

const label = "mb-2 text-[11.5px] font-extrabold tracking-[0.07em] text-ink-3";
const field =
  "w-full rounded-[10px] border border-line bg-surface-2 px-3.5 py-2.5 text-[13.5px] font-semibold text-ink placeholder:text-ink-3";

export function RewardForm() {
  const open = useUi((s) => s.rewardFormOpen);
  const close = useUi((s) => s.closeRewardForm);
  const pushToast = useUi((s) => s.pushToast);
  const refresh = useRefreshAll();
  const goals = trpc.goal.list.useQuery(undefined, { enabled: open });

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🍵");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState<ConditionType>("QUEST_COUNT");
  const [amount, setAmount] = useState(10);
  const [goalId, setGoalId] = useState("");
  const [repeatable, setRepeatable] = useState(true);

  const def = CONDITIONS.find((c) => c.key === condition)!;
  const goalTitle = (goals.data ?? []).find((g) => g.id === goalId)?.title ?? null;

  const create = trpc.reward.create.useMutation({
    onSuccess: async (reward) => {
      pushToast({ icon: reward.icon, title: "Reward created", body: reward.name });
      setName("");
      setDescription("");
      close();
      await refresh();
    },
    onError: (e) => pushToast({ icon: "⚠️", title: "Không tạo được reward", body: e.message }),
  });

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({
      name: name.trim(),
      description: description.trim() || null,
      icon,
      conditionType: condition,
      conditionValue: Math.max(1, amount),
      // goalId chỉ có nghĩa với QUEST_COUNT (§14.1)
      goalId: condition === "QUEST_COUNT" && goalId ? goalId : null,
      repeatable,
    });
  };

  return (
    <Backdrop
      testId="reward-form-drawer"
      onClose={close}
      className="z-95 flex justify-end bg-[oklch(0.15_0.02_285/.55)] backdrop-blur-[3px]"
    >
      <form
        onSubmit={submit}
        data-testid="reward-form"
        className="h-full w-[520px] max-w-[96vw] overflow-y-auto border-l border-line bg-surface px-7 pt-6.5 pb-10 shadow-e3"
      >
        <div className="mb-5.5 flex items-center gap-3">
          <div>
            <div className="text-lg font-extrabold tracking-[-0.02em]">New reward</div>
            <div className="text-[12.5px] text-ink-3">
              Something real. Something you&apos;d actually want.
            </div>
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={close}
            aria-label="Đóng"
            className="grid size-8 place-items-center rounded-[9px] bg-surface-2 text-[15px] text-ink-2 transition-colors hover:bg-surface-3"
          >
            ✕
          </button>
        </div>

        {/* Xem trước — cho thấy thứ sắp được tạo trước khi bấm nút. */}
        <div className="mb-5 flex items-center gap-3.5 rounded-[14px] bg-surface-2 p-4">
          <div className="grid size-14 place-items-center rounded-[15px] border border-line bg-surface text-[28px]">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold">{name || "Untitled reward"}</div>
            <div className="text-xs text-ink-3">
              {conditionLabel(condition, Math.max(1, amount), condition === "QUEST_COUNT" ? goalTitle : null)}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4.5">
          <div>
            <div className={label}>NAME</div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Matcha at the good café"
              data-testid="reward-name-input"
              className={field}
            />
          </div>

          <div>
            <div className={label}>EMOJI</div>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  data-testid="reward-icon-option"
                  data-value={e}
                  className={cn(
                    "grid size-10.5 place-items-center rounded-[11px] border-[1.5px] text-xl transition-colors",
                    icon === e ? "border-primary bg-primary-soft" : "border-line bg-surface-2",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
            <input type="hidden" data-testid="reward-icon-input" value={icon} readOnly />
          </div>

          <div>
            <div className={label}>
              DESCRIPTION <span className="font-semibold tracking-normal">optional</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="The ceremonial grade one, not the powder from the supermarket."
              className={cn(field, "min-h-16 resize-y font-normal text-[13px]")}
            />
          </div>

          <div>
            <div className={label}>CONDITION TYPE</div>
            <div className="grid grid-cols-3 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    setCondition(c.key);
                    setAmount(c.initial);
                  }}
                  data-testid="reward-condition-option"
                  data-value={c.key}
                  data-active={condition === c.key}
                  className={cn(
                    "rounded-xl border-[1.5px] px-2.5 py-3.5 text-left text-ink transition-colors hover:border-primary",
                    condition === c.key ? "border-primary bg-primary-soft" : "border-line bg-surface-2",
                  )}
                >
                  <div className="text-[17px]">{c.icon}</div>
                  <div className="mt-1.5 text-[12.5px] font-bold">{c.label}</div>
                  <div className="mt-px text-[11px] text-ink-3">{c.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-[150px] shrink-0">
              <div className={label}>AMOUNT</div>
              <div className="flex items-center overflow-hidden rounded-[10px] border border-line bg-surface-2">
                <button
                  type="button"
                  aria-label="Giảm"
                  onClick={() => setAmount((a) => Math.max(1, a - def.step))}
                  className="h-10.5 w-9 text-base font-bold text-ink-2 transition-colors hover:bg-surface-3"
                >
                  −
                </button>
                {/* Ô nhập thật, không chỉ là số hiển thị: gõ thẳng 137 nhanh hơn bấm + 137 lần. */}
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
                  data-testid="reward-value-input"
                  className="w-full min-w-0 bg-transparent text-center font-display text-[17px] font-bold text-ink outline-none tnum [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  aria-label="Tăng"
                  onClick={() => setAmount((a) => a + def.step)}
                  className="h-10.5 w-9 text-base font-bold text-ink-2 transition-colors hover:bg-surface-3"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex-1">
              <div className={label}>
                GOAL <span className="font-semibold tracking-normal">optional — scopes the count</span>
              </div>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                disabled={condition !== "QUEST_COUNT"}
                data-testid="reward-goal-select"
                className={cn(field, "py-3 disabled:opacity-40")}
              >
                <option value="">All goals</option>
                {(goals.data ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.icon ?? "🎯"} {g.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checkbox thật nằm dưới lớp hình ảnh: vẫn focus/tab/đọc màn hình được. */}
          <label
            data-testid="reward-repeatable-toggle"
            className="flex cursor-pointer items-center gap-3.5 rounded-xl border border-line bg-surface-2 px-4 py-3.5"
          >
            <input
              type="checkbox"
              checked={repeatable}
              onChange={(e) => setRepeatable(e.target.checked)}
              data-testid="reward-repeatable"
              className="peer sr-only"
            />
            <span
              className={cn(
                "relative h-6 w-10.5 shrink-0 rounded-full transition-colors",
                repeatable ? "bg-primary" : "bg-line-2",
              )}
            >
              <span
                className="absolute top-[3px] size-4.5 rounded-full bg-white shadow-e1 transition-[left]"
                style={{ left: repeatable ? 21 : 3 }}
              />
            </span>
            <span className="flex-1">
              <span className="block text-[13.5px] font-bold">Repeatable</span>
              <span className="block text-xs text-ink-3">
                {repeatable
                  ? "Resets to 0 after you claim it, so you can earn it again"
                  : "A one-off. Once claimed it moves to the trophy case for good"}
              </span>
            </span>
          </label>

          <div className="flex gap-2.5 pt-1">
            <button
              type="submit"
              disabled={create.isPending || !name.trim()}
              data-testid="reward-submit"
              className="flex-1 rounded-xl bg-primary py-3.5 text-sm font-extrabold text-primary-ink shadow-e1 transition-colors hover:bg-primary-hi disabled:opacity-40"
            >
              Create reward
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-xl border border-line bg-surface-2 px-4.5 py-3.5 text-[13.5px] font-bold text-ink-2 transition-colors hover:bg-surface-3"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </Backdrop>
  );
}
