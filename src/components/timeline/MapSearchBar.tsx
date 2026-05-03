"use client";

import { useState, useEffect, useRef } from "react";
import { useMap } from "react-map-gl/maplibre";

interface MapSearchBarProps {
  mapId?: string; // If using multiple maps, though usually useMap without id gets the default map in context
  onLocationSelect?: (lon: number, lat: number) => void;
}

export default function MapSearchBar({ mapId, onLocationSelect }: MapSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  // useMap hook provides access to the react-map-gl map instance
  const { current: map } = useMap();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchPlaces = async (text: string) => {
    if (!text.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_MAPS_KEY;
      const res = await fetch(
        `https://api.stadiamaps.com/geocoding/v1/autocomplete?text=${encodeURIComponent(
          text
        )}&api_key=${STADIA_KEY}`
      );
      const data = await res.json();
      if (data.features) {
        setResults(data.features);
        setIsOpen(true);
      }
    } catch (err) {
      console.error("Geocoding search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (val.trim()) {
      timeoutRef.current = setTimeout(() => {
        searchPlaces(val);
      }, 300);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (feature: any) => {
    setQuery(feature.properties.label || feature.properties.name);
    setIsOpen(false);
    
    if (feature.geometry && feature.geometry.coordinates) {
      const [lon, lat] = feature.geometry.coordinates;
      
      // If parent wants to handle it
      if (onLocationSelect) {
        onLocationSelect(lon, lat);
      }
      
      // If we have map context, fly to it
      if (map) {
        map.flyTo({
          center: [lon, lat],
          zoom: 14,
          duration: 2000,
          essential: true,
        });
      }
    }
  };

  return (
    <div ref={wrapperRef} className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-4">
      <div className="relative">
        <div className="flex items-center bg-black/80 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden shadow-xl">
          <div className="pl-3 text-white/50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search places..."
            className="w-full bg-transparent border-none text-white px-3 py-2.5 focus:outline-none focus:ring-0 text-sm placeholder-white/40"
          />
          {loading && (
            <div className="pr-3 text-white/50">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
          )}
          {query && !loading && (
            <button 
              onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
              className="pr-3 text-white/50 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto">
            {results.map((feature, i) => (
              <button
                key={i}
                onClick={() => handleSelect(feature)}
                className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 flex flex-col gap-0.5"
              >
                <span className="text-white text-sm font-medium">
                  {feature.properties.name}
                </span>
                <span className="text-white/50 text-xs truncate">
                  {feature.properties.label || [feature.properties.region, feature.properties.country].filter(Boolean).join(", ")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
