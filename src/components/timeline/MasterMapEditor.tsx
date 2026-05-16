"use client";

import { useRef, useState, useCallback, memo, useMemo, useEffect } from 'react';
import Map, { NavigationControl, MapRef, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapSearchBar from './MapSearchBar';
import BaseMapSwitcher, { MapStyleType, getMapStyle } from './BaseMapSwitcher';

type DrawMode = 'select' | 'point' | 'linestring' | 'polygon' | 'delete';

interface StoredFeature {
  id: string;
  geoType: 'Point' | 'LineString' | 'Polygon';
  coords: any;
  props?: Record<string, any>;
}

interface MasterMapEditorProps {
  initialData?: any;
  onChange: (data: any) => void;
  onDeleteFeature?: (featureId: string) => void;
  selectedFeatureId?: string | null;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function toGeoJson(list: StoredFeature[]) {
  return {
    type: 'FeatureCollection',
    features: list.map(f => ({
      type: 'Feature',
      id: f.id,
      geometry: { type: f.geoType, coordinates: f.coords },
      properties: { ...(f.props ?? {}), __id: f.id },
    })),
  };
}

function MasterMapEditor({ initialData, onChange, onDeleteFeature, selectedFeatureId }: MasterMapEditorProps) {
  const mapRef = useRef<MapRef>(null);
  const [activeTool, setActiveTool] = useState<DrawMode>('select');
  const [mapStyleType, setMapStyleType] = useState<MapStyleType>('dark');

  const [features, setFeatures] = useState<StoredFeature[]>(() => {
    if (!initialData?.features) return [];
    return initialData.features.map((f: any) => ({
      id: f.id ?? uid(),
      geoType: f.geometry.type,
      coords: f.geometry.coordinates,
      props: f.properties ?? {},
    }));
  });

  useEffect(() => {
    if (initialData?.features) {
      setFeatures(initialData.features.map((f: any) => ({
        id: f.id ?? uid(),
        geoType: f.geometry.type,
        coords: f.geometry.coordinates,
        props: f.properties ?? {},
      })));
    }
  }, [initialData]);

  const [wip, setWip] = useState<[number, number][]>([]);

  const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_MAPS_KEY;
  const mapStyle = useMemo(() => getMapStyle(mapStyleType, STADIA_KEY), [mapStyleType, STADIA_KEY]);

  // emit is always called OUTSIDE a setState updater — never inside one.
  // Calling onChange (which does setMasterGeoJson in the parent) inside a
  // setState updater triggers "setState during render" in React.
  const emit = useCallback((next: StoredFeature[]) => {
    onChange(toGeoJson(next));
  }, [onChange]);

  const onMapClick = useCallback((e: any) => {
    if (activeTool === 'select') return;
    const { lng, lat } = e.lngLat;

    if (activeTool === 'delete') {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const screenPoint = map.project([lng, lat]);
      const T = 12;
      const bbox = [
        [screenPoint.x - T, screenPoint.y - T],
        [screenPoint.x + T, screenPoint.y + T],
      ] as [[number, number], [number, number]];

      const hits = map.queryRenderedFeatures(bbox, {
        layers: ['d-poly-fill', 'd-poly-line', 'd-point'],
      });

      // __id is stored in properties; GeoJSON feature id is also available as hit.id
      const hit = hits.find(h => {
        const pid = h.properties?.__id;
        const fid = String(h.id ?? '');
        return (pid && pid !== '__wip_line') || (fid && fid !== '__wip_line' && fid !== '');
      });

      if (!hit) return;
      const hitId = String(hit.properties?.__id || hit.id);

      // ✅ Correct pattern: compute next state, then call emit separately
      setFeatures(prev => {
        const next = prev.filter(f => f.id !== hitId);
        // Use setTimeout to push emit after React finishes this render cycle
        setTimeout(() => emit(next), 0);
        return next;
      });
      onDeleteFeature?.(hitId);
      return;
    }

    if (activeTool === 'point') {
      const f: StoredFeature = { id: uid(), geoType: 'Point', coords: [lng, lat], props: {} };
      setFeatures(prev => {
        const next = [...prev, f];
        setTimeout(() => emit(next), 0);
        return next;
      });
      return;
    }

    setWip(prev => [...prev, [lng, lat]]);
  }, [activeTool, emit, onDeleteFeature]);

  const onMapDblClick = useCallback((e: any) => {
    e.preventDefault();
    if (activeTool === 'linestring' && wip.length >= 2) {
      const f: StoredFeature = { id: uid(), geoType: 'LineString', coords: wip, props: {} };
      setFeatures(prev => {
        const next = [...prev, f];
        setTimeout(() => emit(next), 0);
        return next;
      });
      setWip([]);
    } else if (activeTool === 'polygon' && wip.length >= 3) {
      const f: StoredFeature = { id: uid(), geoType: 'Polygon', coords: [[...wip, wip[0]]], props: {} };
      setFeatures(prev => {
        const next = [...prev, f];
        setTimeout(() => emit(next), 0);
        return next;
      });
      setWip([]);
    }
  }, [activeTool, wip, emit]);

  const selectTool = (tool: DrawMode) => {
    setActiveTool(tool);
    setWip([]);
  };

  const onMapLoad = useCallback(() => {
    if (!selectedFeatureId || !mapRef.current) return;
    const f = features.find(x => x.id === selectedFeatureId);
    if (!f) return;
    let c: any = null;
    if (f.geoType === 'Point') c = f.coords;
    else if (f.geoType === 'LineString') c = f.coords[0];
    else if (f.geoType === 'Polygon') c = f.coords[0][0];
    if (c) mapRef.current.easeTo({ center: c, zoom: 12, duration: 1000 });
  }, [selectedFeatureId, features]);

  if (!STADIA_KEY) return (
    <div className="p-10 flex items-center justify-center h-full bg-black">
      <p className="text-rose-500 font-black text-xs uppercase tracking-widest">Stadia Maps Key Missing</p>
    </div>
  );

  const wipGeoJson: any = {
    type: 'FeatureCollection',
    features: [
      ...features.map(f => ({
        type: 'Feature',
        id: f.id,
        geometry: { type: f.geoType, coordinates: f.coords },
        properties: { ...(f.props ?? {}), __id: f.id },
      })),
      ...(wip.length >= 2 && (activeTool === 'linestring' || activeTool === 'polygon') ? [{
        type: 'Feature',
        id: '__wip_line',
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
      type: 'Feature',
      id: `v${i}`,
      geometry: { type: 'Point', coordinates: c },
      properties: {},
    })),
  };

  const isDeleteMode = activeTool === 'delete';

  const tools: { id: DrawMode; label: string; hint: string; icon: React.ReactNode }[] = [
    {
      id: 'select', label: 'Select', hint: 'Pan and inspect the map',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>,
    },
    {
      id: 'point', label: 'Point', hint: 'Click to place a point',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      id: 'linestring', label: 'Line', hint: 'Click · Double-click to finish',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20L20 4" /></svg>,
    },
    {
      id: 'polygon', label: 'Polygon', hint: 'Click · Double-click to close',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" /></svg>,
    },
    {
      id: 'delete', label: 'Delete', hint: 'Click a feature to remove it',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    },
  ];

  const getToolClass = (toolId: DrawMode, isActive: boolean) => {
    if (toolId === 'delete') {
      return isActive
        ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30'
        : 'text-rose-400/50 hover:bg-rose-500/10 hover:text-rose-400';
    }
    return isActive
      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
      : 'text-white/40 hover:bg-white/10 hover:text-white';
  };

  return (
    <div className="w-full h-full relative bg-black">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 77.0, latitude: 21.0, zoom: 4 }}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        cursor={activeTool === 'select' ? 'grab' : activeTool === 'delete' ? 'pointer' : 'crosshair'}
        onClick={onMapClick}
        onDblClick={onMapDblClick}
        doubleClickZoom={false}
        onLoad={onMapLoad}
      >
        <MapSearchBar />
        <BaseMapSwitcher currentStyle={mapStyleType} onStyleChange={setMapStyleType} />
        <NavigationControl position="bottom-right" />

        <Source id="draw" type="geojson" data={wipGeoJson}>
          <Layer
            id="d-poly-fill"
            type="fill"
            filter={['all', ['==', ['geometry-type'], 'Polygon'], ['!=', ['get', '__preview'], true]]}
            paint={{ 'fill-color': isDeleteMode ? '#f43f5e' : '#6366f1', 'fill-opacity': 0.2 }}
          />
          <Layer
            id="d-poly-fill-preview"
            type="fill"
            filter={['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', '__preview'], true]]}
            paint={{ 'fill-color': '#6366f1', 'fill-opacity': 0.1 }}
          />
          <Layer
            id="d-poly-line"
            type="line"
            filter={['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'LineString']]}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': ['case',
                ['==', ['get', '__preview'], true], '#fbbf24',
                isDeleteMode ? '#f43f5e' : '#6366f1',
              ],
              'line-width': 2,
            }}
          />
          <Layer
            id="d-point"
            type="circle"
            filter={['==', ['geometry-type'], 'Point']}
            paint={{
              'circle-radius': 6,
              'circle-color': isDeleteMode ? '#f43f5e' : '#6366f1',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff',
            }}
          />
        </Source>

        <Source id="draw-wip" type="geojson" data={wipVertexGeoJson}>
          <Layer
            id="d-vertex"
            type="circle"
            paint={{ 'circle-radius': 5, 'circle-color': '#fbbf24', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }}
          />
        </Source>
      </Map>

      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <div className="bg-[#111]/90 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 flex flex-col gap-1 shadow-2xl">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => selectTool(t.id)}
              title={t.label}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${getToolClass(t.id, activeTool === t.id)}`}
            >
              {t.icon}
            </button>
          ))}
          <div className="w-full h-px bg-white/10 mx-auto my-0.5" />
          <button
            onClick={() => setWip([])}
            title="Cancel current shape"
            disabled={wip.length === 0}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-amber-400/50 hover:bg-amber-500/10 hover:text-amber-400 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tool hint */}
      <div className="absolute top-4 left-20 z-[1000] pointer-events-none">
        <div className={`backdrop-blur-sm border px-3 py-2 rounded-xl transition-colors ${isDeleteMode ? 'bg-rose-950/60 border-rose-500/20' : 'bg-black/60 border-white/10'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest ${isDeleteMode ? 'text-rose-400' : 'text-white/50'}`}>
            {tools.find(t => t.id === activeTool)?.label}
          </p>
          <p className="text-[9px] text-white/25 mt-0.5">
            {tools.find(t => t.id === activeTool)?.hint}
          </p>
          {wip.length > 0 && (
            <p className="text-[9px] text-amber-400/60 mt-1">
              {wip.length} point{wip.length !== 1 ? 's' : ''} · double-click to finish
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(MasterMapEditor);