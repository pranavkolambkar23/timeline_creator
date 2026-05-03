"use client";

import { useState, useEffect, useRef } from 'react';

export type MapStyleType = 'dark' | 'satellite' | 'google-hybrid';

export const getMapStyle = (styleType: MapStyleType, stadiaKey?: string): any => {
  if (styleType === 'satellite') {
    return `https://tiles.stadiamaps.com/styles/alidade_satellite.json?api_key=${stadiaKey}`;
  }
  if (styleType === 'google-hybrid') {
    return {
      version: 8,
      sources: {
        'google-hybrid': {
          type: 'raster',
          tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
          tileSize: 256,
          attribution: '© Google',
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
  // Default to dark
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
    { id: 'dark', name: 'Dark Mode', icon: '🌙' },
    { id: 'satellite', name: 'Satellite (Stadia)', icon: '🛰️' },
    { id: 'google-hybrid', name: 'Google Hybrid', icon: '🗺️' },
  ];

  return (
    <div ref={wrapperRef} className="absolute top-16 right-4 z-[1000]">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-black/80 backdrop-blur-md border border-white/20 p-2 rounded-xl text-white shadow-xl hover:bg-white/10 transition-colors flex items-center justify-center w-10 h-10"
          title="Change map style"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[200px] flex flex-col">
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onStyleChange(s.id);
                  setIsOpen(false);
                }}
                className={`text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center gap-3 border-b border-white/5 last:border-0 ${currentStyle === s.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-white'}`}
              >
                <span className="text-lg">{s.icon}</span>
                <span className="text-sm font-medium">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
