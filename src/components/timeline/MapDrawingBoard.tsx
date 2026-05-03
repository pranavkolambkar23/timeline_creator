"use client";

import { useRef, useState, useCallback, useMemo } from 'react';
import Map, { NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapSearchBar from './MapSearchBar';
import BaseMapSwitcher, { MapStyleType, getMapStyle } from './BaseMapSwitcher';

type DrawMode = 'select' | 'point' | 'linestring' | 'polygon';

interface StoredFeature {
  id: string;
  geoType: 'Point' | 'LineString' | 'Polygon';
  coords: any;
  props?: Record<string, any>;
}

interface MapDrawingBoardProps {
  initialData?: any;
  onChange: (data: any) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function MapDrawingBoard({ initialData, onChange }: MapDrawingBoardProps) {
  const [activeTool, setActiveTool] = useState<DrawMode>('point');
  const [features, setFeatures] = useState<StoredFeature[]>(() => {
    if (!initialData?.features) return [];
    return initialData.features.map((f: any) => ({
      id: f.id ?? uid(),
      geoType: f.geometry.type,
      coords: f.geometry.coordinates,
      props: f.properties ?? {},
    }));
  });
  const [wip, setWip] = useState<[number, number][]>([]);

  const [mapStyleType, setMapStyleType] = useState<MapStyleType>('dark');
  const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_MAPS_KEY;
  const mapStyle = useMemo(() => getMapStyle(mapStyleType, STADIA_KEY), [mapStyleType, STADIA_KEY]);

  const emit = useCallback((next: StoredFeature[]) => {
    onChange({
      type: 'FeatureCollection',
      features: next.map(f => ({
        type: 'Feature', id: f.id,
        geometry: { type: f.geoType, coordinates: f.coords },
        properties: f.props ?? {},
      })),
    });
  }, [onChange]);

  const onMapClick = useCallback((e: any) => {
    if (activeTool === 'select') return;
    const { lng, lat } = e.lngLat;

    if (activeTool === 'point') {
      const f: StoredFeature = { id: uid(), geoType: 'Point', coords: [lng, lat], props: {} };
      setFeatures(prev => { const n = [...prev, f]; emit(n); return n; });
      return;
    }
    setWip(prev => [...prev, [lng, lat]]);
  }, [activeTool, emit]);

  const onMapDblClick = useCallback((e: any) => {
    e.preventDefault();
    if (activeTool === 'linestring' && wip.length >= 2) {
      const f: StoredFeature = { id: uid(), geoType: 'LineString', coords: wip, props: {} };
      setFeatures(prev => { const n = [...prev, f]; emit(n); return n; });
      setWip([]);
    } else if (activeTool === 'polygon' && wip.length >= 3) {
      const f: StoredFeature = { id: uid(), geoType: 'Polygon', coords: [[...wip, wip[0]]], props: {} };
      setFeatures(prev => { const n = [...prev, f]; emit(n); return n; });
      setWip([]);
    }
  }, [activeTool, wip, emit]);

  const selectTool = (tool: DrawMode) => { setActiveTool(tool); setWip([]); };

  if (!STADIA_KEY) return (
    <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl text-xs font-bold">
      Stadia Maps Key Missing
    </div>
  );

  const allGeoJson: any = {
    type: 'FeatureCollection',
    features: [
      ...features.map(f => ({
        type: 'Feature', id: f.id,
        geometry: { type: f.geoType, coordinates: f.coords },
        properties: f.props ?? {},
      })),
      ...(wip.length >= 2 ? [{
        type: 'Feature', id: '__wip',
        geometry: {
          type: activeTool === 'polygon' ? 'Polygon' : 'LineString',
          coordinates: activeTool === 'polygon' ? [[...wip, wip[0]]] : wip,
        },
        properties: { __preview: true },
      }] : []),
    ],
  };

  const wipVertexGeoJson: any = {
    type: 'FeatureCollection',
    features: wip.map((c, i) => ({
      type: 'Feature', id: `v${i}`,
      geometry: { type: 'Point', coordinates: c },
      properties: {},
    })),
  };

  const tools: { id: DrawMode; label: string; hint: string; icon: React.ReactNode }[] = [
    {
      id: 'select', label: 'Select', hint: 'Pan & inspect',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>,
    },
    {
      id: 'point', label: 'Point', hint: 'Click to place',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      id: 'linestring', label: 'Line', hint: 'Click · Dbl-click finish',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20L20 4" /></svg>,
    },
    {
      id: 'polygon', label: 'Area', hint: 'Click · Dbl-click close',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" /></svg>,
    },
  ];

  return (
    <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-foreground/10 relative">
      <Map
        initialViewState={{ longitude: 77.0, latitude: 21.0, zoom: 4 }}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        cursor={activeTool === 'select' ? 'grab' : 'crosshair'}
        onClick={onMapClick}
        onDblClick={onMapDblClick}
        doubleClickZoom={false}
      >
        <MapSearchBar />
        <BaseMapSwitcher currentStyle={mapStyleType} onStyleChange={setMapStyleType} />
        <NavigationControl position="bottom-right" />

        <Source id="draw" type="geojson" data={allGeoJson}>
          <Layer id="d-poly-fill" type="fill"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={{ 'fill-color': '#6366f1', 'fill-opacity': 0.15 }}
          />
          <Layer id="d-poly-line" type="line"
            filter={['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'LineString']]}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': ['case', ['==', ['get', '__preview'], true], '#fbbf24', '#6366f1'],
              'line-width': 2,
            }}
          />
          <Layer id="d-point" type="circle"
            filter={['==', ['geometry-type'], 'Point']}
            paint={{ 'circle-radius': 6, 'circle-color': '#6366f1', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }}
          />
        </Source>

        <Source id="draw-wip" type="geojson" data={wipVertexGeoJson}>
          <Layer id="d-vertex" type="circle"
            paint={{ 'circle-radius': 5, 'circle-color': '#fbbf24', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }}
          />
        </Source>
      </Map>

      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-[1000]">
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-1 flex flex-col gap-1 shadow-xl">
          {tools.map(t => (
            <button key={t.id} onClick={() => selectTool(t.id)} title={`${t.label}: ${t.hint}`}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${
                activeTool === t.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-white/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t.icon}
            </button>
          ))}
          {wip.length > 0 && (
            <>
              <div className="w-full h-px bg-white/10 my-0.5" />
              <button onClick={() => setWip([])} title="Cancel shape"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-amber-400/60 hover:bg-amber-500/10 hover:text-amber-400 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status hint */}
      <div className="absolute top-3 left-14 z-[1000] pointer-events-none">
        <div className="bg-background/80 backdrop-blur-md border border-foreground/10 p-2.5 rounded-xl shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">GIS Studio</p>
          <p className="text-[9px] font-medium text-foreground/20 leading-tight mt-1">
            {tools.find(t => t.id === activeTool)?.hint ?? ''}
          </p>
          {wip.length > 0 && (
            <p className="text-[9px] text-amber-500/60 mt-1">{wip.length} pts · dbl-click to finish</p>
          )}
        </div>
      </div>
    </div>
  );
}
