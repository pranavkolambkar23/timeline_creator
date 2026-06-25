"use client";

export default function TimelineOpeningOverlay() {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-foreground/60">
          Opening Timeline
        </p>
      </div>
    </div>
  );
}
