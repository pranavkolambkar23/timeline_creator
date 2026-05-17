"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import MasterMapEditor from "@/components/timeline/MasterMapEditor";
import ImportModal from "@/components/timeline/ImportModal";
import AiImportModal from "@/components/timeline/AiImportModal";

type EventType = {
    id?: string;
    title: string;
    description: string;
    date: string;
    linkedFeatureIds: string[];
};

const CATEGORIES = ["General", "History", "Technology", "Science", "Art", "Sports"];

const GEO_TYPE_META: Record<string, { color: string; bg: string; border: string; label: string; symbol: string }> = {
    Point:      { color: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/30',    label: 'Point',   symbol: '●' },
    LineString: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Route',   symbol: '—' },
    Polygon:    { color: 'text-violet-400',   bg: 'bg-violet-500/10',  border: 'border-violet-500/30',  label: 'Zone',    symbol: '◆' },
};

function coordKey(geometry: any): string {
    try { return JSON.stringify(geometry.coordinates).slice(0, 80); }
    catch { return Math.random().toString(); }
}

function formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

export default function EditTimeline() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [title, setTitle]       = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("General");
    const [tagsInput, setTagsInput] = useState("");
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const [masterGeoJson, setMasterGeoJson] = useState<any>({ type: 'FeatureCollection', features: [] });
    const [events, setEvents]     = useState<EventType[]>([]);
    const [activeEventIndex, setActiveEventIndex] = useState<number | null>(null);
    const [highlightedFeatureId, setHighlightedFeatureId] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const featureNamesRef = useRef<Record<string, string>>({});
    const eventRefs = useRef<(HTMLDivElement | null)[]>([]);

    // ─── Fetch ────────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchTimeline = async () => {
            try {
                const res = await fetch(`/api/timeline/${id}`);
                if (!res.ok) throw new Error("Fetch failed");
                const data = await res.json();

                setTitle(data.title);
                setDescription(data.description);
                setCategory(data.category);
                setTagsInput(data.tags.join(", "));

                const featuresByCoordKey: Record<string, { feature: any; stableId: string }> = {};

                const reconstructedEvents = data.timelineEvents.map((e: any) => {
                    const linkedIds: string[] = [];

                    // Normalise bare Feature OR FeatureCollection OR null
                    const rawFeatures: any[] = !e.locationData
                        ? []
                        : e.locationData.type === 'FeatureCollection' && Array.isArray(e.locationData.features)
                        ? e.locationData.features
                        : e.locationData.type === 'Feature'
                        ? [e.locationData]
                        : [];

                    rawFeatures.forEach((feature: any) => {
                        const key = coordKey(feature.geometry);
                        if (!featuresByCoordKey[key]) {
                            const stableId = feature.id || `f_${Object.keys(featuresByCoordKey).length}_${Math.random().toString(36).slice(2, 7)}`;
                            if (!feature.properties) feature.properties = {};
                            const name = feature.properties.name
                                || feature.properties.type
                                || `${feature.geometry.type} · ${e.title.slice(0, 12)}`;
                            feature.properties.name = name;
                            featureNamesRef.current[stableId] = name;
                            featuresByCoordKey[key] = { feature: { ...feature, id: stableId }, stableId };
                        }
                        linkedIds.push(featuresByCoordKey[key].stableId);
                    });

                    return {
                        id: e.id,
                        title: e.title,
                        description: e.description,
                        date: new Date(e.date).toISOString().split('T')[0],
                        linkedFeatureIds: linkedIds,
                    };
                });

                const allFeatures = Object.values(featuresByCoordKey).map(v => v.feature);
                setMasterGeoJson({ type: 'FeatureCollection', features: allFeatures });
                setEvents(reconstructedEvents);
            } catch {
                router.push("/admin");
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchTimeline();
    }, [id, router]);

    // ─── Map ──────────────────────────────────────────────────────────────────
    const handleMapChange = useCallback((newData: any) => {
        setMasterGeoJson(() => ({
            ...newData,
            features: newData.features.map((f: any) => ({
                ...f,
                properties: {
                    ...(f.properties || {}),
                    name: featureNamesRef.current[f.id] ?? f.properties?.name ?? '',
                },
            })),
        }));
    }, []);

    const handleDeleteFeature = useCallback((featureId: string) => {
        delete featureNamesRef.current[featureId];
        setMasterGeoJson((prev: any) => ({
            ...prev,
            features: prev.features.filter((f: any) => f.id !== featureId),
        }));
        setEvents(prev => prev.map(ev => ({
            ...ev,
            linkedFeatureIds: ev.linkedFeatureIds.filter(fid => fid !== featureId),
        })));
    }, []);

    const updateFeatureName = (featureId: string, newName: string) => {
        featureNamesRef.current[featureId] = newName;
        setMasterGeoJson((prev: any) => ({
            ...prev,
            features: prev.features.map((f: any) =>
                f.id === featureId ? { ...f, properties: { ...f.properties, name: newName } } : f
            ),
        }));
    };

    // ─── Events ───────────────────────────────────────────────────────────────
    const handleEventChange = (index: number, field: keyof EventType, value: string) => {
        setEvents(prev => {
            const next = [...prev];
            (next[index] as any)[field] = value;
            return next;
        });
    };

    const toggleFeatureLink = (eventIndex: number, featureId: string) => {
        setEvents(prev => {
            const next = [...prev];
            const ids = next[eventIndex].linkedFeatureIds;
            next[eventIndex] = {
                ...next[eventIndex],
                linkedFeatureIds: ids.includes(featureId)
                    ? ids.filter(i => i !== featureId)
                    : [...ids, featureId],
            };
            return next;
        });
    };

    const addEvent = () => {
        const idx = events.length;
        setEvents(prev => [...prev, { title: '', description: '', date: '', linkedFeatureIds: [] }]);
        setActiveEventIndex(idx);
        setTimeout(() => {
            eventRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const removeEvent = (index: number) => {
        setEvents(prev => prev.filter((_, i) => i !== index));
        setActiveEventIndex(prev => {
            if (prev === null || prev === index) return null;
            return prev > index ? prev - 1 : prev;
        });
    };

    // ─── Import ───────────────────────────────────────────────────────────────
    const handleImport = (importedEvents: any[]) => {
        const newFeatures: any[] = [];
        const existingFeatures = masterGeoJson.features || [];
        
        const newEvents = importedEvents.map(ev => {
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
            setMasterGeoJson((prev: any) => ({
                ...prev,
                features: [...prev.features, ...newFeatures]
            }));
        }

        setEvents((prevEvents) => [...prevEvents, ...newEvents]);
    };

    // ─── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!confirm("Are you sure you want to completely delete this timeline? This cannot be undone.")) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/timeline/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Delete failed");
            router.push("/");
            router.refresh();
        } catch {
            alert("Failed to delete timeline");
            setIsDeleting(false);
        }
    };

    // ─── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        for (const [i, ev] of events.entries()) {
            if (!ev.date || isNaN(new Date(ev.date).getTime())) {
                alert(`Event "${ev.title || `#${i + 1}`}" is missing a valid date.`);
                return;
            }
        }
        setSaving(true);
        setSaveStatus('saving');
        try {
            const finalEvents = events.map(ev => ({
                ...ev,
                locationData: (() => {
                    const linked = masterGeoJson.features.filter((f: any) => ev.linkedFeatureIds.includes(f.id));
                    return linked.length > 0 ? { type: 'FeatureCollection', features: linked } : null;
                })(),
            }));
            const res = await fetch(`/api/timeline/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title, description, category,
                    tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
                    events: finalEvents,
                }),
            });
            if (!res.ok) throw new Error('Save failed');
            setSaveStatus('saved');
            setTimeout(() => {
                router.push(`/timeline/${id}`);
                router.refresh();
            }, 800);
        } catch {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } finally {
            setSaving(false);
        }
    };

    // ─── Derived ──────────────────────────────────────────────────────────────
    const activeEvent = activeEventIndex !== null ? events[activeEventIndex] : null;
    const activeLinkedIds = activeEvent?.linkedFeatureIds ?? [];

    const featuresSortedForActive = [...masterGeoJson.features].sort((a: any, b: any) => {
        const aL = activeLinkedIds.includes(a.id) ? 0 : 1;
        const bL = activeLinkedIds.includes(b.id) ? 0 : 1;
        return aL - bL;
    });

    // ─── Loading ──────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="h-screen bg-[#080808] flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-12 h-12 border border-indigo-500/30 rounded-full animate-ping absolute inset-0" />
                <div className="w-12 h-12 border-t border-indigo-500 rounded-full animate-spin" />
            </div>
            <div className="text-center">
                <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-indigo-400/60">Loading Timeline Studio</p>
                <p className="text-[8px] font-mono text-white/20 mt-1 tracking-widest">ID: {id}</p>
            </div>
        </div>
    );

    const totalFeatures = masterGeoJson.features.length;
    const linkedAcrossAll = new Set(events.flatMap(e => e.linkedFeatureIds)).size;

    return (
        <div className="h-screen flex flex-col bg-[#080808] text-white overflow-hidden">
            <Header />

            <div className="flex-grow flex overflow-hidden">

                {/* ══════════════════════════════════════════════════════════════
                    LEFT — MAP CANVAS
                ══════════════════════════════════════════════════════════════ */}
                <div className="w-[55%] h-full flex flex-col relative border-r border-white/[0.06]">

                    {/* Map header bar */}
                    <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#080808] border-b border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            </div>
                            <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">Spatial Canvas</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[8px] font-mono text-white/20">
                                {totalFeatures} FEAT · {linkedAcrossAll} LINKED
                            </span>
                        </div>
                    </div>

                    {/* Map */}
                    <div className="flex-grow relative">
                        <MasterMapEditor
                            initialData={masterGeoJson}
                            onChange={handleMapChange}
                            onDeleteFeature={handleDeleteFeature}
                            selectedFeatureId={highlightedFeatureId}
                        />

                        {/* Active event overlay */}
                        {activeEvent && (
                            <div className="absolute bottom-4 left-4 right-4 z-[1000] pointer-events-none">
                                <div className="flex items-center gap-3 bg-[#0a0a0a]/90 backdrop-blur-md border border-indigo-500/20 rounded-xl px-4 py-2.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse flex-shrink-0" />
                                    <div className="flex-grow min-w-0">
                                        <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-indigo-300/80 truncate">
                                            EDITING — {activeEvent.title || 'Untitled Event'}
                                        </p>
                                    </div>
                                    <span className="text-[8px] font-mono text-indigo-400/40 flex-shrink-0">
                                        {activeLinkedIds.length} layer{activeLinkedIds.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Feature chips strip */}
                    {totalFeatures > 0 && (
                        <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#0a0a0a] px-4 py-3">
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                                <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-white/20 flex-shrink-0 pr-2 border-r border-white/10 mr-1">
                                    LAYERS
                                </span>
                                {masterGeoJson.features.map((f: any) => {
                                    const meta = GEO_TYPE_META[f.geometry.type] ?? GEO_TYPE_META.Point;
                                    const isHighlighted = highlightedFeatureId === f.id;
                                    const isLinkedToActive = activeLinkedIds.includes(f.id);
                                    return (
                                        <div
                                            key={f.id}
                                            className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[9px] font-mono cursor-default transition-all duration-150
                                                ${isLinkedToActive
                                                    ? `${meta.bg} ${meta.border} ${meta.color}`
                                                    : isHighlighted
                                                    ? 'bg-white/5 border-white/20 text-white/60'
                                                    : 'bg-white/[0.02] border-white/[0.06] text-white/30'
                                                }`}
                                            onMouseEnter={() => setHighlightedFeatureId(f.id)}
                                            onMouseLeave={() => setHighlightedFeatureId(null)}
                                            title={`${meta.label}: ${f.properties?.name || f.id}`}
                                        >
                                            <span className="text-[8px]">{meta.symbol}</span>
                                            <span className="max-w-[80px] truncate">
                                                {f.properties?.name || `${meta.label} ${String(f.id).slice(0, 4)}`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    RIGHT — STUDIO PANEL
                ══════════════════════════════════════════════════════════════ */}
                <div className="w-[45%] h-full flex flex-col bg-[#060606]">

                    {/* Top bar */}
                    <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[#080808]">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-mono uppercase tracking-[0.4em] text-indigo-400/50">Timeline Studio</span>
                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                <span className="text-[8px] font-mono text-white/20">{events.length} events</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/40 text-[10px] font-mono text-rose-400 transition-all active:scale-95 disabled:opacity-50"
                                title="Delete Timeline"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setIsAiModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/40 text-[10px] font-mono text-amber-400 transition-all active:scale-95"
                            >
                                <span>✨ AI Assistant</span>
                            </button>
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 text-[10px] font-mono text-white/60 transition-all active:scale-95"
                            >
                                <span>🪄 Import Data</span>
                            </button>
                            <button
                                onClick={handleSubmit}
                            disabled={saving}
                            className={`relative flex items-center gap-2 px-5 py-2 rounded-lg text-[9px] font-mono uppercase tracking-[0.25em] transition-all duration-200 border
                                ${saveStatus === 'saved'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : saveStatus === 'error'
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                    : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/20 active:scale-95'
                                }
                                disabled:opacity-50`}
                        >
                            {saveStatus === 'saving' && (
                                <div className="w-3 h-3 border border-indigo-400/50 border-t-indigo-400 rounded-full animate-spin" />
                            )}
                            {saveStatus === 'saved' && <span>✓</span>}
                            {saveStatus === 'error' && <span>✗</span>}
                            {saveStatus === 'saving' ? 'Archiving' : saveStatus === 'saved' ? 'Archived' : saveStatus === 'error' ? 'Failed' : 'Archive'}
                        </button>
                        </div>
                    </div>

                    {/* Scrollable body */}
                    <div className="flex-grow overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#ffffff10 transparent' }}>

                        {/* ── Timeline metadata ── */}
                        <div className="px-6 py-5 border-b border-white/[0.06] space-y-3">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-white/25">Timeline Details</span>
                                <div className="flex-grow h-px bg-white/[0.06]" />
                            </div>

                            <input
                                type="text"
                                placeholder="Timeline title…"
                                className="w-full bg-transparent border-b border-white/10 pb-2 text-white font-bold text-base outline-none placeholder:text-white/15 focus:border-indigo-500/40 transition-colors"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />

                            <textarea
                                placeholder="Description…"
                                rows={2}
                                className="w-full bg-transparent text-[11px] text-white/40 outline-none resize-none placeholder:text-white/15 font-mono leading-relaxed focus:text-white/60 transition-colors"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />

                            <div className="flex gap-3 pt-1">
                                <select
                                    className="flex-1 bg-white/[0.03] border border-white/[0.08] px-3 py-2 rounded-lg text-[10px] font-mono text-white/50 outline-none cursor-pointer hover:border-white/20 transition-colors"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
                                </select>
                                <input
                                    type="text"
                                    placeholder="tags, comma, separated"
                                    className="flex-1 bg-white/[0.03] border border-white/[0.08] px-3 py-2 rounded-lg text-[10px] font-mono text-white/50 outline-none placeholder:text-white/15 hover:border-white/20 focus:border-indigo-500/30 transition-colors"
                                    value={tagsInput}
                                    onChange={e => setTagsInput(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* ── Feature Name Editor ── */}
                        {totalFeatures > 0 && (
                            <div className="px-6 py-4 border-b border-white/[0.06]">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-white/25">Layer Registry</span>
                                    <div className="flex-grow h-px bg-white/[0.06]" />
                                    <span className="text-[8px] font-mono text-white/20">{totalFeatures}</span>
                                </div>
                                <div className="space-y-1.5">
                                    {masterGeoJson.features.map((f: any) => {
                                        const meta = GEO_TYPE_META[f.geometry.type] ?? GEO_TYPE_META.Point;
                                        const isLinkedToActive = activeLinkedIds.includes(f.id);
                                        return (
                                            <div
                                                key={f.id}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-150 group
                                                    ${isLinkedToActive
                                                        ? `${meta.bg} ${meta.border}`
                                                        : 'bg-white/[0.02] border-white/[0.05] hover:border-white/10'
                                                    }`}
                                                onMouseEnter={() => setHighlightedFeatureId(f.id)}
                                                onMouseLeave={() => setHighlightedFeatureId(null)}
                                            >
                                                <span className={`text-[10px] flex-shrink-0 ${meta.color}`}>{meta.symbol}</span>
                                                <span className={`text-[8px] font-mono uppercase flex-shrink-0 w-10 ${meta.color} opacity-60`}>{meta.label}</span>
                                                <input
                                                    className="flex-grow bg-transparent text-[10px] font-mono text-white/60 outline-none placeholder:text-white/15 min-w-0"
                                                    value={f.properties?.name || ''}
                                                    placeholder="name this layer…"
                                                    onChange={e => updateFeatureName(f.id, e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteFeature(f.id)}
                                                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-white/20 hover:text-rose-400 transition-all p-0.5"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Events ── */}
                        <div className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-white/25">Chronological Events</span>
                                <div className="flex-grow h-px bg-white/[0.06]" />
                                <button
                                    type="button"
                                    onClick={addEvent}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-indigo-400 text-[8px] font-mono uppercase tracking-[0.2em] transition-all active:scale-95"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                    New Event
                                </button>
                            </div>

                            {events.length === 0 && (
                                <div className="py-16 text-center border border-dashed border-white/[0.06] rounded-xl">
                                    <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/20">No events recorded</p>
                                    <button
                                        type="button"
                                        onClick={addEvent}
                                        className="mt-3 text-indigo-400/60 text-[9px] font-mono uppercase tracking-widest hover:text-indigo-400 transition-colors"
                                    >
                                        + Add first event
                                    </button>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                {events.map((event, index) => {
                                    const isOpen = activeEventIndex === index;
                                    const hasDate = event.date && !isNaN(new Date(event.date).getTime());
                                    const linkedCount = event.linkedFeatureIds.length;

                                    return (
                                        <div
                                            key={index}
                                            ref={el => { eventRefs.current[index] = el; }}
                                            className={`rounded-xl border overflow-hidden transition-all duration-200
                                                ${isOpen
                                                    ? 'border-indigo-500/25 bg-indigo-500/[0.04]'
                                                    : 'border-white/[0.06] bg-white/[0.015] hover:border-white/10'
                                                }`}
                                        >
                                            {/* Collapsed row */}
                                            <button
                                                type="button"
                                                onClick={() => setActiveEventIndex(isOpen ? null : index)}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-left group"
                                            >
                                                {/* Index / sequence number */}
                                                <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-mono font-bold border transition-colors
                                                    ${isOpen
                                                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                                                        : 'bg-white/[0.03] border-white/[0.08] text-white/30 group-hover:border-white/20'
                                                    }`}>
                                                    {String(index + 1).padStart(2, '0')}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-grow min-w-0">
                                                    <p className={`text-[11px] font-bold truncate transition-colors ${event.title ? (isOpen ? 'text-white' : 'text-white/70') : 'text-white/20 italic'}`}>
                                                        {event.title || 'Untitled Event'}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`text-[8px] font-mono ${hasDate ? 'text-white/30' : 'text-rose-400/50'}`}>
                                                            {hasDate ? formatDateDisplay(event.date) : 'NO DATE'}
                                                        </span>
                                                        {linkedCount > 0 && (
                                                            <>
                                                                <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                                                                <span className="text-[8px] font-mono text-indigo-400/60">
                                                                    {linkedCount}L
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Linked layer dots */}
                                                {linkedCount > 0 && (
                                                    <div className="flex-shrink-0 flex gap-0.5">
                                                        {event.linkedFeatureIds.slice(0, 4).map(fid => {
                                                            const feat = masterGeoJson.features.find((f: any) => f.id === fid);
                                                            const meta = feat ? (GEO_TYPE_META[feat.geometry.type] ?? GEO_TYPE_META.Point) : GEO_TYPE_META.Point;
                                                            return <span key={fid} className={`w-1.5 h-1.5 rounded-full ${meta.color.replace('text-', 'bg-').replace('/400', '/60')}`} />;
                                                        })}
                                                        {linkedCount > 4 && <span className="text-[7px] font-mono text-white/20 ml-0.5">+{linkedCount - 4}</span>}
                                                    </div>
                                                )}

                                                {/* Chevron */}
                                                <svg className={`w-3.5 h-3.5 text-white/20 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {/* ── Expanded body ── */}
                                            {isOpen && (
                                                <div className="px-4 pb-4 pt-1 border-t border-white/[0.06] space-y-3">

                                                    {/* Date + Title */}
                                                    <div className="flex gap-2 pt-3">
                                                        <div className="flex-shrink-0">
                                                            <label className="text-[7px] font-mono uppercase tracking-[0.3em] text-white/25 block mb-1">Date</label>
                                                            <input
                                                                type="date"
                                                                className={`bg-white/[0.04] border px-2.5 py-2 rounded-lg text-[10px] font-mono text-white/70 outline-none transition-colors w-[140px]
                                                                    ${!hasDate && event.date ? 'border-rose-500/40 text-rose-400' : 'border-white/[0.08] focus:border-indigo-500/40'}`}
                                                                value={event.date}
                                                                onChange={e => handleEventChange(index, 'date', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex-grow min-w-0">
                                                            <label className="text-[7px] font-mono uppercase tracking-[0.3em] text-white/25 block mb-1">Title</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Event title…"
                                                                className="w-full bg-white/[0.04] border border-white/[0.08] px-2.5 py-2 rounded-lg text-[11px] font-bold text-white/80 outline-none placeholder:text-white/15 focus:border-indigo-500/40 transition-colors"
                                                                value={event.title}
                                                                onChange={e => handleEventChange(index, 'title', e.target.value)}
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeEvent(index)}
                                                            className="flex-shrink-0 self-end p-2 text-white/10 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                                            title="Delete event"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>

                                                    {/* Description */}
                                                    <div>
                                                        <label className="text-[7px] font-mono uppercase tracking-[0.3em] text-white/25 block mb-1">Narrative</label>
                                                        <textarea
                                                            placeholder="Describe this event…"
                                                            rows={3}
                                                            className="w-full bg-white/[0.04] border border-white/[0.08] px-2.5 py-2 rounded-lg text-[10px] font-mono text-white/50 outline-none resize-none placeholder:text-white/10 focus:border-indigo-500/30 focus:text-white/70 transition-all leading-relaxed"
                                                            value={event.description}
                                                            onChange={e => handleEventChange(index, 'description', e.target.value)}
                                                        />
                                                    </div>

                                                    {/* Layer linking */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-[7px] font-mono uppercase tracking-[0.3em] text-white/25">Link Spatial Layers</label>
                                                            {linkedCount > 0 && (
                                                                <span className="text-[7px] font-mono text-indigo-400/50">{linkedCount} linked</span>
                                                            )}
                                                        </div>

                                                        {masterGeoJson.features.length === 0 ? (
                                                            <p className="text-[9px] font-mono italic text-white/15 py-2">
                                                                Draw features on the map to link them here.
                                                            </p>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {featuresSortedForActive.map((f: any) => {
                                                                    const isLinked = event.linkedFeatureIds.includes(f.id);
                                                                    const meta = GEO_TYPE_META[f.geometry.type] ?? GEO_TYPE_META.Point;
                                                                    return (
                                                                        <button
                                                                            key={f.id}
                                                                            type="button"
                                                                            onClick={() => toggleFeatureLink(index, f.id)}
                                                                            onMouseEnter={() => setHighlightedFeatureId(f.id)}
                                                                            onMouseLeave={() => setHighlightedFeatureId(null)}
                                                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9px] font-mono transition-all duration-150 active:scale-95
                                                                                ${isLinked
                                                                                    ? `${meta.bg} ${meta.border} ${meta.color}`
                                                                                    : 'bg-white/[0.03] border-white/[0.08] text-white/35 hover:border-white/20 hover:text-white/60'
                                                                                }`}
                                                                        >
                                                                            <span className="text-[8px]">{meta.symbol}</span>
                                                                            <span className="max-w-[100px] truncate">
                                                                                {f.properties?.name || `${meta.label} ${String(f.id).slice(0, 4)}`}
                                                                            </span>
                                                                            {isLinked && (
                                                                                <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                                </svg>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="h-20" />
                        </div>
                    </div>
                </div>
            </div>
            
            <ImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                onImport={handleImport} 
            />
            <AiImportModal 
                isOpen={isAiModalOpen} 
                onClose={() => setIsAiModalOpen(false)} 
                onImport={handleImport} 
            />
        </div>
    );
}