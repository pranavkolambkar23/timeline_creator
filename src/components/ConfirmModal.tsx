"use client";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "info";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "info",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#080808]/95 p-6 text-white shadow-2xl shadow-black/50">
        <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${isDanger ? "bg-rose-500/15 text-rose-300" : "bg-indigo-500/15 text-indigo-300"}`}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            {isDanger ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
        </div>
        <h2 id="confirm-modal-title" className="text-xl font-black tracking-tight">{title}</h2>
        <p className="mt-3 text-sm font-medium leading-6 text-white/60">{message}</p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-xs font-black uppercase tracking-widest text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 ${isDanger ? "bg-rose-600 shadow-rose-950/40 hover:bg-rose-500" : "bg-indigo-600 shadow-indigo-950/40 hover:bg-indigo-500"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
