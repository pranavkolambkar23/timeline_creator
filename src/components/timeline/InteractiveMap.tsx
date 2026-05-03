"use client";

import { useMemo, useRef, useEffect, useState } from 'react';
import Map, { Source, Layer, NavigationControl, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapSearchBar from './MapSearchBar';
import BaseMapSwitcher, { MapStyleType, getMapStyle } from './BaseMapSwitcher';

interface InteractiveMapProps {
  events: any[];
  activeEventId?: string | null;
}

interface FeatureEntry {
  feature: any;
  eventIds: Set<string>;
}

export default function InteractiveMap({ events, activeEventId }: InteractiveMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapStyleType, setMapStyleType] = useState<MapStyleType>('dark');

  const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_MAPS_KEY;
  const mapStyle = useMemo(() => getMapStyle(mapStyleType, STADIA_KEY), [mapStyleType, STADIA_KEY]);

  const geoJsonData = useMemo<any>(() => {
    const featureMap: Record<string, FeatureEntry> = {};

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
        const fid = String(f.id ?? `${event.id}_${Math.random().toString(36).slice(2)}`);
        if (fid in featureMap) {
          featureMap[fid].eventIds.add(event.id);
        } else {
          featureMap[fid] = {
            feature: { ...f, id: fid },
            eventIds: new Set<string>([event.id]),
          };
        }
      });
    });

    const features = Object.values(featureMap).map((entry) => ({
      ...entry.feature,
      properties: {
        ...(entry.feature.properties ?? {}),
        // Pipe-delimited so MapLibre 'in' expression can check membership
        // e.g. "|eventA|eventB|" contains "|eventA|" → true
        eventIds: `|${[...entry.eventIds].join('|')}|`,
      },
    }));

    return { type: 'FeatureCollection', features };
  }, [events]);

  useEffect(() => {
    if (!activeEventId || !mapRef.current) return;
    const event = events.find(e => e.id === activeEventId);
    if (!event?.locationData) return;

    let coords: [number, number] | null = null;
    try {
      const data = event.locationData;
      const rawFeatures: any[] =
        data.type === 'FeatureCollection' ? data.features :
        data.type === 'Feature' ? [data] : [];

      if (rawFeatures.length > 0) {
        const geom = rawFeatures[0].geometry;
        if (geom.type === 'Point') coords = geom.coordinates;
        else if (geom.type === 'LineString') coords = geom.coordinates[0];
        else if (geom.type === 'Polygon') coords = geom.coordinates[0][0];
      }
      if (coords) {
        mapRef.current.flyTo({ center: coords, zoom: 6, duration: 1500, essential: true });
      }
    } catch (err) {
      console.error('Error finding coordinates', err);
    }
  }, [activeEventId, events]);

  if (!STADIA_KEY) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 border border-purple-500/30 rounded-xl p-6 text-center shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-2">Map Configuration Missing</h3>
        <code className="bg-black p-3 rounded-lg text-green-400 border border-gray-700 w-full max-w-md text-left overflow-x-auto text-sm block">
          NEXT_PUBLIC_STADIA_MAPS_KEY=your_key_here
        </code>
      </div>
    );
  }

  const isActive: any = activeEventId
    ? ['in', `|${activeEventId}|`, ['get', 'eventIds']]
    : ['literal', false];

  return (
    <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-purple-500/20 relative shadow-[0_0_40px_-15px_rgba(139,92,246,0.3)] group">
      <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-xl z-10" />

      <Map
        ref={mapRef}
        initialViewState={{ longitude: 77.0, latitude: 21.0, zoom: 4, pitch: 0 }}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        scrollZoom={true}
      >
        <MapSearchBar />
        <BaseMapSwitcher currentStyle={mapStyleType} onStyleChange={setMapStyleType} />
        <NavigationControl position="bottom-right" style={{ marginRight: '16px', marginBottom: '16px' }} />

        <Source id="timeline-features" type="geojson" data={geoJsonData}>
          <Layer
            id="polygons-fill"
            type="fill"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={{
              'fill-color': ['case', isActive, '#8b5cf6', '#4b5563'],
              'fill-opacity': ['case', isActive, 0.25, 0.05],
            } as any}
          />
          <Layer
            id="polygons-line"
            type="line"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={{
              'line-color': ['case', isActive, '#8b5cf6', '#4b5563'],
              'line-width': ['case', isActive, 2, 1],
              'line-opacity': ['case', isActive, 0.9, 0.3],
            } as any}
          />
          <Layer
            id="lines"
            type="line"
            filter={['==', ['geometry-type'], 'LineString']}
            paint={{
              'line-color': ['case', isActive, '#38bdf8', '#4b5563'],
              'line-width': ['case', isActive, 4, 2],
              'line-dasharray': ['literal', [2, 2]],
              'line-opacity': ['case', isActive, 1, 0.2],
            } as any}
          />
          <Layer
            id="points-glow"
            type="circle"
            filter={['==', ['geometry-type'], 'Point']}
            paint={{
              'circle-radius': ['case', isActive, 18, 0],
              'circle-color': '#c084fc',
              'circle-opacity': 0.3,
              'circle-blur': 1,
            } as any}
          />
          <Layer
            id="points-core"
            type="circle"
            filter={['==', ['geometry-type'], 'Point']}
            paint={{
              'circle-radius': ['case', isActive, 7, 4],
              'circle-color': ['case', isActive, '#c084fc', '#6b7280'],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#111827',
            } as any}
          />
        </Source>
      </Map>
    </div>
  );
}