"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useRef, useState, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl, MapRef, Popup, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import BaseMapSwitcher, { MapStyleType, getMapStyle } from './BaseMapSwitcher';

interface GlobalMapProps {
  events: any[];
  activeEventId?: string | null;
  flyToLocation?: { longitude: number; latitude: number; zoom?: number; requestId: number } | null;
  onEventClick?: (eventId: string) => void;
  onMapInteract?: () => void;
  onAddToCollection?: (eventId: string) => void;
  canAddToCollection?: boolean;
}

export default function GlobalMap({ events, activeEventId, flyToLocation, onEventClick, onMapInteract, onAddToCollection, canAddToCollection = false }: GlobalMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapStyleType, setMapStyleType] = useState<MapStyleType>('dark');
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [viewState, setViewState] = useState({ longitude: 0, latitude: 20, zoom: 2 });

  const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_MAPS_KEY;
  const mapStyle = useMemo(() => getMapStyle(mapStyleType, STADIA_KEY), [mapStyleType, STADIA_KEY]);

  const moveMap = (coordinates: [number, number], zoom: number, duration: number) => {
    mapRef.current?.getMap().stop().easeTo({
      center: coordinates,
      zoom,
      duration,
      essential: true
    });
  };

  const geoJsonData = useMemo<any>(() => {
    const features: any[] = [];

    events.forEach(event => {
      if (!event.locationData) return;
      const data = event.locationData;

      const rawFeatures: any[] =
        data.type === 'FeatureCollection' && Array.isArray(data.features)
          ? data.features
          : data.type === 'Feature'
          ? [data]
          : [];

      rawFeatures.forEach((f: any) => {
        if (f.geometry) {
            features.push({
                type: 'Feature',
                geometry: f.geometry,
                properties: {
                    eventId: event.id,
                    timelineTitle: event.timeline?.title || 'Unknown Timeline',
                    title: event.title,
                    date: event.date,
                    isPoint: f.geometry.type === 'Point'
                }
            });
        }
      });
    });

    return { type: 'FeatureCollection', features };
  }, [events]);

  const activeEventCoordinates = useMemo<[number, number] | null>(() => {
    if (!activeEventId) return null;
    const event = events.find(e => e.id === activeEventId);
    if (!event?.locationData) return null;
    const data = event.locationData;
    const rawFeatures: any[] =
      data.type === 'FeatureCollection' && Array.isArray(data.features)
        ? data.features
        : data.type === 'Feature'
        ? [data]
        : [];
    const geometry = rawFeatures[0]?.geometry;
    if (geometry?.type === 'Point') return geometry.coordinates;
    if (geometry?.type === 'LineString') return geometry.coordinates?.[0] ?? null;
    if (geometry?.type === 'Polygon') return geometry.coordinates?.[0]?.[0] ?? null;
    return null;
  }, [activeEventId, events]);

  useEffect(() => {
    if (activeEventId && mapRef.current && isMapReady) {
        const event = events.find(e => e.id === activeEventId);
        if (event?.locationData) {
            // Find coords to fly to
            let coords: [number, number] | null = null;
            const data = event.locationData;
            const rawFeatures: any[] = data.type === 'FeatureCollection' ? data.features : data.type === 'Feature' ? [data] : [];
            
            if (rawFeatures.length > 0) {
                const geom = rawFeatures[0].geometry;
                if (geom.type === 'Point') coords = geom.coordinates;
                else if (geom.type === 'LineString') coords = geom.coordinates[0];
                else if (geom.type === 'Polygon') coords = geom.coordinates[0][0];
            }

            if (coords) {
                moveMap(coords, 6, 1500);
            }
        }
    }
  }, [activeEventId, events, isMapReady]);

  useEffect(() => {
    if (!flyToLocation || !mapRef.current || !isMapReady) return;
    moveMap([flyToLocation.longitude, flyToLocation.latitude], flyToLocation.zoom ?? 12, 1800);
  }, [flyToLocation, isMapReady]);


  if (!STADIA_KEY) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#080808] text-center p-6">
        <h3 className="text-xl font-bold text-white mb-2">Map Configuration Missing</h3>
        <code className="bg-black/50 p-3 rounded-lg text-emerald-400 border border-white/10 text-sm block">
          NEXT_PUBLIC_STADIA_MAPS_KEY=your_key_here
        </code>
      </div>
    );
  }

  // --- Map Layer Styles ---
  
  // Point Clustering
  const clusterLayer = {
    id: 'clusters',
    type: 'circle',
    source: 'global-events',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': ['step', ['get', 'point_count'], '#8b5cf6', 10, '#6366f1', 50, '#ec4899'],
      'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 25],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  } as any;

  const clusterCountLayer = {
    id: 'cluster-count',
    type: 'symbol',
    source: 'global-events',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['Noto Sans Bold'],
      'text-size': 12
    },
    paint: {
      'text-color': '#ffffff'
    }
  } as any;

  // Unclustered Points
  const unclusteredPointLayer = {
    id: 'unclustered-point',
    type: 'circle',
    source: 'global-events',
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['geometry-type'], 'Point']],
    paint: {
      'circle-color': '#38bdf8',
      'circle-radius': 6,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff'
    }
  } as any;

  // Polygons
  const polygonFillLayer = {
      id: 'polygons-fill',
      type: 'fill',
      source: 'global-events',
      filter: ['!', ['has', 'point_count']],
      paint: {
          'fill-color': '#8b5cf6',
          'fill-opacity': 0.15,
      }
  } as any;

  const polygonLineLayer = {
      id: 'polygons-line',
      type: 'line',
      source: 'global-events',
      filter: ['!', ['has', 'point_count']],
      paint: {
          'line-color': '#8b5cf6',
          'line-width': 2,
      }
  } as any;

  // Lines
  const lineLayer = {
      id: 'lines',
      type: 'line',
      source: 'global-events',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['geometry-type'], 'LineString']],
      paint: {
          'line-color': '#38bdf8',
          'line-width': 3,
          'line-dasharray': [2, 2],
      }
  } as any;


  const onClick = (e: any) => {
    if (!mapRef.current) return;
    
    const feature = e.features?.[0];
    if (!feature) {
        onMapInteract?.();
        setHoverInfo(null);
        return;
    }

    if (feature.layer.id === 'clusters') {
      const clusterId = feature.properties.cluster_id;
      const mapboxSource = mapRef.current.getSource('global-events') as any;

      mapboxSource.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return;
        mapRef.current?.easeTo({
          center: feature.geometry.coordinates,
          zoom: zoom + 1,
          duration: 500
        });
      });
      setHoverInfo(null);
    } else if (['unclustered-point', 'polygons-fill', 'lines'].includes(feature.layer.id)) {
        
        let coords: [number, number] | null = null;
        if (feature.geometry.type === 'Point') coords = feature.geometry.coordinates;
        else if (e.lngLat) coords = [e.lngLat.lng, e.lngLat.lat]; // Use click location for polygons/lines

        if (coords) {
            moveMap(coords, 6, 1200);

            // Find the full event to get the description
            const fullEvent = events.find(ev => ev.id === feature.properties.eventId);
            
            setHoverInfo({
                longitude: coords[0],
                latitude: coords[1],
                title: feature.properties.title,
                timelineTitle: feature.properties.timelineTitle,
                eventId: feature.properties.eventId,
                date: new Date(feature.properties.date).getFullYear(),
                description: fullEvent?.description || "No description available."
            });
            
            if (onEventClick && feature.properties.eventId) {
                onEventClick(feature.properties.eventId);
            }
        }
    }
  };

  return (
    <div className="w-full h-full relative bg-[#080808]">
      <Map
        ref={mapRef}
        {...viewState}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['clusters', 'unclustered-point', 'polygons-fill', 'lines']}
        onClick={onClick}
        onMove={(event) => setViewState(event.viewState)}
        onDragStart={onMapInteract}
        onZoomStart={onMapInteract}
        onRotateStart={onMapInteract}
        onPitchStart={onMapInteract}
        onLoad={() => setIsMapReady(true)}
        cursor="pointer"
      >
        <BaseMapSwitcher currentStyle={mapStyleType} onStyleChange={setMapStyleType} />
        <NavigationControl position="bottom-right" style={{ marginRight: '16px', marginBottom: '16px' }} />

        <Source
          id="global-events"
          type="geojson"
          data={geoJsonData}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer {...polygonFillLayer} />
          <Layer {...polygonLineLayer} />
          <Layer {...lineLayer} />

          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredPointLayer} />
        </Source>

        {hoverInfo && (
          <Popup
            longitude={hoverInfo.longitude}
            latitude={hoverInfo.latitude}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={15}
            className="universe-popup z-50"
          >
            <div className="bg-[#060606]/95 backdrop-blur-xl p-4 rounded-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-[280px]">
              <div className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest mb-2 flex justify-between">
                <span className="truncate pr-2">{hoverInfo.timelineTitle}</span>
                <span className="whitespace-nowrap">{hoverInfo.date < 0 ? `${Math.abs(hoverInfo.date)} BC` : hoverInfo.date}</span>
              </div>
              <h4 className="text-white font-bold text-base leading-tight mb-2">{hoverInfo.title}</h4>
              
              <div className="max-h-32 overflow-y-auto mb-3 pr-2 text-xs text-white/70 font-mono" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                  {hoverInfo.description}
              </div>

              <div className="flex gap-2">
                  {canAddToCollection && <button
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-[10px] uppercase tracking-widest text-white rounded-lg transition-colors font-bold shadow-lg shadow-indigo-500/20"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddToCollection?.(hoverInfo.eventId);
                    }}
                  >
                      + Add to Collection
                  </button>}
                  <button 
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg transition-colors border border-white/5"
                    onClick={(e) => {
                        e.stopPropagation();
                        setHoverInfo(null);
                    }}
                    title="Close"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  </button>
              </div>
            </div>
          </Popup>
        )}

        {activeEventCoordinates && (
          <Marker longitude={activeEventCoordinates[0]} latitude={activeEventCoordinates[1]} anchor="bottom">
            <div className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)] md:hidden">
              <svg className="h-9 w-9" viewBox="0 0 32 40" fill="none">
                <path d="M16 39C16 39 30 25.5 30 14.8C30 6.63 23.73 1 16 1C8.27 1 2 6.63 2 14.8C2 25.5 16 39 16 39Z" fill="#6366F1" stroke="#111827" strokeWidth="2.5" />
                <circle cx="16" cy="15" r="5" fill="#F8FAFC" />
              </svg>
            </div>
          </Marker>
        )}
      </Map>

      {/* Global override for mapbox popup background to be transparent so our custom div styles work */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) {
            .universe-popup {
                display: none !important;
            }
        }
        .universe-popup .maplibregl-popup-content {
            background: transparent !important;
            padding: 0 !important;
            box-shadow: none !important;
        }
        .universe-popup .maplibregl-popup-tip {
            border-top-color: rgba(6, 6, 6, 0.9) !important;
        }
      `}} />
    </div>
  );
}
