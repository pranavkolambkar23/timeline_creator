"use client";

import { useMemo, useState, useRef, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl, Popup, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface FullMapViewProps {
  events: any[];
}

export default function FullMapView({ events }: FullMapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<{eventId: string, lngLat: [number, number]} | null>(null);
  const [cursor, setCursor] = useState('grab');
  
  // GIS Layer Management State
  const eventsWithLocation = useMemo(() => events.filter(e => e.locationData), [events]);
  const [visibleEvents, setVisibleEvents] = useState<string[]>(
    eventsWithLocation.map(e => e.id)
  );
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(true);

  const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_MAPS_KEY;
  const mapStyle = `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json?api_key=${STADIA_KEY}`;

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

  // Click Handler
  const onClick = useCallback((event: any) => {
    const feature = event.features && event.features[0];
    if (feature && feature.properties.eventId) {
      setPopupInfo({
        eventId: feature.properties.eventId,
        lngLat: [event.lngLat.lng, event.lngLat.lat]
      });
      
      mapRef.current?.flyTo({
        center: [event.lngLat.lng, event.lngLat.lat],
        duration: 800,
        essential: true
      });
    } else {
      setPopupInfo(null);
    }
  }, []);

  const toggleLayer = (id: string) => {
    setVisibleEvents(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
    // If we hide the currently selected item, close the popup
    if (popupInfo && popupInfo.eventId === id) {
      setPopupInfo(null);
    }
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
    <div className="w-full h-[800px] rounded-b-xl overflow-hidden relative shadow-[0_0_40px_-15px_rgba(139,92,246,0.2)] bg-black border-x border-b border-foreground/5">
      
      {/* GIS LAYER CONTROL PANEL */}
      <div className={`absolute top-6 left-6 z-20 flex flex-col transition-all duration-300 ${isLayerPanelOpen ? 'w-80' : 'w-14'}`}>
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
            <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-hide">
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
                      onClick={() => {
                        // If they click the layer name, pan to it and show popup (if visible)
                        if (isVisible) {
                          const f = geoJsonData.features.find((feat: any) => feat.properties.eventId === event.id);
                          if (f) {
                            let c: [number, number] | null = null;
                            if (f.geometry.type === 'Point') c = f.geometry.coordinates;
                            else if (f.geometry.type === 'LineString') c = f.geometry.coordinates[0];
                            else if (f.geometry.type === 'Polygon') c = f.geometry.coordinates[0][0];
                            
                            if (c) {
                              setPopupInfo({ eventId: event.id, lngLat: c });
                              mapRef.current?.flyTo({ center: c, zoom: 6, duration: 1000 });
                            }
                          }
                        }
                      }}
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
        cursor={cursor}
        scrollZoom={true}
      >
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
              'circle-radius': hasSelection ? ['case', isTargetEvent, 8, 4] : 6,
              'circle-color': hasSelection ? ['case', isTargetEvent, '#c084fc', '#6b7280'] : '#c084fc',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#111827'
            } as any)}
          />
        </Source>

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
