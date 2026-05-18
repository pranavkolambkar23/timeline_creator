import { useState, useRef, useCallback } from 'react';

export type EventType = {
    id?: string;
    title: string;
    description: string;
    date: string;
    linkedFeatureIds: string[];
};

export function useTimelineStudio() {
    const [events, setEvents] = useState<EventType[]>([]);
    const [masterGeoJson, setMasterGeoJson] = useState<any>({ type: 'FeatureCollection', features: [] });
    
    const [activeEventIndex, setActiveEventIndex] = useState<number | null>(null);
    const [highlightedFeatureId, setHighlightedFeatureId] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    const featureNamesRef = useRef<Record<string, string>>({});
    const eventRefs = useRef<(HTMLDivElement | null)[]>([]);

    const handleEventChange = useCallback((index: number, field: keyof EventType, value: any) => {
        setEvents(prev => {
            const newArr = [...prev];
            newArr[index] = { ...newArr[index], [field]: value };
            return newArr;
        });
    }, []);

    const toggleFeatureLink = useCallback((eventIndex: number, featureId: string) => {
        setEvents(prev => {
            const newArr = [...prev];
            const event = { ...newArr[eventIndex] };
            const links = [...event.linkedFeatureIds];
            const linkIdx = links.indexOf(featureId);
            if (linkIdx === -1) {
                links.push(featureId);
            } else {
                links.splice(linkIdx, 1);
            }
            event.linkedFeatureIds = links;
            newArr[eventIndex] = event;
            return newArr;
        });
    }, []);

    const addEvent = useCallback(() => {
        setEvents(prev => {
            const idx = prev.length;
            setTimeout(() => {
                eventRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
            setActiveEventIndex(idx);
            return [...prev, { title: "New Event", description: "", date: "", linkedFeatureIds: [] }];
        });
    }, []);

    const removeEvent = useCallback((index: number) => {
        setEvents(prev => prev.filter((_, i) => i !== index));
        setActiveEventIndex(prev => {
            if (prev === null || prev === index) return null;
            return prev > index ? prev - 1 : prev;
        });
    }, []);

    const handleImport = useCallback((importedEvents: any[]) => {
        let newEventsArr: any[] = [];
        
        setMasterGeoJson((prevGeoJson: any) => {
            const newFeatures: any[] = [];
            const existingFeatures = prevGeoJson.features || [];
            
            newEventsArr = importedEvents.map(ev => {
                const linkedFeatureIds: string[] = [];
                if (ev.coords) {
                    // Check if feature with exact same coords already exists
                    let matchedFeature = existingFeatures.find((f: any) => 
                        f.geometry.type === 'Point' && 
                        f.geometry.coordinates[0] === ev.coords[0] && 
                        f.geometry.coordinates[1] === ev.coords[1]
                    );
                    
                    if (!matchedFeature) {
                        matchedFeature = newFeatures.find((f: any) => 
                            f.geometry.type === 'Point' && 
                            f.geometry.coordinates[0] === ev.coords[0] && 
                            f.geometry.coordinates[1] === ev.coords[1]
                        );
                    }

                    if (matchedFeature) {
                        linkedFeatureIds.push(matchedFeature.id);
                    } else {
                        const featureId = Math.random().toString(36).slice(2, 10);
                        const newFeat = {
                            type: 'Feature',
                            id: featureId,
                            geometry: { type: 'Point', coordinates: ev.coords },
                            properties: { name: ev.locationStr || ev.title }
                        };
                        newFeatures.push(newFeat);
                        linkedFeatureIds.push(featureId);
                        featureNamesRef.current[featureId] = ev.locationStr || ev.title;
                    }
                }
                return {
                    title: ev.title,
                    description: ev.description,
                    date: ev.date,
                    linkedFeatureIds
                };
            });

            if (newFeatures.length > 0) {
                return {
                    ...prevGeoJson,
                    features: [...existingFeatures, ...newFeatures]
                };
            }
            return prevGeoJson;
        });

        // Set events outside the masterGeoJson updater to prevent React StrictMode double-invocation bug
        setEvents((prevEvents) => [...prevEvents, ...newEventsArr]);
    }, []);

    const handleMapChange = useCallback((newGeoJson: any) => {
        setMasterGeoJson(newGeoJson);
    }, []);

    const handleDeleteFeature = useCallback((featureId: string) => {
        setEvents(prev => prev.map(ev => ({
            ...ev,
            linkedFeatureIds: ev.linkedFeatureIds.filter(id => id !== featureId)
        })));
        setMasterGeoJson((prev: any) => ({
            ...prev,
            features: prev.features.filter((f: any) => f.id !== featureId)
        }));
    }, []);

    const handleFeatureNameChange = useCallback((featureId: string, newName: string) => {
        featureNamesRef.current[featureId] = newName;
        setMasterGeoJson((prev: any) => ({
            ...prev,
            features: prev.features.map((f: any) =>
                f.id === featureId ? { ...f, properties: { ...f.properties, name: newName } } : f
            ),
        }));
    }, []);

    return {
        events, setEvents,
        masterGeoJson, setMasterGeoJson,
        activeEventIndex, setActiveEventIndex,
        highlightedFeatureId, setHighlightedFeatureId,
        isImportModalOpen, setIsImportModalOpen,
        isAiModalOpen, setIsAiModalOpen,
        featureNamesRef, eventRefs,
        handleEventChange, toggleFeatureLink, addEvent, removeEvent, handleImport,
        handleMapChange, handleDeleteFeature, handleFeatureNameChange
    };
}
