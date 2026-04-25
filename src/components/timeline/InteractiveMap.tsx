"use client";

import { useMemo, useRef, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface InteractiveMapProps {
  events: any[]; // We'll refine this type later based on TimelineEvent
  activeEventId?: string | null;
}

export default function InteractiveMap({ events, activeEventId }: InteractiveMapProps) {
  const mapRef = useRef<MapRef>(null);

  // Free Stadia Maps dark theme (Alidade Smooth Dark)
  const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_MAPS_KEY;
  const mapStyle = `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json?api_key=${STADIA_KEY}`;

  // Process events to extract GeoJSON data
  const geoJsonData = useMemo<any>(() => {
    const features: any[] = [];
    
    events.forEach(event => {
      if (event.locationData) {
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

    return {
      type: 'FeatureCollection',
      features
    };
  }, [events]);

  // Fly to the active event's location when it changes
  useEffect(() => {
    if (!activeEventId || !mapRef.current) return;
    
    const event = events.find(e => e.id === activeEventId);
    if (!event || !event.locationData) return;

    let coords: [number, number] | null = null;
    
    try {
      const data = event.locationData;
      // Simple logic to extract the first coordinate of the active feature
      if (data.type === 'FeatureCollection' && data.features.length > 0) {
        const geom = data.features[0].geometry;
        if (geom.type === 'Point') coords = geom.coordinates;
        else if (geom.type === 'LineString') coords = geom.coordinates[0];
        else if (geom.type === 'Polygon') coords = geom.coordinates[0][0];
      } else if (data.type === 'Feature') {
        const geom = data.geometry;
        if (geom.type === 'Point') coords = geom.coordinates;
        else if (geom.type === 'LineString') coords = geom.coordinates[0];
        else if (geom.type === 'Polygon') coords = geom.coordinates[0][0];
      }
      
      if (coords) {
        mapRef.current.flyTo({
          center: coords,
          zoom: 6, // Dynamic zoom based on polygon size would be better later!
          duration: 1500, // Smooth cinematic fly
          essential: true
        });
      }
    } catch (err) {
      console.error("Error finding coordinates", err);
    }
  }, [activeEventId, events]);

  if (!STADIA_KEY) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 border border-purple-500/30 rounded-xl p-6 text-center shadow-lg">
        {/* ... existing missing key UI ... */}
        <h3 className="text-xl font-semibold text-white mb-2">Map Configuration Missing</h3>
        <code className="bg-black p-3 rounded-lg text-green-400 border border-gray-700 w-full max-w-md text-left overflow-x-auto text-sm block">
          NEXT_PUBLIC_STADIA_MAPS_KEY=your_key_here
        </code>
      </div>
    );
  }

  // Data-driven styling expressions
  const isTargetEvent = ['==', ['get', 'eventId'], activeEventId || ''];

  return (
    <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-purple-500/20 relative shadow-[0_0_40px_-15px_rgba(139,92,246,0.3)] group">
      <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-xl z-10" />
      
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 77.0,
          latitude: 21.0,
          zoom: 4,
          pitch: 0, // Changed to 0 for Top-Down view like Google Maps
        }}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        scrollZoom={false} // Disabled scroll zoom to prevent getting trapped while scrolling the page
      >
        {/* We still allow pan/drag, just not scroll-to-zoom to fix Hybrid UX */}
        <NavigationControl position="bottom-right" style={{ marginRight: '16px', marginBottom: '16px' }} />

        {/* Polygons (Fill Layer) */}
        <Source id="event-polygons" type="geojson" data={geoJsonData}>
          <Layer 
            id="polygons-fill"
            type="fill"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={{
              'fill-color': ['case', isTargetEvent, '#8b5cf6', '#4b5563'], // Violet if active, Grey if inactive
              'fill-opacity': ['case', isTargetEvent, 0.25, 0.05]
            }}
          />
          <Layer 
            id="polygons-line"
            type="line"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={{
              'line-color': ['case', isTargetEvent, '#8b5cf6', '#4b5563'],
              'line-width': ['case', isTargetEvent, 2, 1],
              'line-opacity': ['case', isTargetEvent, 0.9, 0.3]
            }}
          />
        </Source>

        {/* Lines (Routes) */}
        <Source id="event-lines" type="geojson" data={geoJsonData}>
          <Layer 
            id="lines"
            type="line"
            filter={['==', ['geometry-type'], 'LineString']}
            paint={{
              'line-color': ['case', isTargetEvent, '#38bdf8', '#4b5563'], // Neon Blue if active, Grey if not
              'line-width': ['case', isTargetEvent, 4, 2],
              'line-dasharray': [2, 2],
              'line-opacity': ['case', isTargetEvent, 1, 0.2]
            }}
          />
        </Source>

        {/* Points (Markers) */}
        <Source id="event-points" type="geojson" data={geoJsonData}>
          {/* Active Subtle glow */}
          <Layer 
            id="points-glow"
            type="circle"
            filter={['==', ['geometry-type'], 'Point']}
            paint={{
              'circle-radius': ['case', isTargetEvent, 18, 0], // Only glow if active
              'circle-color': '#c084fc',
              'circle-opacity': 0.3,
              'circle-blur': 1
            }}
          />
          {/* Main solid dot */}
          <Layer 
            id="points-core"
            type="circle"
            filter={['==', ['geometry-type'], 'Point']}
            paint={{
              'circle-radius': ['case', isTargetEvent, 7, 4], // Bigger if active
              'circle-color': ['case', isTargetEvent, '#c084fc', '#6b7280'], // Purple if active, Grey if inactive
              'circle-stroke-width': 2,
              'circle-stroke-color': '#111827'
            }}
          />
        </Source>
      </Map>
    </div>
  );
}
