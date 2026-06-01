"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useMemo, useRef } from "react";
import Header from "@/components/Header";
import GlobalMap from "@/components/timeline/GlobalMap";
import { useSession } from "next-auth/react";
import { compareHistoricalDates, historicalDisplayDate } from "@/lib/historicalDate";

type GlobalEvent = {
    id: string;
    title: string;
    description: string;
    date: string | null;
    displayDate?: string | null;
    historicalYear?: number | null;
    historicalMonth?: number | null;
    historicalDay?: number | null;
    locationData: any;
    timeline: {
        id: string;
        title: string;
        category: string;
        tags: string[];
    };
};

type SavedCollection = {
    id: string;
    name: string;
    description: string;
    scope: "FEATURED" | "PERSONAL";
    collectionEvents: {
        position: number;
        event: GlobalEvent;
    }[];
};

type Granularity = 'All Time' | 'Century' | 'Decade' | 'Year' | 'Month' | 'Day';

type PlaceResult = {
    geometry?: {
        coordinates?: [number, number];
    };
    properties: {
        name?: string;
        label?: string;
        region?: string;
        country?: string;
    };
};

const eventDate = (event: GlobalEvent) => {
    if (typeof event.historicalYear === "number") {
        const date = new Date(0);
        date.setHours(0, 0, 0, 0);
        date.setFullYear(event.historicalYear, (event.historicalMonth ?? 1) - 1, event.historicalDay ?? 1);
        return date;
    }
    return new Date(event.date ?? 0);
};

const eventTime = (event: GlobalEvent) => eventDate(event).getTime();

