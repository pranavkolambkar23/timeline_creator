"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";
import { compressImage, uploadMedia } from "@/lib/uploadHelper";

export type MediaType = "image" | "audio";

export interface MediaItem {
  id: string;
  url: string;
  type: MediaType;
  size: number;
  title?: string;
}

interface MediaUploaderProps {
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  maxLimit?: number;
  imagePosition?: { x: number; y: number };
  onImagePositionChange?: (position: { x: number; y: number }) => void;
  imageZoom?: number;
  onImageZoomChange?: (zoom: number) => void;
}

function DraggableImagePreview({
  src,
  alt,
  position,
  onPositionChange,
  zoom,
  onZoomChange,
}: {
  src: string;
  alt: string;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPosition: { x: number; y: number };
    width: number;
    height: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const zoomRef = useRef(zoom);

  const clampPercent = (value: number) => Math.max(0, Math.min(100, value));
  const clampZoom = (value: number) => Math.max(0.35, Math.min(5, value));
  const translateX = position.x - 50;
  const translateY = position.y - 50;
  const setZoom = (nextZoom: number) => onZoomChange(clampZoom(nextZoom));

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !isEditing) return;

    const onWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setZoom(zoomRef.current + (event.deltaY < 0 ? 0.08 : -0.08));
    };

    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [isEditing, onZoomChange]);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!frameRef.current || !isEditing) return;

    event.preventDefault();
    event.stopPropagation();
    const rect = frameRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startPosition: position,
      width: rect.width || 1,
      height: rect.height || 1,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const onPointerMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      event.preventDefault();
      onPositionChange({
        x: clampPercent(drag.startPosition.x + ((event.clientX - drag.startX) / drag.width) * 100),
        y: clampPercent(drag.startPosition.y + ((event.clientY - drag.startY) / drag.height) * 100),
      });
    };

    const onPointerUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isDragging, onPositionChange]);

  return (
    <div
      ref={frameRef}
      onPointerDown={startDrag}
      className={`relative h-full w-full overflow-hidden ${isEditing ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
      title={isEditing ? "Drag to reposition image. Scroll to zoom." : "Enable image editing to pan or zoom."}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-contain"
        style={{
          transform: `translate(-50%, -50%) scale(${zoom}) translate(${translateX}%, ${translateY}%)`,
        }}
      />
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setIsEditing((value) => !value);
        }}
        className={`absolute bottom-2 left-2 z-10 rounded-full border px-2.5 py-1 text-[8px] font-mono uppercase tracking-wider backdrop-blur transition ${
          isEditing
            ? "border-emerald-300/30 bg-emerald-500/25 text-emerald-100"
            : "border-white/15 bg-black/55 text-white/75 hover:bg-black/70"
        }`}
      >
        {isEditing ? "Done" : "Edit Image"}
      </button>
      <div className={`${isEditing ? "pointer-events-none absolute bottom-2 left-[6.8rem] rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[8px] font-mono uppercase tracking-wider text-white/70 backdrop-blur" : "hidden"}`}>
        Drag image · Scroll zoom
      </div>
      <div className={`${isEditing ? "absolute right-2 top-2 flex overflow-hidden rounded-full border border-white/15 bg-black/60 text-white shadow-lg backdrop-blur" : "hidden"}`}>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setZoom(zoom - 0.1);
          }}
          className="flex h-7 w-8 items-center justify-center text-sm font-bold transition hover:bg-white/10 disabled:opacity-40"
          aria-label="Zoom out"
          disabled={zoom <= 0.35}
        >
          -
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setZoom(zoom + 0.1);
          }}
          className="flex h-7 w-8 items-center justify-center border-l border-white/10 text-sm font-bold transition hover:bg-white/10 disabled:opacity-40"
          aria-label="Zoom in"
          disabled={zoom >= 5}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function MediaUploader({
  media,
  onChange,
  maxLimit = 10,
  imagePosition,
  onImagePositionChange,
  imageZoom = 1,
  onImageZoomChange,
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    if (media.length + e.target.files.length > maxLimit) {
      setError(`You can only upload up to ${maxLimit} items.`);
      return;
    }

    setUploading(true);
    setError(null);

    const newMediaItems: MediaItem[] = [];

    try {
      for (let i = 0; i < e.target.files.length; i++) {
        let file = e.target.files[i];
        
        // Validation
        if (file.type.startsWith("audio/") && file.size > 5 * 1024 * 1024) {
          throw new Error(`Audio file ${file.name} is larger than 5MB.`);
        }
        if (file.size > 25 * 1024 * 1024) {
          throw new Error(`File ${file.name} is larger than 25MB.`);
        }

        const isImage = file.type.startsWith("image/");
        const isAudio = file.type.startsWith("audio/");

        if (!isImage && !isAudio) {
          throw new Error(`File ${file.name} is not a supported image or audio format.`);
        }

        // Compress images
        if (isImage) {
          file = await compressImage(file);
        }

        // Upload
        const { url, key } = await uploadMedia(file);

        newMediaItems.push({
          id: key,
          url,
          type: isImage ? "image" : "audio",
          size: file.size,
          title: file.name,
        });
      }

      onChange([...media, ...newMediaItems]);
    } catch (err: any) {
      setError(err.message || "Failed to upload file(s)");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeMedia = (idToRemove: string) => {
    onChange(media.filter(item => item.id !== idToRemove));
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      {media.length > 0 && (
        <div className={maxLimit === 1 ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2 sm:grid-cols-3"}>
          {media.map((item) => (
            <div key={item.id} className={`group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] ${maxLimit === 1 ? "aspect-[4/5]" : "aspect-square"}`}>
              {item.type === "image" ? (
                imagePosition && onImagePositionChange && onImageZoomChange ? (
                  <DraggableImagePreview
                    src={item.url}
                    alt={item.title || "Image"}
                    position={imagePosition}
                    onPositionChange={onImagePositionChange}
                    zoom={imageZoom}
                    onZoomChange={onImageZoomChange}
                  />
                ) : (
                  <img src={item.url} alt={item.title || "Image"} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                )
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
                  <svg className="mb-2 h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <span className="line-clamp-2 text-[10px] text-white/60">{item.title}</span>
                </div>
              )}
              
              <button 
                type="button"
                onClick={() => removeMedia(item.id)}
                onPointerDown={(event) => event.stopPropagation()}
                className={`absolute right-1.5 top-1.5 z-20 rounded-full bg-black/70 text-white backdrop-blur-md transition hover:bg-rose-500/80 ${
                  maxLimit === 1
                    ? "px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider opacity-100"
                    : "p-1 opacity-0 group-hover:opacity-100"
                }`}
              >
                {maxLimit === 1 ? (
                  "Remove"
                ) : (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          ))}
          
          {media.length < maxLimit && (
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-white/40 transition hover:bg-white/[0.04] hover:text-white/70 active:scale-95 disabled:opacity-50 ${maxLimit === 1 ? "aspect-[4/5]" : "aspect-square"}`}
            >
              {uploading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></span>
              ) : (
                <>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[10px] font-mono uppercase tracking-wider">Add More</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {media.length === 0 && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-indigo-400/25 bg-indigo-500/10 py-8 text-center transition hover:bg-indigo-500/15 active:scale-[0.98] disabled:opacity-50"
        >
          {uploading ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400"></span>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <span className="block text-xs font-semibold text-indigo-200">Upload Image or Audio</span>
                <span className="mt-1 block text-[9px] font-mono uppercase tracking-wider text-indigo-200/50">Up to 25MB</span>
              </div>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
