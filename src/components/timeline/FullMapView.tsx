"use client";

import { useMemo, useState, useRef, useCallback } from 'react';
import Map, { Source, Layer, Marker, NavigationControl, Popup, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapSearchBar from './MapSearchBar';
import BaseMapSwitcher, { MapStyleType, getMapStyle } from './BaseMapSwitcher';

interface FullMapViewProps {
  events: any[];
}

type MobileSheetSnap = 'low' | 'middle' | 'full';

const MOBILE_SHEET_HEIGHTS: Record<MobileSheetSnap, number> = {
  low: 16,
  middle: 50,
  full: 88,
};

export default function FullMapView({ events }: FullMapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mobileSheetGestureRef = useRef<{ startY: number; startTime: number } | null>(null);
  const mobileContentTouchRef = useRef<number | null>(null);
  const mobileSheetScrollRef = useRef<HTMLDivElement>(null);
  const [popupInfo, setPopupInfo] = useState<{eventId: string, lngLat: [number, number]} | null>(null);
  const [cursor, setCursor] = useState('grab');
  const [mobileSheetSnap, setMobileSheetSnap] = useState<MobileSheetSnap>('middle');
  const [mobileSheetHeight, setMobileSheetHeight] = useState(MOBILE_SHEET_HEIGHTS.middle);
  const [isMobileSheetDragging, setIsMobileSheetDragging] = useState(false);
  
  // GIS Layer Management State
  const eventsWithLocation = useMemo(() => events.filter(e => e.locationData), [events]);
  const [visibleEvents, setVisibleEvents] = useState<string[]>(
    eventsWithLocation.map(e => e.id)
  );
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(true);
  const [mapStyleType, setMapStyleType] = useState<MapStyleType>('dark');

  const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_MAPS_KEY;
  const mapStyle = useMemo(() => getMapStyle(mapStyleType, STADIA_KEY), [mapStyleType, STADIA_KEY]);

  const geoJsonData = useMemo<any>(() => {
    const features: any[] = [];
    events.forEach(event => {
      // Only render if the event has location data AND is currently toggled "on" in the layer panel
      if (event.locationData && visibleEvents.includes(event.id)) {
        const data = event.locationData;
        if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          features.push(...data.features.map((f: any) => ({
            ...f,
            properties: { ...f.properties, eventId: event.id, title: event.title }
          })));
        } else if (data.type === 'Feature') {
          features.push({
            ...data,
            properties: { ...data.properties, eventId: event.id, title: event.title }
          });
        }
      }
    });
    return { type: 'FeatureCollection', features };
  }, [events, visibleEvents]);

  const selectedEvent = useMemo(() => {
    if (!popupInfo) return null;
    return events.find(e => e.id === popupInfo.eventId);
  }, [popupInfo, events]);
  const isSelectedEventVisible = selectedEvent ? visibleEvents.includes(selectedEvent.id) : false;
  const selectedPointCoordinates = useMemo<[number, number][]>(() => {
    if (!selectedEvent) return [];

    const locationData = selectedEvent.locationData;
    const features =
      locationData?.type === 'FeatureCollection'
        ? locationData.features
        : locationData?.type === 'Feature'
          ? [locationData]
          : [];

    return features
      .filter((feature: any) => feature.geometry?.type === 'Point')
      .map((feature: any) => feature.geometry.coordinates);
  }, [selectedEvent]);

  const getFirstCoordinates = useCallback((locationData: any): [number, number] | null => {
    const firstFeature =
      locationData?.type === 'FeatureCollection'
        ? locationData.features?.[0]
        : locationData?.type === 'Feature'
          ? locationData
          : null;
    const geometry = firstFeature?.geometry;

    if (geometry?.type === 'Point') return geometry.coordinates;
    if (geometry?.type === 'LineString') return geometry.coordinates?.[0] ?? null;
    if (geometry?.type === 'Polygon') return geometry.coordinates?.[0]?.[0] ?? null;
    return null;
  }, []);

  const focusEvent = useCallback((event: any, mobileSnap: MobileSheetSnap = 'middle') => {
    const coordinates = getFirstCoordinates(event.locationData);
    if (!coordinates) return;

    setPopupInfo({ eventId: event.id, lngLat: coordinates });
    setMobileSheetSnap(mobileSnap);
    setMobileSheetHeight(MOBILE_SHEET_HEIGHTS[mobileSnap]);
    mapRef.current?.flyTo({ center: coordinates, zoom: 6, duration: 1000, essential: true });
  }, [getFirstCoordinates]);

  const resizeMobileSheet = (clientY: number) => {
    const container = mapContainerRef.current;
    if (!container) return;

    const { bottom, height } = container.getBoundingClientRect();
    const nextHeight = ((bottom - clientY) / height) * 100;
    setMobileSheetHeight(Math.min(Math.max(nextHeight, MOBILE_SHEET_HEIGHTS.low), MOBILE_SHEET_HEIGHTS.full));
  };

  const startMobileSheetGesture = (target: HTMLElement, pointerId: number, clientY: number) => {
    target.setPointerCapture(pointerId);
    setIsMobileSheetDragging(true);
    mobileSheetGestureRef.current = { startY: clientY, startTime: Date.now() };
    resizeMobileSheet(clientY);
  };

  const moveMobileSheetGesture = (target: HTMLElement, pointerId: number, clientY: number) => {
    if (target.hasPointerCapture(pointerId)) {
      resizeMobileSheet(clientY);
    }
  };

  const snapMobileSheet = (snap: MobileSheetSnap) => {
    setMobileSheetSnap(snap);
    setMobileSheetHeight(MOBILE_SHEET_HEIGHTS[snap]);
  };

  const finishMobileSheetGesture = (clientY: number) => {
    const gesture = mobileSheetGestureRef.current;
    if (!gesture) return;

    const distance = clientY - gesture.startY;
    const duration = Math.max(Date.now() - gesture.startTime, 1);
    const velocity = distance / duration;
    mobileSheetGestureRef.current = null;
    setIsMobileSheetDragging(false);

    if (velocity > 0.75 || distance > 120) {
      snapMobileSheet('low');
      return;
    }
    if (velocity < -0.75 || distance < -120) {
      snapMobileSheet('full');
      return;
    }

    const nearestSnap = (Object.entries(MOBILE_SHEET_HEIGHTS) as [MobileSheetSnap, number][])
      .reduce((nearest, candidate) =>
        Math.abs(candidate[1] - mobileSheetHeight) < Math.abs(nearest[1] - mobileSheetHeight)
          ? candidate
          : nearest
      )[0];
    snapMobileSheet(nearestSnap);
  };

  // Click Handler
  const onClick = useCallback((event: any) => {
    const feature = event.features && event.features[0];
    if (feature && feature.properties.eventId) {
      setPopupInfo({
        eventId: feature.properties.eventId,
        lngLat: [event.lngLat.lng, event.lngLat.lat]
      });
      setMobileSheetSnap('low');
      setMobileSheetHeight(MOBILE_SHEET_HEIGHTS.low);
      
      mapRef.current?.flyTo({
        center: [event.lngLat.lng, event.lngLat.lat],
        duration: 800,
        essential: true
      });
    } else {
      snapMobileSheet('low');
    }
  }, []);

  const toggleLayer = (id: string) => {
    setVisibleEvents(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const toggleAllLayers = () => {
    if (visibleEvents.length === eventsWithLocation.length) {
      setVisibleEvents([]);
      setPopupInfo(null);
    } else {
      setVisibleEvents(eventsWithLocation.map(e => e.id));
    }
  };

  const interactiveLayerIds = ['polygons-fill', 'lines', 'points-core'];

  if (!STADIA_KEY) {
    return (
      <div className="w-full h-[800px] flex items-center justify-center bg-gray-900 border border-purple-500/30 rounded-xl">
        <p className="text-white">Please add NEXT_PUBLIC_STADIA_MAPS_KEY to .env</p>
      </div>
    );
  }

  const hasSelection = !!popupInfo;
  const isTargetEvent = ['==', ['get', 'eventId'], popupInfo?.eventId || ''];

  return (
    <div ref={mapContainerRef} className="w-full h-full md:h-[800px] rounded-none md:rounded-b-xl overflow-hidden relative shadow-[0_0_40px_-15px_rgba(139,92,246,0.2)] bg-black border-x border-b border-foreground/5 [&_.maplibregl-ctrl-bottom-right]:hidden md:[&_.maplibregl-ctrl-bottom-right]:block">
      
      {/* GIS LAYER CONTROL PANEL */}
      <div className={`absolute top-6 left-6 z-20 hidden md:flex flex-col transition-all duration-300 ${isLayerPanelOpen ? 'w-80' : 'w-14'}`}>
        <div className="bg-background/80 backdrop-blur-xl border border-foreground/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          {/* Panel Header */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer bg-foreground/5 hover:bg-foreground/10 transition-colors"
            onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              {isLayerPanelOpen && <span className="font-black text-sm uppercase tracking-widest text-foreground">Spatial Layers</span>}
            </div>
            {isLayerPanelOpen && (
              <svg className="w-4 h-4 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </div>

          {/* Panel Content */}
          {isLayerPanelOpen && (
            <div className="custom-scrollbar p-2 max-h-[400px] overflow-y-auto">
              <div className="px-3 pb-2 pt-1 flex justify-between items-center border-b border-foreground/5 mb-2">
                <span className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider">
                  {visibleEvents.length} of {eventsWithLocation.length} Visible
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleAllLayers(); }}
                  className="text-[10px] uppercase font-bold text-indigo-400 hover:text-indigo-300"
                >
                  {visibleEvents.length === eventsWithLocation.length ? 'Hide All' : 'Show All'}
                </button>
              </div>
              
              <div className="flex flex-col gap-1">
                {eventsWithLocation.map(event => {
                  const isVisible = visibleEvents.includes(event.id);
                  const isSelected = popupInfo?.eventId === event.id;
                  
                  return (
                    <div 
                      key={event.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-pointer border ${
                        isSelected 
                          ? 'bg-purple-500/10 border-purple-500/30' 
                          : 'hover:bg-foreground/5 border-transparent'
                      }`}
                      onClick={() => focusEvent(event)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {/* Eye Toggle Button */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleLayer(event.id); }}
                          className={`p-1.5 rounded-md transition-colors ${isVisible ? 'text-green-400 hover:bg-green-400/10' : 'text-foreground/20 hover:bg-foreground/10'}`}
                        >
                          {isVisible ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          )}
                        </button>
                        
                        <div className="flex flex-col overflow-hidden">
                          <span className={`text-xs font-bold truncate ${isVisible ? 'text-foreground' : 'text-foreground/40'}`}>
                            {event.title}
                          </span>
                          <span className="text-[9px] text-foreground/40 uppercase tracking-wider truncate">
                            {event.displayDate}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Explorer Map bottom sheet */}
      <section
        className={`absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl border-t border-foreground/10 bg-background/95 shadow-[0_-16px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl md:hidden ${isMobileSheetDragging ? '' : 'transition-[height] duration-200'}`}
        style={{ height: `${mobileSheetHeight}%` }}
        aria-label="Explorer map controls"
      >
        <div
          role="separator"
          aria-label="Resize explorer map drawer"
          aria-orientation="horizontal"
          aria-valuemin={16}
          aria-valuemax={88}
          aria-valuenow={Math.round(mobileSheetHeight)}
          className="flex h-8 shrink-0 touch-none cursor-row-resize items-center justify-center"
          onPointerDown={(event) => {
            startMobileSheetGesture(event.currentTarget, event.pointerId, event.clientY);
          }}
          onPointerMove={(event) => {
            moveMobileSheetGesture(event.currentTarget, event.pointerId, event.clientY);
          }}
          onPointerUp={(event) => finishMobileSheetGesture(event.clientY)}
          onPointerCancel={(event) => finishMobileSheetGesture(event.clientY)}
        >
          <div className="flex h-6 w-14 items-center justify-center gap-1.5 rounded-lg border border-foreground/10 bg-card">
            <span className="h-1 w-1 rounded-full bg-foreground/40" />
            <span className="h-1 w-1 rounded-full bg-foreground/40" />
            <span className="h-1 w-1 rounded-full bg-foreground/40" />
          </div>
        </div>

        {selectedEvent ? (
          <div
            ref={mobileSheetScrollRef}
            className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onScroll={(event) => {
              if (mobileSheetSnap === 'middle' && event.currentTarget.scrollTop > 8) {
                snapMobileSheet('full');
              }
            }}
            onTouchStart={(event) => {
              mobileContentTouchRef.current = event.touches[0]?.clientY ?? null;
            }}
            onTouchEnd={(event) => {
              const touchEndY = event.changedTouches[0]?.clientY;
              const touchStartY = mobileContentTouchRef.current;
              mobileContentTouchRef.current = null;
              if (touchStartY === null || touchEndY === undefined) return;

              const distance = touchEndY - touchStartY;
              if (distance > 50 && event.currentTarget.scrollTop <= 0) {
                snapMobileSheet(mobileSheetSnap === 'full' ? 'middle' : 'low');
              } else if (distance < -50 && mobileSheetSnap === 'middle') {
                snapMobileSheet('full');
              }
            }}
          >
            <div
              className="mb-4 flex touch-none items-start justify-between gap-3"
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest('button')) return;
                startMobileSheetGesture(event.currentTarget, event.pointerId, event.clientY);
              }}
              onPointerMove={(event) => {
                moveMobileSheetGesture(event.currentTarget, event.pointerId, event.clientY);
              }}
              onPointerUp={(event) => finishMobileSheetGesture(event.clientY)}
              onPointerCancel={(event) => finishMobileSheetGesture(event.clientY)}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">{selectedEvent.displayDate}</p>
                <h2 className="mt-1 line-clamp-2 break-words text-lg font-black leading-tight text-foreground">{selectedEvent.title}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleLayer(selectedEvent.id)}
                  className={`rounded-lg bg-foreground/5 p-2 ${isSelectedEventVisible ? 'text-emerald-400' : 'text-foreground/35'}`}
                  aria-label={isSelectedEventVisible ? `Hide ${selectedEvent.title}` : `Show ${selectedEvent.title}`}
                >
                  {isSelectedEventVisible ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.2A10.7 10.7 0 0112 4c5 0 9.3 3.4 10.5 8a10.7 10.7 0 01-3 4.9M6.2 6.2A10.6 10.6 0 001.5 12c.7 2.5 2.4 4.6 4.6 6A10.8 10.8 0 0012 20c1.1 0 2.2-.2 3.2-.5" /></svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => focusEvent(selectedEvent, 'low')}
                  className="rounded-lg bg-foreground/5 p-2 text-purple-400"
                  aria-label={`Zoom to ${selectedEvent.title}`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s7-4.4 7-11a7 7 0 10-14 0c0 6.6 7 11 7 11z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPopupInfo(null);
                  }}
                  className="rounded-lg bg-foreground/5 p-2 text-foreground/60"
                  aria-label="Close selected event"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {mobileSheetSnap !== 'low' && (
              <p className="whitespace-pre-line text-sm font-medium leading-6 text-foreground/60">{selectedEvent.description}</p>
            )}
          </div>
        ) : (
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div
              className="mb-3 flex touch-none items-center justify-between px-1"
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest('button')) return;
                startMobileSheetGesture(event.currentTarget, event.pointerId, event.clientY);
              }}
              onPointerMove={(event) => {
                moveMobileSheetGesture(event.currentTarget, event.pointerId, event.clientY);
              }}
              onPointerUp={(event) => finishMobileSheetGesture(event.clientY)}
              onPointerCancel={(event) => finishMobileSheetGesture(event.clientY)}
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Explorer Map</p>
                <h2 className="mt-1 text-lg font-black text-foreground">Spatial Layers</h2>
              </div>
              <button
                type="button"
                onClick={toggleAllLayers}
                className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-purple-400"
              >
                {visibleEvents.length === eventsWithLocation.length ? 'Hide All' : 'Show All'}
              </button>
            </div>

            {mobileSheetSnap !== 'low' && (
            <>
              <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-wider text-foreground/35">
                {visibleEvents.length} of {eventsWithLocation.length} events visible
              </p>

              <div className="flex flex-col gap-2">
              {eventsWithLocation.map(event => {
                const isVisible = visibleEvents.includes(event.id);

                return (
                  <div key={event.id} className="flex items-center gap-2 rounded-2xl border border-foreground/10 bg-card/80 p-2">
                    <button
                      type="button"
                      onClick={() => toggleLayer(event.id)}
                      className={`rounded-xl p-2 ${isVisible ? 'text-emerald-400' : 'text-foreground/25'}`}
                      aria-label={isVisible ? `Hide ${event.title}` : `Show ${event.title}`}
                    >
                      {isVisible ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.2A10.7 10.7 0 0112 4c5 0 9.3 3.4 10.5 8a10.7 10.7 0 01-3 4.9M6.2 6.2A10.6 10.6 0 001.5 12c.7 2.5 2.4 4.6 4.6 6A10.8 10.8 0 0012 20c1.1 0 2.2-.2 3.2-.5" /></svg>
                      )}
                    </button>

                    <button type="button" onClick={() => focusEvent(event)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-bold text-foreground">{event.title}</span>
                      <span className="mt-1 block truncate text-[9px] font-black uppercase tracking-wider text-foreground/35">{event.displayDate}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => focusEvent(event, 'low')}
                      className="rounded-xl bg-foreground/5 p-2 text-purple-400"
                      aria-label={`Zoom to ${event.title}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s7-4.4 7-11a7 7 0 10-14 0c0 6.6 7 11 7 11z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    </button>
                  </div>
                );
              })}
              </div>
            </>
            )}
          </div>
        )}
      </section>

      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 77.0,
          latitude: 21.0,
          zoom: 4.5,
          pitch: 0,
        }}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        onClick={onClick}
        interactiveLayerIds={interactiveLayerIds}
        onMouseEnter={() => setCursor('pointer')}
        onMouseLeave={() => setCursor('grab')}
        onDragStart={() => snapMobileSheet('low')}
        cursor={cursor}
        scrollZoom={true}
      >
        <MapSearchBar />
        <BaseMapSwitcher currentStyle={mapStyleType} onStyleChange={setMapStyleType} />
        <NavigationControl position="bottom-right" style={{ marginRight: '16px', marginBottom: '16px' }} />

        {/* Polygons */}
        <Source id="event-polygons" type="geojson" data={geoJsonData}>
          <Layer 
            id="polygons-fill"
            type="fill"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={({
              'fill-color': '#8b5cf6',
              'fill-opacity': hasSelection 
                ? ['case', isTargetEvent, 0.4, 0.05] 
                : 0.15
            } as any)}
          />
          <Layer 
            id="polygons-line"
            type="line"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={({
              'line-color': '#8b5cf6',
              'line-width': hasSelection ? ['case', isTargetEvent, 3, 1] : 2,
              'line-opacity': hasSelection ? ['case', isTargetEvent, 1, 0.3] : 0.8
            } as any)}
          />
        </Source>

        {/* Lines */}
        <Source id="event-lines" type="geojson" data={geoJsonData}>
          <Layer 
            id="lines"
            type="line"
            filter={['==', ['geometry-type'], 'LineString']}
            paint={({
              'line-color': '#38bdf8',
              'line-width': hasSelection ? ['case', isTargetEvent, 5, 2] : 3,
              'line-dasharray': ['literal', [2, 2]],
              'line-opacity': hasSelection ? ['case', isTargetEvent, 1, 0.3] : 0.8
            } as any)}
          />
        </Source>

        {/* Points */}
        <Source id="event-points" type="geojson" data={geoJsonData}>
          {/* Glow */}
          <Layer 
            id="points-glow"
            type="circle"
            filter={['==', ['geometry-type'], 'Point']}
            paint={({
              'circle-radius': hasSelection ? ['case', isTargetEvent, 20, 0] : 14,
              'circle-color': '#c084fc',
              'circle-opacity': 0.3,
              'circle-blur': 1
            } as any)}
          />
          {/* Core */}
          <Layer 
            id="points-core"
            type="circle"
            filter={['==', ['geometry-type'], 'Point']}
            paint={({
              'circle-radius': hasSelection ? ['case', isTargetEvent, 0, 4] : 6,
              'circle-color': hasSelection ? ['case', isTargetEvent, '#c084fc', '#6b7280'] : '#c084fc',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#111827'
            } as any)}
          />
        </Source>

        {selectedPointCoordinates.map(([longitude, latitude], index) => (
          <Marker
            key={`${selectedEvent?.id}-${index}`}
            longitude={longitude}
            latitude={latitude}
            anchor="bottom"
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (selectedEvent) focusEvent(selectedEvent, 'low');
              }}
              className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
              aria-label={`Selected location for ${selectedEvent?.title}`}
            >
              <svg className="h-9 w-9" viewBox="0 0 32 40" fill="none">
                <path d="M16 39C16 39 30 25.5 30 14.8C30 6.63 23.73 1 16 1C8.27 1 2 6.63 2 14.8C2 25.5 16 39 16 39Z" fill="#A855F7" stroke="#111827" strokeWidth="2.5" />
                <circle cx="16" cy="15" r="5" fill="#F8FAFC" />
              </svg>
            </button>
          </Marker>
        ))}

        {/* Beautiful Map Popup */}
        {popupInfo && selectedEvent && (
          <Popup
            longitude={popupInfo.lngLat[0]}
            latitude={popupInfo.lngLat[1]}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={false}
            className="modern-map-popup z-50"
            maxWidth="320px"
          >
            <div className="bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-2xl p-5 shadow-2xl shadow-black/50 text-foreground overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
              
              <div className="text-[10px] font-black text-purple-400 tracking-[0.2em] uppercase mb-1">
                {selectedEvent.displayDate}
              </div>
              <h3 className="text-lg font-black mb-2 text-foreground leading-tight">
                {selectedEvent.title}
              </h3>
              <p className="text-sm text-foreground/60 leading-relaxed line-clamp-4">
                {selectedEvent.description}
              </p>

              <button 
                onClick={() => setPopupInfo(null)}
                className="mt-4 w-full py-2 bg-foreground/5 hover:bg-foreground/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Close
              </button>
            </div>
          </Popup>
        )}
      </Map>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) {
          .modern-map-popup {
            display: none !important;
          }
        }
        .modern-map-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .modern-map-popup .maplibregl-popup-tip {
          border-top-color: hsl(var(--background)) !important;
          opacity: 0.95;
        }
      `}} />
    </div>
  );
}