const formatEventGroup = (event: GlobalEvent, granularity: Granularity) => {
    const date = eventDate(event);
    if (granularity === "Year") {
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (granularity === "Month") {
        return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }
    if (granularity === "Day") return "Events";
    return `${date.getFullYear()}`;
};

const getEventCoordinates = (event: GlobalEvent): [number, number] | null => {
    const data = event.locationData;
    const features = data?.type === "FeatureCollection"
        ? data.features
        : data?.type === "Feature"
            ? [data]
            : [];
    const geometry = features?.[0]?.geometry;

    if (geometry?.type === "Point") return geometry.coordinates;
    if (geometry?.type === "LineString") return geometry.coordinates?.[0] ?? null;
    if (geometry?.type === "Polygon") return geometry.coordinates?.[0]?.[0] ?? null;
    return null;
};

const formatRangeDate = (event: GlobalEvent) => historicalDisplayDate(event);

const getCollectionGranularity = (collectionEvents: GlobalEvent[]): Granularity => {
    if (collectionEvents.length < 2) return "Year";
    const sortedEvents = [...collectionEvents].sort(compareHistoricalDates);
    const start = eventDate(sortedEvents[0]);
    const end = eventDate(sortedEvents[sortedEvents.length - 1]);
    const spanDays = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const spanYears = spanDays / 365.25;

    if (spanDays < 1) return "Day";
    if (spanDays < 32) return "Month";
    if (spanYears < 2) return "Year";
    if (spanYears <= 10) return "Decade";
    return "Century";
};

export default function GlobalTimeline() {
    const { data: session } = useSession();
    const [mode, setMode] = useState<'featured' | 'personal'>('featured');
    const [events, setEvents] = useState<GlobalEvent[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Time Scrubber State
    const [granularity, setGranularity] = useState<Granularity>('All Time');
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [isTimeJumpOpen, setIsTimeJumpOpen] = useState(false);
    const [timeJumpInput, setTimeJumpInput] = useState("");
    const [activeEventId, setActiveEventId] = useState<string | null>(null);

    // Collections State
    const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
    const [collections, setCollections] = useState<SavedCollection[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
    const [isCollectionPlaying, setIsCollectionPlaying] = useState(false);
    const [collectionStep, setCollectionStep] = useState(0);
    const [collectionSearchQuery, setCollectionSearchQuery] = useState("");
    const [collectionCategoryFilter, setCollectionCategoryFilter] = useState("All");
    const [collectionTagFilter, setCollectionTagFilter] = useState("All");
    const [expandedTimelineIds, setExpandedTimelineIds] = useState<string[]>([]);
    const [newCollectionName, setNewCollectionName] = useState("");
    const [showAllSourceTimelines, setShowAllSourceTimelines] = useState(false);
    const [collectionSavingTimelineId, setCollectionSavingTimelineId] = useState<string | null>(null);
    const [collectionNotice, setCollectionNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const collectionNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Events Drawer State
    const [isEventsOpen, setIsEventsOpen] = useState(false);
    const [eventsDrawerQuery, setEventsDrawerQuery] = useState("");

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
    const [isPlacesLoading, setIsPlacesLoading] = useState(false);
    const [flyToLocation, setFlyToLocation] = useState<{ longitude: number; latitude: number; zoom?: number; requestId: number } | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [searchNotice, setSearchNotice] = useState<string | null>(null);
    const searchNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const selectedCollection = collections.find(collection => collection.id === selectedCollectionId) ?? null;
    const activeCollection = collections.find(collection => collection.id === activeCollectionId) ?? null;
    const collectionEventIds = useMemo(() => selectedCollection?.collectionEvents
        .map(item => item.event)
        .sort(compareHistoricalDates)
        .map(event => event.id) ?? [], [selectedCollection]);
    const activeCollectionEventIds = useMemo(() => activeCollection?.collectionEvents
        .map(item => item.event)
        .sort(compareHistoricalDates)
        .map(event => event.id) ?? [], [activeCollection]);
    const canEditCollections = mode === "personal" ? !!session?.user : session?.user?.role === "ADMIN";
    const activeCollectionEvents = useMemo(() => activeCollection?.collectionEvents.map(item => item.event) ?? [], [activeCollection]);
    const activeCollectionRange = useMemo(() => {
        if (activeCollectionEvents.length === 0) return null;
        const sortedEvents = [...activeCollectionEvents].sort(compareHistoricalDates);
        return {
            start: sortedEvents[0],
            end: sortedEvents[sortedEvents.length - 1],
        };
    }, [activeCollectionEvents]);
    const allAvailableEvents = useMemo(() => {
        const availableEvents = new Map(events.map(event => [event.id, event]));
        collections.forEach(collection => {
            collection.collectionEvents.forEach(item => availableEvents.set(item.event.id, item.event));
        });
        return [...availableEvents.values()];
    }, [events, collections]);
    const playingCollectionEvent = useMemo(() => {
        const eventId = activeCollectionEventIds[collectionStep];
        return allAvailableEvents.find(event => event.id === eventId) ?? null;
    }, [activeCollectionEventIds, collectionStep, allAvailableEvents]);
    const selectedCollectionTimelineNames = useMemo(() => {
        const names = collectionEventIds
            .map(id => allAvailableEvents.find(event => event.id === id)?.timeline.title)
            .filter((name): name is string => !!name);
        return [...new Set(names)];
    }, [collectionEventIds, allAvailableEvents]);

    const showSearchNotice = (message: string) => {
        if (searchNoticeTimeoutRef.current) clearTimeout(searchNoticeTimeoutRef.current);
        setSearchNotice(message);
        searchNoticeTimeoutRef.current = setTimeout(() => setSearchNotice(null), 4000);
    };

    const showCollectionNotice = (type: "success" | "error", message: string) => {
        if (collectionNoticeTimeoutRef.current) clearTimeout(collectionNoticeTimeoutRef.current);
        setCollectionNotice({ type, message });
        collectionNoticeTimeoutRef.current = setTimeout(() => setCollectionNotice(null), 3500);
    };

    useEffect(() => {
        return () => {
            if (searchNoticeTimeoutRef.current) clearTimeout(searchNoticeTimeoutRef.current);
            if (collectionNoticeTimeoutRef.current) clearTimeout(collectionNoticeTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        const fetchGlobalEvents = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/timeline/global?mode=${mode}`);
                if (!res.ok) throw new Error("Fetch failed");
                const data = await res.json();
                setEvents(data);
                
                if (data.length > 0) {
                    const earliest = new Date(Math.min(...data.map((e: GlobalEvent) => eventTime(e)).filter((t: number) => !isNaN(t))));
                    if (earliest && isFinite(earliest.getTime())) {
                        setCurrentDate(earliest);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch global events", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGlobalEvents();
    }, [mode]);

    useEffect(() => {
        fetch(`/api/collections?scope=${mode}`)
            .then(response => response.ok ? response.json() : [])
            .then((data: SavedCollection[]) => {
                setCollections(data);
                setSelectedCollectionId(data[0]?.id ?? null);
                setActiveCollectionId(null);
                setIsCollectionPlaying(false);
            })
            .catch(error => console.error("Failed to fetch collections", error));
    }, [mode, session?.user]);

    const saveCollection = async (collection: SavedCollection, eventIds: string[], name = collection.name) => {
        const sortedEventIds = [...eventIds].sort((leftId, rightId) => {
            const left = allAvailableEvents.find(event => event.id === leftId);
            const right = allAvailableEvents.find(event => event.id === rightId);
            return compareHistoricalDates(left ?? {}, right ?? {});
        });
        const response = await fetch(`/api/collections/${collection.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, description: collection.description, eventIds: sortedEventIds }),
        });
        if (!response.ok) throw new Error("Failed to save collection");
        const updatedCollection: SavedCollection = await response.json();
        setCollections(current => current.map(item => item.id === updatedCollection.id ? updatedCollection : item));
        return updatedCollection;
    };

    const createCollection = async () => {
        const name = newCollectionName.trim();
        if (!name) return;
        const response = await fetch("/api/collections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, scope: mode === "featured" ? "FEATURED" : "PERSONAL" }),
        });
        if (!response.ok) return;
        const collection: SavedCollection = await response.json();
        setCollections(current => [collection, ...current]);
        setSelectedCollectionId(collection.id);
        setNewCollectionName("");
    };

    const deleteSelectedCollection = async () => {
        if (!selectedCollection || !confirm(`Delete "${selectedCollection.name}"?`)) return;
        const response = await fetch(`/api/collections/${selectedCollection.id}`, { method: "DELETE" });
        if (!response.ok) return;
        setCollections(current => current.filter(collection => collection.id !== selectedCollection.id));
        setSelectedCollectionId(null);
        if (activeCollectionId === selectedCollection.id) setActiveCollectionId(null);
    };

    const addToCollection = async (eventId: string) => {
        if (!canEditCollections) {
            showSearchNotice(mode === "featured" ? "Only admins can edit featured collections." : "Sign in to create and edit collections.");
            return;
        }
        setIsEventsOpen(false);
        setIsCollectionsOpen(true);
        if (!selectedCollection) {
            showSearchNotice("Create or select a collection before adding events.");
            return;
        }
        if (collectionEventIds.includes(eventId)) return;
        await saveCollection(selectedCollection, [...collectionEventIds, eventId]);
    };

    const removeFromCollection = async (eventId: string) => {
        if (!selectedCollection) return;
        await saveCollection(selectedCollection, collectionEventIds.filter(id => id !== eventId));
    };

    const addTimelineToCollection = async (timelineId: string) => {
        if (!selectedCollection) return;
        const timeline = collectionBuilderTimelines.find(item => item.id === timelineId);
        const timelineEventIds = events.filter(event => event.timeline.id === timelineId).map(event => event.id);
        setCollectionSavingTimelineId(timelineId);
        try {
            await saveCollection(selectedCollection, [...new Set([...collectionEventIds, ...timelineEventIds])]);
            showCollectionNotice("success", `${timeline?.title ?? "Timeline"} added to the collection.`);
        } catch (error) {
            console.error("Failed to add timeline to collection", error);
            showCollectionNotice("error", `Could not add ${timeline?.title ?? "the timeline"}. Please try again.`);
        } finally {
            setCollectionSavingTimelineId(null);
        }
    };

    const selectCollectionStep = (step: number) => {
        const boundedStep = Math.max(0, Math.min(step, activeCollectionEventIds.length - 1));
        const eventId = activeCollectionEventIds[boundedStep];
        if (!eventId) return;
        setCollectionStep(boundedStep);
        setActiveEventId(eventId);
    };

    const activateCollection = (collection: SavedCollection, shouldPlay = false) => {
        const collectionEvents = collection.collectionEvents.map(item => item.event);
        if (collectionEvents.length === 0) return;
        const sortedEvents = [...collectionEvents].sort(compareHistoricalDates);
        setActiveCollectionId(collection.id);
        setGranularity(getCollectionGranularity(sortedEvents));
        setCurrentDate(eventDate(sortedEvents[0]));
        setIsCollectionPlaying(shouldPlay);
        setCollectionStep(0);
        if (shouldPlay) setActiveEventId(collection.collectionEvents[0]?.event.id ?? null);
        setIsCollectionsOpen(false);
    };

    // Fullscreen Logic
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    };
    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Time Scrubber Logic
    const timeBlock = useMemo(() => {
        if (granularity === 'All Time') return { start: -Infinity, end: Infinity, label: 'All Time', subLabel: 'Entire Human History' };
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const date = currentDate.getDate();

        let start = new Date(year, month, date);
        let end = new Date(year, month, date);
        let label = '';
        let subLabel = '';

        if (granularity === 'Century') {
            const startYear = Math.floor(year / 100) * 100;
            start = new Date(startYear, 0, 1);
            end = new Date(startYear + 99, 11, 31, 23, 59, 59);
            const centuryNum = Math.abs(Math.floor(year / 100)) + 1;
            label = year < 0 ? `${centuryNum}th Century BC` : `${centuryNum}th Century`;
            subLabel = `${start.getFullYear()} - ${end.getFullYear()}`;
        } else if (granularity === 'Decade') {
            const startYear = Math.floor(year / 10) * 10;
            start = new Date(startYear, 0, 1);
            end = new Date(startYear + 9, 11, 31, 23, 59, 59);
            label = year < 0 ? `${Math.abs(startYear)}s BC` : `${startYear}s`;
            subLabel = `${start.getFullYear()} - ${end.getFullYear()}`;
        } else if (granularity === 'Year') {
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31, 23, 59, 59);
            label = year < 0 ? `${Math.abs(year)} BC` : `${year}`;
            subLabel = `January - December`;
        } else if (granularity === 'Month') {
            start = new Date(year, month, 1);
            end = new Date(year, month + 1, 0, 23, 59, 59);
            label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            subLabel = `1st - ${end.getDate()}th`;
        } else if (granularity === 'Day') {
            start = new Date(year, month, date, 0, 0, 0);
            end = new Date(year, month, date, 23, 59, 59);
            label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            subLabel = `24 Hours`;
        }

        return { start: start.getTime(), end: end.getTime(), label, subLabel };
    }, [currentDate, granularity]);

    const stepTime = (direction: 1 | -1) => {
        if (granularity === 'All Time') return;
        const newDate = new Date(currentDate);
        if (granularity === 'Century') newDate.setFullYear(newDate.getFullYear() + (100 * direction));
        else if (granularity === 'Decade') newDate.setFullYear(newDate.getFullYear() + (10 * direction));
        else if (granularity === 'Year') newDate.setFullYear(newDate.getFullYear() + direction);
        else if (granularity === 'Month') newDate.setMonth(newDate.getMonth() + direction);
        else if (granularity === 'Day') newDate.setDate(newDate.getDate() + direction);
        setCurrentDate(newDate);
    };

    const handleTimeJump = (e: React.FormEvent) => {
        e.preventDefault();
        const year = parseInt(timeJumpInput);
        if (!isNaN(year)) {
            setCurrentDate(new Date(year, 0, 1));
            setIsTimeJumpOpen(false);
            if (granularity === 'All Time') setGranularity('Year');
        }
    };

    // Filter Logic
    const activeEvents = useMemo(() => {
        if (activeCollection) {
            return allAvailableEvents.filter(event => activeCollectionEventIds.includes(event.id));
        }

        return events.filter(e => {
            if (granularity === 'All Time') return true;
            const eTime = eventTime(e);
            if (isNaN(eTime)) return false;
            return eTime >= timeBlock.start && eTime <= timeBlock.end;
        });
    }, [events, allAvailableEvents, granularity, timeBlock, activeCollection, activeCollectionEventIds]);

    // Search Logic (Unified Search prioritizing in-era)
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return { inEra: [], outEra: [] };
        const q = searchQuery.toLowerCase();
        
        const matched = events.filter(e => 
            e.title.toLowerCase().includes(q) || 
            e.description.toLowerCase().includes(q)
        );

        // Split into in-era and out-of-era
        const inEra: GlobalEvent[] = [];
        const outEra: GlobalEvent[] = [];

        matched.forEach(e => {
            const eTime = eventTime(e);
            if (granularity === 'All Time' || (eTime >= timeBlock.start && eTime <= timeBlock.end)) {
                inEra.push(e);
            } else {
                outEra.push(e);
            }
        });

        return { inEra, outEra };
    }, [events, searchQuery, granularity, timeBlock]);

    const handleSearchSelect = (ev: GlobalEvent) => {
        if (activeCollection && !activeCollectionEventIds.includes(ev.id)) {
            const shouldLeaveCollection = confirm(`"${ev.title}" is outside "${activeCollection.name}". Leave the active collection and continue?`);
            if (!shouldLeaveCollection) return;
            setActiveCollectionId(null);
            setIsCollectionPlaying(false);
        }
        setSearchQuery("");
        setPlaceResults([]);
        setIsSearchFocused(false);
        searchInputRef.current?.blur();
        setActiveEventId(ev.id);

        const coordinates = getEventCoordinates(ev);
        if (coordinates) {
            setFlyToLocation({
                longitude: coordinates[0],
                latitude: coordinates[1],
                zoom: 6,
                requestId: Date.now()
            });
        } else {
            showSearchNotice(`"${ev.title}" has no map location attached.`);
        }
        
        // Jump time if out of era
        const evDate = eventDate(ev);
        setCurrentDate(evDate);
        if (granularity === 'All Time') setGranularity('Year');
    };

    useEffect(() => {
        if (!searchQuery.trim()) {
            setPlaceResults([]);
            setIsPlacesLoading(false);
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            setIsPlacesLoading(true);
            try {
                const stadiaKey = process.env.NEXT_PUBLIC_STADIA_MAPS_KEY;
                if (!stadiaKey) return;
                const response = await fetch(
                    `https://api.stadiamaps.com/geocoding/v1/autocomplete?text=${encodeURIComponent(searchQuery)}&api_key=${stadiaKey}`,
                    { signal: controller.signal }
                );
                if (!response.ok) throw new Error("Place search failed");
                const data = await response.json();
                setPlaceResults(Array.isArray(data.features) ? data.features.slice(0, 5) : []);
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    console.error("Place search failed", error);
                    setPlaceResults([]);
                }
            } finally {
                if (!controller.signal.aborted) setIsPlacesLoading(false);
            }
        }, 300);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [searchQuery]);

    const handlePlaceSelect = (place: PlaceResult) => {
        const coordinates = place.geometry?.coordinates;
        if (!coordinates) return;
        setSearchQuery("");
        setPlaceResults([]);
        setIsSearchFocused(false);
        searchInputRef.current?.blur();
        setActiveEventId(null);
        setFlyToLocation({
            longitude: coordinates[0],
            latitude: coordinates[1],
            zoom: 9,
            requestId: Date.now()
        });
    };

    const drawerEvents = useMemo(() => {
        const query = eventsDrawerQuery.trim().toLowerCase();
        const matchesQuery = (event: GlobalEvent) => {
            if (!query) return true;
            return event.title.toLowerCase().includes(query)
                || event.description.toLowerCase().includes(query)
                || event.timeline.title.toLowerCase().includes(query);
        };
        const visibleEventIds = new Set(activeEvents.map(event => event.id));
        const currentPeriodEvents = activeEvents.filter(matchesQuery);
        const outsidePeriodEvents = query
            ? events.filter(event => !visibleEventIds.has(event.id) && matchesQuery(event))
            : [];

        const groupedCurrentPeriodEvents = currentPeriodEvents.reduce<Record<string, GlobalEvent[]>>((groups, event) => {
            const group = formatEventGroup(event, granularity);
            groups[group] = [...(groups[group] || []), event];
            return groups;
        }, {});

        return { groupedCurrentPeriodEvents, outsidePeriodEvents };
    }, [activeEvents, events, eventsDrawerQuery, granularity]);

    const collectionBuilderTimelines = useMemo(() => {
        const query = collectionSearchQuery.trim().toLowerCase();
        const timelines = new Map<string, { id: string; title: string; category: string; tags: string[]; events: GlobalEvent[] }>();
        events.forEach(event => {
            const existing = timelines.get(event.timeline.id);
            if (existing) {
                existing.events.push(event);
            } else {
                timelines.set(event.timeline.id, {
                    id: event.timeline.id,
                    title: event.timeline.title,
                    category: event.timeline.category,
                    tags: event.timeline.tags,
                    events: [event],
                });
            }
        });

        return [...timelines.values()].filter(timeline => {
            const matchesQuery = !query
                || timeline.title.toLowerCase().includes(query)
                || timeline.events.some(event => event.title.toLowerCase().includes(query) || event.description.toLowerCase().includes(query));
            const matchesCategory = collectionCategoryFilter === "All" || timeline.category === collectionCategoryFilter;
            const matchesTag = collectionTagFilter === "All" || timeline.tags.includes(collectionTagFilter);
            return matchesQuery && matchesCategory && matchesTag;
        });
    }, [events, collectionSearchQuery, collectionCategoryFilter, collectionTagFilter]);

    const collectionCategories = useMemo(() => ["All", ...new Set(events.map(event => event.timeline.category))], [events]);
    const collectionTags = useMemo(() => ["All", ...new Set(events.flatMap(event => event.timeline.tags))], [events]);

    return (
        <div ref={containerRef} className="h-screen flex flex-col bg-[#080808] text-white overflow-hidden relative font-sans">
            {!isFullscreen && <Header />}

            <div className="flex-grow flex relative h-full w-full">
                {/* 100% Background Map */}
                <div className="absolute inset-0 z-0">
                    <GlobalMap 
                        events={activeEvents} 
                        activeEventId={activeEventId}
                        flyToLocation={flyToLocation}
                        onEventClick={(id) => setActiveEventId(id)}
                        onAddToCollection={addToCollection}
                        canAddToCollection={canEditCollections}
                    />
                </div>

                {/* --- TOP BAR (Search & Controls) --- */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-5xl flex items-center justify-between gap-4 pointer-events-none">
                    
                    {/* Left: Mode Toggles */}
                    <div className="flex bg-[#060606]/80 backdrop-blur-xl p-1.5 rounded-xl border border-white/10 shadow-2xl pointer-events-auto">
                        <button
                            onClick={() => { setMode('featured'); setActiveCollectionId(null); setIsCollectionPlaying(false); }}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'featured' ? 'bg-indigo-500 text-white shadow-md' : 'text-white/40 hover:text-white/80'}`}
                        >
                            Featured
                        </button>
                        {session?.user && (
                            <button
                                onClick={() => { setMode('personal'); setActiveCollectionId(null); setIsCollectionPlaying(false); }}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'personal' ? 'bg-indigo-500 text-white shadow-md' : 'text-white/40 hover:text-white/80'}`}
                            >
                                My Timelines
                            </button>
                        )}
                    </div>

                    {/* Center: Unified Search */}
                    <div className="flex-1 relative max-w-md pointer-events-auto shadow-2xl z-50">
                        <div className="relative">
                            <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search events or places..."
                                className="w-full bg-[#060606]/90 backdrop-blur-2xl border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-indigo-500/50 transition-all font-medium"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setIsSearchFocused(true);
                                }}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                            />
                        </div>

                        {/* Search Dropdown */}
                        {isSearchFocused && searchQuery && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#060606]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-h-96 overflow-y-auto">
                                {isPlacesLoading && (
                                    <div className="px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-white/40">
                                        Searching places...
                                    </div>
                                )}

                                {placeResults.length > 0 && (
                                    <div className="p-2 border-b border-white/5">
                                        <div className="px-3 py-1 text-[9px] font-bold text-white/50 uppercase tracking-widest bg-white/5 rounded-md mb-1">Places</div>
                                        {placeResults.map((place, index) => (
                                            <div
                                                key={`${place.properties.label || place.properties.name}-${index}`}
                                                onPointerDown={(event) => {
                                                    event.preventDefault();
                                                    handlePlaceSelect(place);
                                                }}
                                                className="px-4 py-2 hover:bg-white/10 cursor-pointer rounded-lg transition-colors"
                                            >
                                                <h4 className="text-white text-sm font-medium flex items-center gap-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {place.properties.name || place.properties.label}
                                                </h4>
                                                <span className="text-white/40 text-xs pl-5.5">
                                                    {place.properties.label || [place.properties.region, place.properties.country].filter(Boolean).join(", ")}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!isPlacesLoading && placeResults.length === 0 && searchResults.inEra.length === 0 && searchResults.outEra.length === 0 && (
                                    <div className="p-4 text-center text-white/40 text-xs font-mono uppercase tracking-widest">No events or places found</div>
                                )}
                                
                                {searchResults.inEra.length > 0 && (
                                    <div className="p-2">
                                        <div className="px-3 py-1 text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-white/5 rounded-md mb-1">In Current Era</div>
                                        {searchResults.inEra.map(ev => (
                                            <div
                                                key={ev.id}
                                                onPointerDown={(event) => {
                                                    event.preventDefault();
                                                    handleSearchSelect(ev);
                                                }}
                                                className="px-4 py-2 hover:bg-white/10 cursor-pointer rounded-lg transition-colors"
                                            >
                                                <h4 className="text-white text-sm font-medium">{ev.title}</h4>
                                                <span className="text-white/40 text-xs font-mono">{historicalDisplayDate(ev)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {searchResults.outEra.length > 0 && (
                                    <div className="p-2 border-t border-white/5">
                                        <div className="px-3 py-1 text-[9px] font-bold text-white/40 uppercase tracking-widest bg-white/5 rounded-md mb-1">Other Eras (Will Jump Time)</div>
                                        {searchResults.outEra.map(ev => (
                                            <div
                                                key={ev.id}
                                                onPointerDown={(event) => {
                                                    event.preventDefault();
                                                    handleSearchSelect(ev);
                                                }}
                                                className="px-4 py-2 hover:bg-white/5 cursor-pointer rounded-lg transition-colors opacity-60 hover:opacity-100"
                                            >
                                                <h4 className="text-white text-sm font-medium">{ev.title}</h4>
                                                <span className="text-indigo-300 text-xs font-mono">{historicalDisplayDate(ev)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {searchNotice && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#060606]/95 backdrop-blur-xl border border-amber-400/30 rounded-xl px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-xs text-white/80">
                                <span className="font-bold text-amber-300">Location unavailable.</span>{" "}
                                {searchNotice}
                            </div>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 pointer-events-auto">
                        <button
                            onClick={() => {
                                setIsEventsOpen(!isEventsOpen);
                                setIsCollectionsOpen(false);
                            }}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all shadow-2xl text-[10px] font-black uppercase tracking-widest ${isEventsOpen ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#060606]/80 backdrop-blur-xl border-white/10 text-white/70 hover:text-white hover:bg-white/10'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            Events
                        </button>

                        <button 
                            onClick={() => {
                                setIsCollectionsOpen(!isCollectionsOpen);
                                setIsEventsOpen(false);
                            }}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all shadow-2xl text-[10px] font-black uppercase tracking-widest ${activeCollection || isCollectionsOpen ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#060606]/80 backdrop-blur-xl border-white/10 text-white/70 hover:text-white hover:bg-white/10'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Collections
                        </button>

                        <button 
                            onClick={toggleFullscreen}
                            className="bg-[#060606]/80 backdrop-blur-xl border border-white/10 p-3 rounded-xl hover:bg-white/10 transition-colors shadow-2xl text-white/70 hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* --- EVENTS DRAWER --- */}
                <div className={`absolute top-0 right-0 bottom-0 w-96 bg-[#060606]/95 backdrop-blur-3xl border-l border-white/10 z-40 transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[-20px_0_50px_rgba(0,0,0,0.8)] flex flex-col ${isEventsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6 border-b border-white/5 bg-black/20">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-white tracking-tight">Events</h3>
                                <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mt-1">{activeEvents.length} in selected period</p>
                            </div>
                            <button onClick={() => setIsEventsOpen(false)} className="text-white/40 hover:text-white p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="relative">
                            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={eventsDrawerQuery}
                                onChange={(event) => setEventsDrawerQuery(event.target.value)}
                                placeholder="Search events in this period..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-indigo-500/50"
                            />
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                        {Object.keys(drawerEvents.groupedCurrentPeriodEvents).length === 0 && drawerEvents.outsidePeriodEvents.length === 0 ? (
                            <div className="text-center p-6 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                                <p className="text-white/40 text-xs leading-relaxed">No events match this selected period and search.</p>
                            </div>
                        ) : (
                            Object.entries(drawerEvents.groupedCurrentPeriodEvents).map(([group, groupedEvents]) => (
                                <section key={group} className="mb-5 last:mb-0">
                                    <div className="px-3 py-1.5 rounded-lg bg-[#111111]/95 text-[10px] font-black uppercase tracking-widest text-indigo-300 border border-white/5">
                                        {group}
                                    </div>
                                    <div className="mt-1">
                                        {groupedEvents.map(event => {
                                            const hasLocation = !!getEventCoordinates(event);
                                            return (
                                                <button
                                                    key={event.id}
                                                    onClick={() => handleSearchSelect(event)}
                                                    className="w-full text-left px-3 py-3 rounded-xl hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <h4 className="text-sm font-medium text-white/90">{event.title}</h4>
                                                            <p className="text-[10px] font-mono text-white/35 mt-1">{event.timeline.title}</p>
                                                        </div>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 ${hasLocation ? 'text-white/35' : 'text-amber-300/70'}`}>
                                                            {hasLocation ? 'Mapped' : 'No map'}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))
                        )}

                        {drawerEvents.outsidePeriodEvents.length > 0 && (
                            <section className="mt-6">
                                <div className="px-3 py-1.5 rounded-lg bg-[#111111]/95 text-[10px] font-black uppercase tracking-widest text-white/45 border border-white/5">
                                    Outside Selected Period
                                </div>
                                <div className="mt-1">
                                    {drawerEvents.outsidePeriodEvents.map(event => {
                                        const hasLocation = !!getEventCoordinates(event);
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={() => handleSearchSelect(event)}
                                                className="w-full text-left px-3 py-3 rounded-xl hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 opacity-50 hover:opacity-90"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-white/90">{event.title}</h4>
                                                        <p className="text-[10px] font-mono text-white/40 mt-1">
                                                            {historicalDisplayDate(event)} - {event.timeline.title}
                                                        </p>
                                                    </div>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 ${hasLocation ? 'text-white/35' : 'text-amber-300/70'}`}>
                                                        {hasLocation ? 'Mapped' : 'No map'}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                </div>

                {/* --- COLLECTIONS DRAWER --- */}
                <div className={`absolute top-0 right-0 bottom-0 w-[440px] bg-[#060606]/95 backdrop-blur-3xl border-l border-white/10 z-40 transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[-20px_0_50px_rgba(0,0,0,0.8)] flex flex-col ${isCollectionsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                        <div>
                            <h3 className="font-bold text-white tracking-tight">Collections</h3>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mt-1">Saved custom timelines</p>
                        </div>
                        <button onClick={() => setIsCollectionsOpen(false)} className="text-white/40 hover:text-white p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {canEditCollections && <div className="p-4 border-b border-white/5 bg-black/10">
                        {session?.user ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCollectionName}
                                    onChange={event => setNewCollectionName(event.target.value)}
                                    onKeyDown={event => {
                                        if (event.key === "Enter") createCollection();
                                    }}
                                    placeholder="New collection name..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-indigo-500/50"
                                />
                                <button onClick={createCollection} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black uppercase tracking-widest text-white">
                                    Create
                                </button>
                            </div>
                        ) : (
                            <p className="text-xs text-white/50">Sign in to create and manage saved collections.</p>
                        )}
                    </div>}

                    <div className="flex-grow overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                        {collectionNotice && (
                            <div className={`mx-4 mt-4 rounded-xl border px-3 py-2.5 text-xs shadow-lg ${collectionNotice.type === "success" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-red-400/20 bg-red-500/10 text-red-100"}`}>
                                {collectionNotice.message}
                            </div>
                        )}
                        {collections.length > 0 && (
                            <div className="p-4 border-b border-white/5">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">{mode === "featured" ? "Featured Collections" : "Your Collections"}</label>
                                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                                    {collections.map(collection => (
                                        <button
                                            key={collection.id}
                                            onClick={() => {
                                                setSelectedCollectionId(collection.id);
                                                setShowAllSourceTimelines(false);
                                            }}
                                            className={`shrink-0 rounded-xl px-3 py-2 text-left border transition-colors ${collection.id === selectedCollectionId ? 'bg-indigo-600/20 border-indigo-500/50 text-white' : 'bg-white/[0.03] border-white/5 text-white/50 hover:text-white'}`}
                                        >
                                            <span className="block text-xs font-bold max-w-40 truncate">{collection.name}</span>
                                            <span className="block text-[9px] font-mono uppercase tracking-widest mt-1 opacity-60">{collection.collectionEvents.length} events</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedCollection ? (
                        <div className="p-4 space-y-5">
                            <div>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Selected Collection</label>
                                    {canEditCollections && <button onClick={deleteSelectedCollection} className="text-[9px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-300">Delete</button>}
                                </div>
                            <input 
                                type="text"
                                defaultValue={selectedCollection.name}
                                key={selectedCollection.id}
                                readOnly={!canEditCollections}
                                onBlur={event => {
                                    if (!canEditCollections) return;
                                    const name = event.target.value.trim();
                                    if (name && name !== selectedCollection.name) saveCollection(selectedCollection, collectionEventIds, name);
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white font-medium outline-none focus:border-indigo-500/50"
                            />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">Included Events ({collectionEventIds.length})</label>
                                {selectedCollectionTimelineNames.length > 0 && (
                                    <div className="mb-3 rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2.5">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                                            {selectedCollectionTimelineNames.length} Source {selectedCollectionTimelineNames.length === 1 ? "Timeline" : "Timelines"}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {(showAllSourceTimelines ? selectedCollectionTimelineNames : selectedCollectionTimelineNames.slice(0, 4)).map(name => (
                                                <span key={name} className="max-w-full truncate rounded-md bg-white/5 border border-white/5 px-2 py-1 text-[10px] text-white/60">
                                                    {name}
                                                </span>
                                            ))}
                                            {selectedCollectionTimelineNames.length > 4 && (
                                                <button
                                                    onClick={() => setShowAllSourceTimelines(current => !current)}
                                                    className="rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/15 px-2 py-1 text-[10px] font-bold text-indigo-300"
                                                >
                                                    {showAllSourceTimelines ? "Show less" : `+${selectedCollectionTimelineNames.length - 4} more`}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {collectionEventIds.length === 0 ? (
                                    <div className="text-center p-4 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                                        <p className="text-white/40 text-xs leading-relaxed">Search timelines below, add individual events, or add events from the map.</p>
                                    </div>
                                ) : (
                                <div className="space-y-2">
                                    {collectionEventIds.map((id, index) => {
                                        const ev = allAvailableEvents.find(e => e.id === id);
                                        if (!ev) return null;
                                        return (
                                            <div
                                                key={id}
                                                className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3 group"
                                            >
                                                <div className="text-indigo-500 font-black text-xs pt-0.5">{index + 1}.</div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-white/90 leading-tight mb-1">{ev.title}</h4>
                                                    <p className="text-[10px] font-mono text-white/40">{historicalDisplayDate(ev)}</p>
                                                </div>
                                                {canEditCollections && <button
                                                    onClick={() => removeFromCollection(id)}
                                                    className="text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>}
                                            </div>
                                        )
                                    })}
                                </div>
                                )}
                            </div>

                            {canEditCollections && <div className="border-t border-white/5 pt-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">Find Timelines and Events</label>
                                <input
                                    type="text"
                                    value={collectionSearchQuery}
                                    onChange={event => setCollectionSearchQuery(event.target.value)}
                                    placeholder="Search timeline or event..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-indigo-500/50"
                                />
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <select value={collectionCategoryFilter} onChange={event => setCollectionCategoryFilter(event.target.value)} className="bg-[#111] border border-white/10 rounded-lg px-2 py-2 text-xs text-white/70 outline-none">
                                        {collectionCategories.map(category => <option key={category}>{category}</option>)}
                                    </select>
                                    <select value={collectionTagFilter} onChange={event => setCollectionTagFilter(event.target.value)} className="bg-[#111] border border-white/10 rounded-lg px-2 py-2 text-xs text-white/70 outline-none">
                                        {collectionTags.map(tag => <option key={tag}>{tag}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2 mt-3">
                                    {collectionBuilderTimelines.map(timeline => {
                                        const isExpanded = expandedTimelineIds.includes(timeline.id);
                                        const includedCount = timeline.events.filter(event => collectionEventIds.includes(event.id)).length;
                                        return (
                                            <div key={timeline.id} className="rounded-xl border border-white/5 bg-white/[0.025] overflow-hidden">
                                                <div className="p-3 flex items-start gap-2">
                                                    <button onClick={() => setExpandedTimelineIds(current => current.includes(timeline.id) ? current.filter(id => id !== timeline.id) : [...current, timeline.id])} className="flex-1 text-left">
                                                        <h4 className="text-sm font-bold text-white/90">{timeline.title}</h4>
                                                        <p className="text-[10px] font-mono text-white/35 mt-1">{timeline.category} - {includedCount}/{timeline.events.length} included</p>
                                                    </button>
                                                    <button
                                                        onClick={() => addTimelineToCollection(timeline.id)}
                                                        disabled={collectionSavingTimelineId !== null}
                                                        className="px-2 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-[9px] font-black uppercase tracking-widest text-indigo-300 disabled:opacity-50 disabled:hover:bg-indigo-500/15"
                                                    >
                                                        {collectionSavingTimelineId === timeline.id ? "Adding..." : "Add all"}
                                                    </button>
                                                </div>
                                                {collectionSavingTimelineId === timeline.id && (
                                                    <div className="flex items-center gap-2 border-t border-white/5 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-white/45">
                                                        <span className="h-3 w-3 rounded-full border border-indigo-300/70 border-t-transparent animate-spin" />
                                                        Saving timeline events...
                                                    </div>
                                                )}
                                                {isExpanded && (
                                                    <div className="border-t border-white/5 p-2 space-y-1">
                                                        {timeline.events.map(event => {
                                                            const isIncluded = collectionEventIds.includes(event.id);
                                                            return (
                                                                <div key={event.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5">
                                                                    <div className="flex-1">
                                                                        <p className="text-xs text-white/80">{event.title}</p>
                                                                        <p className="text-[9px] font-mono text-white/35 mt-0.5">{historicalDisplayDate(event)}</p>
                                                                    </div>
                                                                    <button onClick={() => isIncluded ? removeFromCollection(event.id) : addToCollection(event.id)} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${isIncluded ? 'bg-white/5 text-white/40 hover:text-red-300' : 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25'}`}>
                                                                        {isIncluded ? "Remove" : "Add"}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>}
                        </div>
                        ) : (
                            <div className="m-4 text-center p-6 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                                <p className="text-white/40 text-xs leading-relaxed">{canEditCollections ? "Create a collection to build a saved custom timeline." : "No collections are available in this Global Timeline yet."}</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-white/5 bg-black/20 grid grid-cols-2 gap-2">
                        <button
                            onClick={() => {
                                if (!selectedCollection) return;
                                if (activeCollectionId === selectedCollection.id) {
                                    setActiveCollectionId(null);
                                    setIsCollectionPlaying(false);
                                } else {
                                    activateCollection(selectedCollection);
                                }
                            }}
                            disabled={!selectedCollection || collectionEventIds.length === 0}
                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 ${activeCollectionId === selectedCollectionId ? 'bg-red-500/15 text-red-300 border border-red-500/20' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                        >
                            {activeCollectionId === selectedCollectionId ? "Deactivate" : "Activate Collection"}
                        </button>
                        <button
                            onClick={() => {
                                if (!selectedCollection) return;
                                activateCollection(selectedCollection, true);
                            }}
                            disabled={!selectedCollection || collectionEventIds.length === 0}
                            className="py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-white/10 text-white hover:bg-white/15 disabled:opacity-30"
                        >
                            Play
                        </button>
                    </div>
                </div>

                {/* --- BOTTOM LEFT (The Time Scrubber) --- */}
                <div className="absolute bottom-8 left-8 z-10 w-[600px] pointer-events-none flex flex-col items-start gap-4">
                    
                    {isCollectionPlaying && playingCollectionEvent && (
                        <div className="w-[430px] max-w-[calc(100vw-4rem)] mb-3 rounded-2xl border border-white/10 bg-[#060606]/90 backdrop-blur-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.65)] pointer-events-auto">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-300">{playingCollectionEvent.timeline.title}</p>
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mt-1">{formatRangeDate(playingCollectionEvent)}</p>
                                </div>
                                <span className="shrink-0 rounded-full bg-indigo-500/15 border border-indigo-500/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-indigo-300">
                                    {collectionStep + 1} / {activeCollectionEventIds.length}
                                </span>
                            </div>
                            <h3 className="mt-3 text-xl font-black leading-tight text-white">{playingCollectionEvent.title}</h3>
                            <div className="mt-3 max-h-36 overflow-y-auto pr-2 text-sm leading-relaxed text-white/65" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.12) transparent' }}>
                                {playingCollectionEvent.description}
                            </div>
                        </div>
                    )}

                    {/* Collection Active Indicator */}
                    {activeCollection && (
                        <div className="bg-indigo-600/90 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 border border-indigo-500/50 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Active Collection: {activeCollection.name}
                        </div>
                    )}

                    {activeCollectionRange && (
                        <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 bg-black/50 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                            Collection Period: {formatRangeDate(activeCollectionRange.start)} - {formatRangeDate(activeCollectionRange.end)}
                        </div>
                    )}

                    {isCollectionPlaying ? (
                        <div className="flex items-center gap-3 bg-[#060606]/90 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto">
                            <button
                                onClick={() => selectCollectionStep(collectionStep - 1)}
                                disabled={collectionStep === 0}
                                className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-30"
                                title="Previous collection event"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div className="min-w-72 px-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                                    Event {collectionStep + 1} of {activeCollectionEventIds.length}
                                </p>
                                <p className="text-sm font-bold text-white truncate">
                                    {allAvailableEvents.find(event => event.id === activeCollectionEventIds[collectionStep])?.title}
                                </p>
                            </div>
                            <button
                                onClick={() => selectCollectionStep(collectionStep + 1)}
                                disabled={collectionStep >= activeCollectionEventIds.length - 1}
                                className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-30"
                                title="Next collection event"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                    <>
                    {/* Active Time Block Label */}
                    <div className="relative group pointer-events-auto">
                        <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <h2 
                            onClick={() => setIsTimeJumpOpen(!isTimeJumpOpen)}
                            className="relative text-5xl md:text-7xl font-black tracking-tighter text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] cursor-pointer hover:text-indigo-300 transition-colors" 
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                            title="Click to jump to a specific year"
                        >
                            {timeBlock.label}
                        </h2>
                        
                        {/* Time Jump Popover */}
                        {isTimeJumpOpen && (
                            <form onSubmit={handleTimeJump} className="absolute bottom-full left-0 mb-4 bg-[#060606]/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center gap-2">
                                <input 
                                    type="number"
                                    autoFocus
                                    placeholder="Enter Year (e.g. 1945)"
                                    value={timeJumpInput}
                                    onChange={e => setTimeJumpInput(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm outline-none focus:border-indigo-500 w-48"
                                />
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors">Jump</button>
                            </form>
                        )}
                    </div>

                    {/* Sub-label Date bounds */}
                    <div className="text-xs font-mono text-indigo-300/80 uppercase tracking-widest pl-1">
                        {timeBlock.subLabel}
                    </div>

                    {/* Scrubber Controls */}
                    <div className="flex items-center gap-2 bg-[#060606]/90 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto w-full">
                        
                        {/* Prev Button */}
                        <button 
                            onClick={() => stepTime(-1)}
                            disabled={granularity === 'All Time' || !!activeCollection}
                            className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        {/* Granularity Selector */}
                        <div className="flex-1 flex justify-center gap-1 sm:gap-2 px-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                            {(['All Time', 'Century', 'Decade', 'Year', 'Month', 'Day'] as Granularity[]).map(gran => (
                                <button
                                    key={gran}
                                    onClick={() => setGranularity(gran)}
                                    disabled={!!activeCollection}
                                    className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap disabled:opacity-50 ${granularity === gran ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                                >
                                    {gran}
                                </button>
                            ))}
                        </div>

                        {/* Next Button */}
                        <button 
                            onClick={() => stepTime(1)}
                            disabled={granularity === 'All Time' || !!activeCollection}
                            className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                    </>
                    )}

                    {/* Stats */}
                    <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/5 flex items-center gap-2">
                        {loading ? (
                            <><div className="w-2 h-2 rounded-full border border-indigo-500 border-t-transparent animate-spin" /> Loading Events...</>
                        ) : (
                            <><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> {activeEvents.length} Events Visible</>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
