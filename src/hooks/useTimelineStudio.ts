import { useState, useRef, useCallback, useEffect } from 'react';

export type EventType = {
    id?: string;
    title: string;
    description: string;
    date: string;
    linkedFeatureIds: string[];
};

export const TIMELINE_DRAFT_STORAGE_KEY = 'timeline_draft';
export const TIMELINE_DRAFT_META_STORAGE_KEY = 'timeline_draft_meta';
export const TIMELINE_DRAFT_TTL_MS = 48 * 60 * 60 * 1000;

type TimelineDraftPayload = {
    expiresAt: number;
    events: EventType[];
    masterGeoJson: any;
    featureNames: Record<string, string>;
};

export function useTimelineStudio(options: { persistDraft?: boolean } = {}) {
    const { persistDraft = false } = options;
    const [events, setEvents] = useState<EventType[]>([]);
    const [masterGeoJson, setMasterGeoJson] = useState<any>({ type: 'FeatureCollection', features: [] });
    
    const [activeEventIndex, setActiveEventIndex] = useState<number | null>(null);
    const [highlightedFeatureId, setHighlightedFeatureId] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    const featureNamesRef = useRef<Record<string, string>>({});
    const eventRefs = useRef<(HTMLDivElement | null)[]>([]);
    const hasRestoredDraftRef = useRef(!persistDraft);

    const clearDraft = useCallback(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(TIMELINE_DRAFT_STORAGE_KEY);
        window.localStorage.removeItem(TIMELINE_DRAFT_META_STORAGE_KEY);
    }, []);

    useEffect(() => {
        if (!persistDraft || typeof window === 'undefined') return;

        try {
            const rawDraft = window.localStorage.getItem(TIMELINE_DRAFT_STORAGE_KEY);
            if (!rawDraft) {
                hasRestoredDraftRef.current = true;
                return;
            }

            const draft = JSON.parse(rawDraft) as TimelineDraftPayload;
            if (!draft.expiresAt || Date.now() > draft.expiresAt) {
                clearDraft();
                hasRestoredDraftRef.current = true;
                return;
            }

            if (Array.isArray(draft.events)) setEvents(draft.events);
            if (draft.masterGeoJson) setMasterGeoJson(draft.masterGeoJson);
            if (draft.featureNames) featureNamesRef.current = draft.featureNames;
        } catch {
            clearDraft();
        } finally {
            hasRestoredDraftRef.current = true;
        }
    }, [clearDraft, persistDraft]);

    useEffect(() => {
        if (!persistDraft || typeof window === 'undefined' || !hasRestoredDraftRef.current) return;

        const timeout = window.setTimeout(() => {
            const hasDraftContent = events.length > 0 || (masterGeoJson.features?.length ?? 0) > 0;

            if (!hasDraftContent) {
                window.localStorage.removeItem(TIMELINE_DRAFT_STORAGE_KEY);
                return;
            }

            const payload: TimelineDraftPayload = {
                expiresAt: Date.now() + TIMELINE_DRAFT_TTL_MS,
                events,
                masterGeoJson,
                featureNames: featureNamesRef.current,
            };
            window.localStorage.setItem(TIMELINE_DRAFT_STORAGE_KEY, JSON.stringify(payload));
        }, 1000);

        return () => window.clearTimeout(timeout);
    }, [events, masterGeoJson, persistDraft]);

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
        handleMapChange, handleDeleteFeature, handleFeatureNameChange,
        clearDraft,
    };
}
