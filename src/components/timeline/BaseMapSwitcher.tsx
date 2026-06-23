"use client";

import { useEffect, useRef, useState } from 'react';

export type MapStyleType = 'light' | 'dark' | 'google-hybrid';

export const getInitialMapStyle = (): MapStyleType => {
  if (typeof window === 'undefined') return 'dark';

  const savedTheme = window.localStorage.getItem('theme');
  if (savedTheme === 'light') return 'light';
  if (savedTheme === 'dark') return 'dark';

  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
};

export const getMapStyle = (styleType: MapStyleType, stadiaKey?: string): any => {
  if (styleType === 'light') {
    return `https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=${stadiaKey}`;
  }

  if (styleType === 'google-hybrid') {
    return {
      version: 8,
      sources: {
        'google-hybrid': {
          type: 'raster',
          tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
          tileSize: 256,
          attribution: 'Google',
        },
      },
      layers: [
        {
          id: 'google-hybrid-layer',
          type: 'raster',
          source: 'google-hybrid',
          minzoom: 0,
          maxzoom: 22,
        },
      ],
    };
  }

  return `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json?api_key=${stadiaKey}`;
};

interface BaseMapSwitcherProps {
  currentStyle: MapStyleType;
  onStyleChange: (style: MapStyleType) => void;
}

export default function BaseMapSwitcher({ currentStyle, onStyleChange }: BaseMapSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const styles: { id: MapStyleType; name: string; icon: string }[] = [
    { id: 'light', name: 'Light Map', icon: 'L' },
    { id: 'dark', name: 'Dark Map', icon: 'D' },
    { id: 'google-hybrid', name: 'Google Hybrid', icon: 'G' },
  ];

  return (
    <div ref={wrapperRef} className="absolute top-16 right-4 z-[1000]">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-black/80 p-2 text-white shadow-xl backdrop-blur-md transition-colors hover:bg-white/10"
          title="Change map style"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13 6-3m-6 3V7m6 10 4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 flex min-w-[180px] flex-col overflow-hidden rounded-xl border border-white/10 bg-black/90 shadow-2xl backdrop-blur-xl">
            {styles.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => {
                  onStyleChange(style.id);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/10 ${
                  currentStyle === style.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-white'
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-[10px] font-black">
                  {style.icon}
                </span>
                <span className="text-sm font-medium">{style.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
