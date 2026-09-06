"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Nền mờ dùng chung cho mọi modal.
 *
 * Khoá cuộn nền khi mở — nếu không, cuộn chuột sẽ cuộn trang phía sau và
 * modal trông như bị dính.
 */
export function Backdrop({
  onClose,
  children,
  className,
  style,
  testId,
}: {
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className={cn("animate-fade-in fixed inset-0 backdrop-blur-[6px]", className)}
      style={style}
    >
      {/* Chặn click lan ra nền cho toàn bộ nội dung con. */}
      <div className="contents" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
