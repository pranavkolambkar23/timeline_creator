"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ViewerImage = {
  id?: string;
  url: string;
  title?: string;
};

type MobileImageViewerProps = {
  images: ViewerImage[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  getAlt?: (image: ViewerImage, index: number) => string;
};

export default function MobileImageViewer({
  images,
  activeIndex,
  onIndexChange,
  onClose,
  getAlt,
}: MobileImageViewerProps) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const activeImage = images[activeIndex];

  useEffect(() => {
    setPortalTarget(document.body);
    document.body.dataset.mobileImageViewerOpen = "true";

    return () => {
      delete document.body.dataset.mobileImageViewerOpen;
    };
  }, []);

  if (!activeImage) return null;

  const movePhoto = (direction: -1 | 1) => {
    if (images.length === 0) return;
    onIndexChange((activeIndex + direction + images.length) % images.length);
  };

  const handleTouchEnd = (clientX: number, clientY: number) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || images.length <= 1) return;

    const deltaX = clientX - start.x;
    const deltaY = clientY - start.y;
    if (Math.abs(deltaX) < 52 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

    movePhoto(deltaX < 0 ? 1 : -1);
  };

  const viewer = (
    <div
      className="fixed inset-0 z-[2147483647] flex flex-col bg-black text-white"
      onClick={(event) => event.stopPropagation()}
      onTouchStart={(event) => {
        event.stopPropagation();
        const touch = event.touches[0];
        touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(event) => {
        event.stopPropagation();
        const touch = event.changedTouches[0];
        if (touch) handleTouchEnd(touch.clientX, touch.clientY);
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
          {activeIndex + 1} of {images.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition active:scale-95"
          aria-label="Close image viewer"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <img
          src={activeImage.url}
          alt={getAlt?.(activeImage, activeIndex) || activeImage.title || `Photo ${activeIndex + 1}`}
          className="max-h-full max-w-full object-contain"
        />

        {images.length > 1 && (
          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/55 backdrop-blur">
            Swipe photos
          </p>
        )}
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {images.map((image, index) => (
            <button
              key={image.id || `${image.url}-${index}`}
              type="button"
              onClick={() => onIndexChange(index)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border transition ${
                activeIndex === index ? "border-white" : "border-white/15 opacity-55"
              }`}
              aria-label={`Open photo ${index + 1}`}
            >
              <img
                src={image.url}
                alt={getAlt?.(image, index) || image.title || `Photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return portalTarget ? createPortal(viewer, portalTarget) : viewer;
}
