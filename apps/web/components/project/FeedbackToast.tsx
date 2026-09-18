"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import type { Feedback } from "@/lib/hooks/useProject";

/** Save confirmations auto-dismiss; errors stay until dismissed. Both are announced. */
export function FeedbackToast({ feedback, onDismiss }: { feedback: Feedback | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!feedback || feedback.tone === "error") return;
    const timer = window.setTimeout(onDismiss, 3500);
    return () => window.clearTimeout(timer);
  }, [feedback, onDismiss]);

  return (
    <div className="toast-region" aria-live={feedback?.tone === "error" ? "assertive" : "polite"} role="status">
      {feedback ? (
        <div className={`toast toast-${feedback.tone}`}>
          {feedback.tone === "error" ? <AlertCircle size={18} aria-hidden /> : <CheckCircle2 size={18} aria-hidden />}
          <span className="flex-1">{feedback.message}</span>
          <button type="button" className="icon-btn" onClick={onDismiss} aria-label="Dismiss message">
            <X size={16} aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
