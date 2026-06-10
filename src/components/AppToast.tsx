"use client";

import { useEffect } from "react";
import type { ToastMessage, ToastType } from "@/hooks/useToast";

const toastStyles: Record<ToastType, { bar: string; title: string; icon: string }> = {
  success: {
    bar: "border-emerald-400/30 bg-emerald-950/85 text-emerald-50",
    title: "Success",
    icon: "text-emerald-300",
  },
  error: {
    bar: "border-rose-400/30 bg-rose-950/85 text-rose-50",
    title: "Error",
    icon: "text-rose-300",
  },
  warning: {
    bar: "border-amber-400/30 bg-amber-950/85 text-amber-50",
    title: "Warning",
    icon: "text-amber-300",
  },
  info: {
    bar: "border-indigo-400/30 bg-slate-950/90 text-indigo-50",
    title: "Note",
    icon: "text-indigo-300",
  },
};

export default function AppToast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const style = toastStyles[toast.type];

  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(toast.id), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`pointer-events-auto w-[min(24rem,calc(100vw-2rem))] rounded-2xl border px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl transition-all ${style.bar}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10 ${style.icon}`}>
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            {toast.type === "success" ? (
              <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 111.414-1.414l2.793 2.793 6.793-6.793a1 1 0 011.414 0z" clipRule="evenodd" />
            ) : toast.type === "error" ? (
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 15z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-7-3a1 1 0 10-2 0v3a1 1 0 00.293.707l2 2a1 1 0 001.414-1.414L11 9.586V7z" clipRule="evenodd" />
            )}
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">{style.title}</p>
          <p className="mt-1 text-sm font-semibold leading-snug">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="rounded-lg p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Dismiss notification"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
