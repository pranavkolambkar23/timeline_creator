"use client";

import { KeyboardEvent, PointerEvent, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { EventType } from "@/hooks/useTimelineStudio";
import { compactHistoricalDisplayDate, historicalDisplayDate, isValidHistoricalDate, parseHistoricalDate, parseImportedHistoricalDate } from "@/lib/historicalDate";
import HistoricalDateEditor from "./HistoricalDateEditor";
import { useConfirm } from "@/hooks/useConfirm";
import MediaUploader from "./MediaUploader";

const CATEGORIES = ["General", "History", "Technology", "Science", "Art", "Sports"];

type StudioTab = "overview" | "events" | "features" | "media" | "ai" | "import";
type DrawerSnap = "low" | "middle" | "full";

const SNAP_HEIGHTS: Record<DrawerSnap, number> = {
    low: 18,
    middle: 56,
    full: 90,
};

const TABS: { id: StudioTab; label: string; ready: boolean }[] = [
    { id: "overview", label: "Overview", ready: true },
    { id: "events", label: "Events", ready: true },
    { id: "features", label: "Geospatial Features", ready: true },
    { id: "media", label: "Images & Audio", ready: true },
    { id: "ai", label: "AI Assistant", ready: true },
    { id: "import", label: "Import Data", ready: true },
];

type ParsedEvent = {
    title: string;
    description: string;
    date: string;
    locationStr: string;
    status: "pending" | "geocoding" | "ready" | "error";
    dateValid: boolean;
    coords?: [number, number];
};

type AiMetadata = {
    title?: string;
    description?: string;
    category?: string;
    tags?: string[];
};

type GeospatialFeature = {
    id?: string | number;
    geometry?: {
        type?: "Point" | "LineString" | "Polygon" | string;
        coordinates?: unknown;
    };
    properties?: Record<string, unknown>;
};

const GEO_TYPE_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    Point: { label: "Point", color: "text-sky-300", bg: "bg-sky-500/10", border: "border-sky-400/25", dot: "bg-sky-400" },
    LineString: { label: "Route", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-400/25", dot: "bg-emerald-400" },
    Polygon: { label: "Zone", color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-400/25", dot: "bg-violet-400" },
};

interface MobileTimelineStudioDrawerProps {
    mode: "create" | "edit";
    title: string;
    description: string;
    category: string;
    tagsInput: string;
    coverImage: string | null;
    coverImagePosition?: { x: number; y: number };
    coverImageZoom?: number;
    events: EventType[];
    features: GeospatialFeature[];
    activeEventIndex: number | null;
    saving: boolean;
    saveStatus: "idle" | "saving" | "saved" | "error";
    onTitleChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
    onTagsInputChange: (value: string) => void;
    onCoverImageChange: (url: string | null) => void;
    onCoverImagePositionChange?: (position: { x: number; y: number }) => void;
    onCoverImageZoomChange?: (zoom: number) => void;
    onActiveEventIndexChange: (index: number | null) => void;
    onEventChange: (index: number, field: keyof EventType, value: any) => void;
    onToggleFeatureLink: (eventIndex: number, featureId: string) => void;
    onFeatureNameChange: (featureId: string, value: string) => void;
    onAiImport: (events: ParsedEvent[], metadata?: AiMetadata) => void;
    onImport: (events: ParsedEvent[]) => void;
    onAddEvent: () => void;
    onRemoveEvent: (index: number) => void;
    onSubmit: () => void;
    isPreviewMode?: boolean;
    onPreviewToggle?: () => void;
}

function formatDate(date: string) {
    if (!date) return "No date";
    return isValidHistoricalDate(date) ? historicalDisplayDate({ displayDate: date }) : "Invalid date";
}

function featureDisplayName(feature: GeospatialFeature, index: number) {
    const type = feature.geometry?.type ?? "Feature";
    const meta = GEO_TYPE_META[type] ?? { label: type, color: "text-white/50", bg: "bg-white/[0.04]", border: "border-white/10", dot: "bg-white/40" };
    const name = feature.properties?.name;
    return typeof name === "string" && name.trim() ? name : `${meta.label} ${index + 1}`;
}

function FeatureGlyph({ type, className = "" }: { type: string; className?: string }) {
    const meta = GEO_TYPE_META[type] ?? { label: type, color: "text-white/50", bg: "bg-white/[0.04]", border: "border-white/10", dot: "bg-white/40" };

    if (type === "LineString") {
        return (
            <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${meta.border} ${meta.bg} ${className}`}>
                <span className={`h-0.5 w-5 rotate-[-35deg] rounded-full ${meta.dot}`} />
            </span>
        );
    }

    if (type === "Polygon") {
        return (
            <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${meta.border} ${meta.bg} ${className}`}>
                <span className={`h-4 w-4 rotate-45 rounded-[3px] ${meta.dot}`} />
            </span>
        );
    }

    return (
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${meta.border} ${meta.bg} ${className}`}>
            <span className={`h-3 w-3 rounded-full ${meta.dot} shadow-[0_0_0_3px_rgba(255,255,255,0.16)]`} />
        </span>
    );
}

function featureDetail(feature: GeospatialFeature) {
    const geometry = feature.geometry;
    if (!geometry) return "No geometry";
    if (geometry.type === "Point") return "Single map point";
    if (geometry.type === "LineString") {
        const points = Array.isArray(geometry.coordinates) ? geometry.coordinates.length : 0;
        return `${points} route point${points === 1 ? "" : "s"}`;
    }
    if (geometry.type === "Polygon") {
        const ring = Array.isArray(geometry.coordinates) && Array.isArray(geometry.coordinates[0]) ? geometry.coordinates[0] : [];
        const points = ring.length;
        return `${points} boundary point${points === 1 ? "" : "s"}`;
    }
    return geometry.type ?? "Feature";
}

function CustomDropdown({
    value,
    options,
    onChange,
}: {
    value: string;
    options: string[];
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left text-sm text-white/75">
                <span>{value}</span>
                <svg className={`h-4 w-4 text-white/35 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
                </svg>
            </button>
            {open && (
                <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#151515] shadow-2xl">
                    {options.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => {
                                onChange(option);
                                setOpen(false);
                            }}
                            className={`flex w-full items-center justify-between border-b border-white/[0.06] px-3 py-3 text-left text-sm last:border-0 ${option === value ? "bg-indigo-500/15 text-indigo-200" : "text-white/65"}`}
                        >
                            <span>{option}</span>
                            {option === value && <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300">Selected</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function TagChipInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const [draft, setDraft] = useState("");
    const tags = value.split(",").map((tag) => tag.trim()).filter(Boolean);

    const saveTags = (next: string[]) => {
        onChange(next.join(", "));
    };

    const commitDraft = (candidate = draft) => {
        const nextTag = candidate.trim();
        if (!nextTag) return setDraft("");
        if (!tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) saveTags([...tags, nextTag]);
        setDraft("");
    };

    const updateDraft = (value: string) => {
        if (!value.includes(",")) return setDraft(value);
        const parts = value.split(",");
        const nextDraft = value.endsWith(",") ? "" : parts.pop() ?? "";
        const nextTags = [...tags];
        parts.map((tag) => tag.trim()).filter(Boolean).forEach((tag) => {
            if (!nextTags.some((item) => item.toLowerCase() === tag.toLowerCase())) nextTags.push(tag);
        });
        saveTags(nextTags);
        setDraft(nextDraft);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "," || event.key === "Enter") {
            event.preventDefault();
            commitDraft();
        } else if (event.key === "Backspace" && !draft && tags.length) {
            saveTags(tags.slice(0, -1));
        }
    };

    return (
        <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 focus-within:border-indigo-400/50">
            {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 rounded-full border border-indigo-400/25 bg-indigo-500/15 px-2.5 py-1 text-xs text-indigo-100">
                    {tag}
                    <button type="button" onClick={() => saveTags(tags.filter((item) => item !== tag))} aria-label={`Remove ${tag}`} className="text-indigo-200/60">x</button>
                </span>
            ))}
            <input value={draft} onChange={(event) => updateDraft(event.target.value)} onKeyDown={onKeyDown} onBlur={() => commitDraft()} placeholder={tags.length ? "Add another" : "Add a tag"} className="min-w-[110px] flex-grow bg-transparent py-1 text-sm text-white outline-none placeholder:text-white/20" />
        </div>
    );
}

function MobileDateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return <HistoricalDateEditor value={value} onChange={onChange} compact />;
}

function EventFeatureLinker({
    event,
    eventIndex,
    features,
    onToggleFeatureLink,
}: {
    event: EventType;
    eventIndex: number;
    features: GeospatialFeature[];
    onToggleFeatureLink: (eventIndex: number, featureId: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const selectedCount = event.linkedFeatureIds.length;
    const normalizedQuery = query.trim().toLowerCase();
    const visibleFeatures = features
        .map((feature, featureIndex) => {
            const featureId = String(feature.id ?? "");
            const type = feature.geometry?.type ?? "Feature";
            const meta = GEO_TYPE_META[type] ?? { label: type, color: "text-white/50", bg: "bg-white/[0.04]", border: "border-white/10", dot: "bg-white/40" };
            const name = featureDisplayName(feature, featureIndex);
            const isLinked = featureId ? event.linkedFeatureIds.includes(featureId) : false;
            return { feature, featureIndex, featureId, type, meta, name, isLinked };
        })
        .filter(({ name, meta }) => {
            if (!normalizedQuery) return true;
            return `${name} ${meta.label}`.toLowerCase().includes(normalizedQuery);
        })
        .sort((a, b) => Number(b.isLinked) - Number(a.isLinked));

    return (
        <div>
            <span className="mb-1 block text-[9px] font-mono uppercase tracking-wider text-white/35">Link Spatial Layers</span>
            <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left text-sm text-white/65">
                <span>{selectedCount ? `${selectedCount} feature${selectedCount === 1 ? "" : "s"} linked` : "Select features"}</span>
                <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
                </svg>
            </button>
            {open && (
                features.length === 0 ? (
                    <p className="mt-2 rounded-xl border border-dashed border-white/10 px-3 py-3 text-xs leading-relaxed text-white/30">Draw features on the map to link them here.</p>
                ) : (
                    <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-1.5">
                        <div className="sticky top-0 z-10 bg-black/80 pb-1 backdrop-blur">
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search layers"
                                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-indigo-400/40"
                            />
                        </div>
                        {visibleFeatures.length === 0 ? (
                            <p className="px-3 py-5 text-center text-xs text-white/30">No matching features.</p>
                        ) : (
                            visibleFeatures.map(({ feature, featureIndex, featureId, type, meta, name, isLinked }) => (
                                <button
                                    key={featureId || featureIndex}
                                    type="button"
                                    disabled={!featureId}
                                    onClick={() => featureId && onToggleFeatureLink(eventIndex, featureId)}
                                    className={`flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition active:scale-[0.99] disabled:opacity-40 ${
                                        isLinked
                                            ? `${meta.bg} ${meta.border} ${meta.color}`
                                            : "border-white/[0.07] bg-white/[0.025] text-white/55"
                                    }`}
                                >
                                    <FeatureGlyph type={type} className="h-8 w-8 rounded-lg" />
                                    <span className="min-w-0 flex-grow">
                                        <span className="block truncate text-xs font-medium">{name}</span>
                                        <span className="mt-0.5 block text-[9px] font-mono uppercase tracking-wider text-white/30">{meta.label}</span>
                                    </span>
                                    <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${isLinked ? "border-current bg-white/10" : "border-white/15"}`}>
                                        {isLinked && (
                                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                )
            )}
        </div>
    );
}

function MobileAiAssistantPanel({
    onAiImport,
}: {
    onAiImport: (events: ParsedEvent[], metadata?: AiMetadata) => void;
}) {
    const [prompt, setPrompt] = useState("");
    const [files, setFiles] = useState<{ name: string; mimeType: string; base64: string }[]>([]);
    const [step, setStep] = useState<"input" | "processing" | "preview" | "geocoding">("input");
    const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
    const [metadata, setMetadata] = useState<AiMetadata | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetInput = () => {
        setStep("input");
        setParsedEvents([]);
        setMetadata(null);
        setErrorMsg(null);
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.length) return;

        const nextFiles: typeof files = [];
        for (let i = 0; i < event.target.files.length; i++) {
            const file = event.target.files[i];
            const reader = new FileReader();
            await new Promise<void>((resolve) => {
                reader.onload = () => {
                    nextFiles.push({
                        name: file.name,
                        mimeType: file.type || "application/octet-stream",
                        base64: reader.result as string,
                    });
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        }

        setFiles((current) => [...current, ...nextFiles]);
        event.target.value = "";
    };

    const handleGenerate = async () => {
        if (!prompt.trim() && files.length === 0) {
            setErrorMsg("Please provide a prompt or upload documents.");
            return;
        }

        setStep("processing");
        setErrorMsg(null);

        try {
            const res = await fetch("/api/ai-import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, files }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to process request");

            let eventsData: unknown[] = [];
            let nextMetadata: AiMetadata | null = null;

            if (Array.isArray(data)) {
                eventsData = data;
            } else if (data && typeof data === "object") {
                const record = data as Record<string, unknown>;
                eventsData = Array.isArray(record.events) ? record.events : [];
                nextMetadata = {
                    title: typeof record.title === "string" ? record.title : "",
                    description: typeof record.description === "string" ? record.description : "",
                    category: typeof record.category === "string" ? record.category : "General",
                    tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === "string") : [],
                };
            } else {
                throw new Error("AI returned invalid format");
            }

            const events = eventsData.map((item): ParsedEvent => {
                const ev = item && typeof item === "object" ? item as Record<string, unknown> : {};
                const rawDate = typeof ev.date === "string" || typeof ev.date === "number" ? String(ev.date) : "";
                const parsedDate = parseHistoricalDate(rawDate);
                return {
                    title: typeof ev.title === "string" && ev.title.trim() ? ev.title : "Untitled",
                    description: typeof ev.description === "string" ? ev.description : "",
                    date: parsedDate?.input || rawDate.trim(),
                    locationStr: typeof ev.locationStr === "string" ? ev.locationStr : "",
                    status: "pending",
                    dateValid: Boolean(parsedDate),
                };
            });

            setParsedEvents(events);
            setMetadata(nextMetadata);
            setStep("preview");
        } catch (error) {
            setErrorMsg(error instanceof Error ? error.message : "Failed to process request");
            setStep("input");
        }
    };

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const startGeocoding = async () => {
        if (parsedEvents.some((event) => !event.dateValid)) return;
        setStep("geocoding");

        const updatedEvents = [...parsedEvents];
        for (let i = 0; i < updatedEvents.length; i++) {
            const event = updatedEvents[i];
            if (!event.locationStr) {
                event.status = "ready";
                setParsedEvents([...updatedEvents]);
                continue;
            }

            event.status = "geocoding";
            setParsedEvents([...updatedEvents]);

            try {
                await sleep(1000);
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(event.locationStr)}`);
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    event.coords = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
                    event.status = "ready";
                } else {
                    event.status = "error";
                }
            } catch {
                event.status = "error";
            }

            setParsedEvents([...updatedEvents]);
        }

        await sleep(500);
        onAiImport(updatedEvents, metadata || undefined);
        setPrompt("");
        setFiles([]);
        resetInput();
    };

    return (
        <div className="space-y-4">
            <div>
                <p className="text-base font-semibold">AI Timeline Assistant</p>
                <p className="mt-1 text-xs leading-relaxed text-white/35">Paste travel plans, historical notes, or upload documents to generate events and map locations.</p>
            </div>

            {step === "input" && (
                <div className="space-y-4">
                    {errorMsg && (
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-xs text-rose-300">
                            {errorMsg}
                        </div>
                    )}

                    <label className="block">
                        <span className="mb-1.5 block text-[9px] font-mono uppercase tracking-[0.2em] text-white/35">Describe the trip or history</span>
                        <textarea
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            placeholder="Example: I am going to Paris on Oct 12, then taking a train to Lyon on Oct 15..."
                            rows={7}
                            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-amber-400/50"
                        />
                    </label>

                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/35">Attach documents</span>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-amber-300">
                                Add File
                            </button>
                        </div>
                        <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                        {files.length === 0 ? (
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-5 text-xs text-white/30">
                                PDF and image uploads supported
                            </button>
                        ) : (
                            <div className="space-y-2">
                                {files.map((file, index) => (
                                    <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/65">
                                        <span className="min-w-0 flex-grow truncate">{file.name}</span>
                                        <button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="text-white/35">
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={!prompt.trim() && files.length === 0}
                        className="w-full rounded-xl border border-amber-400/25 bg-amber-500/15 px-4 py-3 text-sm font-bold text-amber-200 transition active:scale-[0.98] disabled:opacity-45"
                    >
                        Generate Timeline
                    </button>
                </div>
            )}

            {step === "processing" && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-12 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-500/10 text-sm font-black text-amber-200">AI</div>
                    <p className="text-sm font-semibold text-white/80">Analyzing your data</p>
                    <p className="mt-1 text-xs text-white/35">Extracting events, dates, and locations.</p>
                </div>
            )}

            {(step === "preview" || step === "geocoding") && (
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-white/80">Preview AI Data</p>
                            <p className="mt-0.5 text-xs text-white/35">{parsedEvents.length} event{parsedEvents.length === 1 ? "" : "s"} extracted</p>
                        </div>
                        {step === "geocoding" && <span className="rounded-full border border-indigo-400/25 bg-indigo-500/15 px-2.5 py-1 text-[10px] text-indigo-200">Mapping</span>}
                    </div>

                    {metadata && (metadata.title || metadata.description || metadata.tags?.length) && (
                        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-3">
                            <p className="text-xs font-semibold text-amber-100">{metadata.title || "Suggested timeline details"}</p>
                            {metadata.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">{metadata.description}</p>}
                            {metadata.tags?.length ? <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-amber-200/60">{metadata.tags.join(", ")}</p> : null}
                        </div>
                    )}

                    <div className="space-y-2">
                        {parsedEvents.map((event, index) => (
                            <article key={`${event.title}-${index}`} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-white/80">{event.title}</p>
                                        <p className={`mt-0.5 text-[10px] font-mono uppercase tracking-wider ${event.dateValid ? "text-white/30" : "text-rose-300"}`}>
                                            {event.dateValid ? compactHistoricalDisplayDate(event.date) : event.date || "No date"}
                                        </p>
                                    </div>
                                    <span className={`flex-shrink-0 text-[10px] ${event.status === "ready" ? "text-emerald-300" : event.status === "error" ? "text-amber-300" : event.status === "geocoding" ? "text-indigo-300" : "text-white/30"}`}>
                                        {!event.dateValid ? "Invalid date" : event.status === "geocoding" ? "Searching" : event.status === "ready" ? "Ready" : event.status === "error" ? "No coords" : "Pending"}
                                    </span>
                                </div>
                                {event.locationStr && <p className="mt-2 text-xs text-white/40">{event.locationStr}</p>}
                            </article>
                        ))}
                    </div>

                    {step === "preview" && (
                        <div className="flex gap-2 pt-1">
                            <button type="button" onClick={resetInput} className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs font-semibold text-white/55">
                                Edit Prompt
                            </button>
                            <button
                                type="button"
                                onClick={startGeocoding}
                                disabled={parsedEvents.some((event) => !event.dateValid)}
                                className="flex-1 rounded-xl border border-indigo-400/25 bg-indigo-500/20 px-3 py-3 text-xs font-semibold text-indigo-100 disabled:opacity-45"
                            >
                                Import & Auto-Map
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function cellValue(row: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && String(value).trim()) return value;
    }
    return "";
}

function numericCell(value: unknown) {
    if (typeof value === "number") return value;
    const parsed = Number(String(value ?? "").trim());
    return Number.isFinite(parsed) ? parsed : null;
}

function MobileImportDataPanel({ onImport }: { onImport: (events: ParsedEvent[]) => void }) {
    const [step, setStep] = useState<"upload" | "preview" | "geocoding">("upload");
    const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
    const [fileName, setFileName] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetUpload = () => {
        setStep("upload");
        setParsedEvents([]);
        setFileName("");
        setErrorMsg(null);
    };

    const processFile = async (file: File) => {
        setErrorMsg(null);
        setFileName(file.name);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) throw new Error("No sheet found");

            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
            const events = rows.map((row): ParsedEvent => {
                const rawDate = cellValue(row, ["Date", "date", "When", "when", "Year", "year"]);
                const date = rawDate ? parseImportedHistoricalDate(rawDate)?.input || String(rawDate).trim() : "";
                const lat = numericCell(cellValue(row, ["Latitude", "latitude", "Lat", "lat"]));
                const lon = numericCell(cellValue(row, ["Longitude", "longitude", "Lng", "lng", "Lon", "lon"]));
                const hasCoords = lat !== null && lon !== null;

                return {
                    title: String(cellValue(row, ["Title", "title", "Event", "event", "Name", "name"])),
                    description: String(cellValue(row, ["Description", "description", "Details", "details", "Notes", "notes"])),
                    date,
                    dateValid: Boolean(parseHistoricalDate(date)),
                    locationStr: String(cellValue(row, ["Location", "location", "City", "city", "Place", "place"])),
                    status: hasCoords ? "ready" : "pending",
                    coords: hasCoords ? [lon, lat] : undefined,
                };
            }).filter((event) => event.title || event.date || event.locationStr || event.coords);

            setParsedEvents(events);
            setStep("preview");
        } catch {
            setErrorMsg("Could not read that file. Try the template format or another Excel/CSV file.");
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.[0]) await processFile(event.target.files[0]);
        event.target.value = "";
    };

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const startGeocoding = async () => {
        if (parsedEvents.length === 0 || parsedEvents.some((event) => !event.dateValid)) return;
        setStep("geocoding");

        const updatedEvents = [...parsedEvents];
        for (let i = 0; i < updatedEvents.length; i++) {
            const event = updatedEvents[i];
            if (event.coords || !event.locationStr) {
                event.status = "ready";
                setParsedEvents([...updatedEvents]);
                continue;
            }

            event.status = "geocoding";
            setParsedEvents([...updatedEvents]);

            try {
                await sleep(1000);
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(event.locationStr)}`);
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    event.coords = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
                    event.status = "ready";
                } else {
                    event.status = "error";
                }
            } catch {
                event.status = "error";
            }

            setParsedEvents([...updatedEvents]);
        }

        await sleep(500);
        onImport(updatedEvents);
        resetUpload();
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { Date: "23-08-2000", Title: "Sample event", Description: "Describe what happened", Location: "Delhi, India" },
            { Date: "4500 BCE", Title: "Ancient sample", Description: "BCE and approximate dates are supported", Location: "Uruk, Iraq" },
        ]);
        const guide = XLSX.utils.json_to_sheet([
            { "Supported Date Format": "23-08-2000", Meaning: "Exact date using DD-MM-YYYY" },
            { "Supported Date Format": "08-2000", Meaning: "Month and year only" },
            { "Supported Date Format": "2000", Meaning: "Year only" },
            { "Supported Date Format": "4500 BCE", Meaning: "Known BCE year" },
            { "Supported Date Format": "c. 4500 BCE", Meaning: "Approximate BCE year" },
            { "Supported Date Format": "5th century BCE", Meaning: "Century-level BCE date" },
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Events");
        XLSX.utils.book_append_sheet(wb, guide, "Date Format Guide");
        XLSX.writeFile(wb, "Timeline_Template.xlsx");
    };

    return (
        <div className="space-y-4">
            <div>
                <p className="text-base font-semibold">Import Data</p>
                <p className="mt-1 text-xs leading-relaxed text-white/35">Upload Excel or CSV rows, preview them, then auto-map locations into timeline events.</p>
            </div>

            {step === "upload" && (
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-400/25 bg-indigo-500/[0.07] px-5 py-6 text-center active:scale-[0.99]"
                    >
                        <input ref={fileInputRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-400/25 bg-indigo-500/15 text-sm font-black text-indigo-200">XLS</span>
                        <span className="mt-3 text-sm font-semibold text-white/80">Choose Excel or CSV file</span>
                        <span className="mt-1 text-[10px] font-mono uppercase tracking-wider text-white/30">.xlsx .xls .csv</span>
                    </button>

                    {fileName && <p className="text-xs text-white/35">Selected: {fileName}</p>}
                    {errorMsg && <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{errorMsg}</p>}

                    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-white/70">Need the right columns?</p>
                            <p className="mt-0.5 text-[10px] text-white/30">Date, Title, Description, Location</p>
                        </div>
                        <button type="button" onClick={downloadTemplate} className="flex-shrink-0 rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-3 py-2 text-[10px] font-semibold text-indigo-200">
                            Template
                        </button>
                    </div>
                </div>
            )}

            {(step === "preview" || step === "geocoding") && (
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-white/80">Preview Import</p>
                            <p className="mt-0.5 text-xs text-white/35">{parsedEvents.length} event{parsedEvents.length === 1 ? "" : "s"} found</p>
                        </div>
                        {step === "geocoding" && <span className="rounded-full border border-indigo-400/25 bg-indigo-500/15 px-2.5 py-1 text-[10px] text-indigo-200">Mapping</span>}
                    </div>

                    <div className="space-y-2">
                        {parsedEvents.map((event, index) => (
                            <article key={`${event.title}-${index}`} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-white/80">{event.title || "Untitled Event"}</p>
                                        <p className={`mt-0.5 text-[10px] font-mono uppercase tracking-wider ${event.dateValid ? "text-white/30" : "text-rose-300"}`}>
                                            {event.dateValid ? compactHistoricalDisplayDate(event.date) : event.date || "No date"}
                                        </p>
                                    </div>
                                    <span className={`flex-shrink-0 text-[10px] ${event.status === "ready" ? "text-emerald-300" : event.status === "error" ? "text-amber-300" : event.status === "geocoding" ? "text-indigo-300" : "text-white/30"}`}>
                                        {!event.dateValid ? "Invalid date" : event.status === "geocoding" ? "Searching" : event.status === "ready" ? "Ready" : event.status === "error" ? "No coords" : "Pending"}
                                    </span>
                                </div>
                                {event.locationStr && <p className="mt-2 text-xs text-white/40">{event.locationStr}</p>}
                            </article>
                        ))}
                    </div>

                    {step === "preview" && (
                        <div className="flex gap-2 pt-1">
                            <button type="button" onClick={resetUpload} className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs font-semibold text-white/55">
                                Choose Again
                            </button>
                            <button
                                type="button"
                                onClick={startGeocoding}
                                disabled={parsedEvents.length === 0 || parsedEvents.some((event) => !event.dateValid)}
                                className="flex-1 rounded-xl border border-indigo-400/25 bg-indigo-500/20 px-3 py-3 text-xs font-semibold text-indigo-100 disabled:opacity-45"
                            >
                                Import & Auto-Map
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function MobileTimelineStudioDrawer({
    mode,
    title,
    description,
    category,
    tagsInput,
    coverImage,
    coverImagePosition = { x: 50, y: 50 },
    coverImageZoom = 1,
    events,
    features,
    activeEventIndex,
    saving,
    saveStatus,
    onTitleChange,
    onDescriptionChange,
    onCategoryChange,
    onTagsInputChange,
    onCoverImageChange,
    onCoverImagePositionChange,
    onCoverImageZoomChange,
    onActiveEventIndexChange,
    onEventChange,
    onToggleFeatureLink,
    onFeatureNameChange,
    onAiImport,
    onImport,
    onAddEvent,
    onRemoveEvent,
    onSubmit,
    isPreviewMode,
    onPreviewToggle,
}: MobileTimelineStudioDrawerProps) {
    const [snap, setSnap] = useState<DrawerSnap>("middle");
    const [tab, setTab] = useState<StudioTab>("overview");
    const [dragHeight, setDragHeight] = useState<number | null>(null);
    const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
    const confirm = useConfirm();

    const currentHeight = dragHeight ?? SNAP_HEIGHTS[snap];

    const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        const nearest = (Object.keys(SNAP_HEIGHTS) as DrawerSnap[]).reduce((best, key) =>
            Math.abs(SNAP_HEIGHTS[key] - currentHeight) < Math.abs(SNAP_HEIGHTS[best] - currentHeight) ? key : best
        );
        setSnap(nearest);
        setDragHeight(null);
        dragRef.current = null;
    };

    const actionLabel = mode === "create" ? "Publish" : "Archive";
    const statusLabel = saveStatus === "saving"
        ? mode === "create" ? "Publishing" : "Archiving"
        : saveStatus === "saved"
            ? mode === "create" ? "Published" : "Archived"
            : saveStatus === "error" ? "Failed" : actionLabel;

    const addEvent = () => {
        setTab("events");
        setSnap("full");
        onAddEvent();
    };

    return (
        <section
            className="fixed inset-x-0 bottom-0 z-[1200] flex flex-col overflow-hidden rounded-t-[26px] border border-white/10 bg-[#090909]/95 text-white shadow-[0_-18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[height] duration-200 md:hidden"
            style={{ height: `${currentHeight}dvh` }}
        >
            <div
                className="touch-none px-4 pt-2.5"
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    dragRef.current = { startY: event.clientY, startHeight: currentHeight };
                }}
                onPointerMove={(event) => {
                    if (!dragRef.current) return;
                    const delta = ((dragRef.current.startY - event.clientY) / window.innerHeight) * 100;
                    setDragHeight(Math.min(94, Math.max(16, dragRef.current.startHeight + delta)));
                }}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
            >
                <div className="mx-auto flex h-6 w-14 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.035]">
                    <span className="h-1 w-1 rounded-full bg-white/40" />
                    <span className="h-1 w-1 rounded-full bg-white/40" />
                    <span className="h-1 w-1 rounded-full bg-white/40" />
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">Timeline Studio</p>
                    <p className="mt-0.5 text-[9px] font-mono uppercase tracking-[0.22em] text-white/35">
                        {mode === "create" ? "Create mode" : "Edit mode"} - {events.length} event{events.length === 1 ? "" : "s"}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onPreviewToggle}
                        className={`flex items-center gap-1.5 flex-shrink-0 rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] transition active:scale-95 ${isPreviewMode ? "border-indigo-400/35 bg-indigo-500/20 text-indigo-200" : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white"}`}
                    >
                        {isPreviewMode ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Exit</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>Preview</span>
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={saving}
                        className="flex-shrink-0 rounded-xl border border-indigo-400/25 bg-indigo-500/15 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-indigo-200 transition active:scale-95 disabled:opacity-50"
                    >
                        {statusLabel}
                    </button>
                </div>
            </div>

            {snap !== "low" && (
                <>
                    <div className="w-full flex-shrink-0 border-y border-white/[0.07]">
                        <div className="flex gap-1 overflow-x-auto px-3 py-2 scrollbar-hide">
                            {TABS.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setTab(item.id)}
                                    className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-medium transition ${
                                        tab === item.id
                                            ? "border-indigo-400/35 bg-indigo-500/15 text-indigo-200"
                                            : "border-white/[0.07] bg-white/[0.025] text-white/45"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="custom-scrollbar flex-grow overflow-y-auto overscroll-contain px-4 pb-8 pt-4">
                        {tab === "overview" && (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-base font-semibold">Timeline Overview</p>
                                    <p className="mt-1 text-xs leading-relaxed text-white/35">Set the public details readers will see first.</p>
                                </div>
                                <label className="block">
                                    <span className="mb-1.5 block text-[9px] font-mono uppercase tracking-[0.2em] text-white/35">Title</span>
                                    <input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Timeline title" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-indigo-400/50" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-[9px] font-mono uppercase tracking-[0.2em] text-white/35">Description</span>
                                    <textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} placeholder="Describe this timeline" rows={5} className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-indigo-400/50" />
                                </label>
                                <div>
                                    <span className="mb-1.5 block text-[9px] font-mono uppercase tracking-[0.2em] text-white/35">Category</span>
                                    <CustomDropdown value={category} options={CATEGORIES} onChange={onCategoryChange} />
                                </div>
                                <div>
                                    <span className="mb-1.5 block text-[9px] font-mono uppercase tracking-[0.2em] text-white/35">Tags</span>
                                    <TagChipInput value={tagsInput} onChange={onTagsInputChange} />
                                    <span className="mt-1.5 block text-[10px] text-white/25">Press comma or enter to create a tag.</span>
                                </div>
                                <div>
                                    <span className="mb-1.5 block text-[9px] font-mono uppercase tracking-[0.2em] text-white/35">Timeline Cover Image</span>
                                    <MediaUploader 
                                        media={coverImage ? [{ id: 'cover', url: coverImage, type: 'image', size: 0, title: 'Cover Image' }] : []} 
                                        onChange={(media) => onCoverImageChange(media.length > 0 ? media[0].url : null)}
                                        maxLimit={1}
                                        imagePosition={coverImagePosition}
                                        onImagePositionChange={onCoverImagePositionChange}
                                        imageZoom={coverImageZoom}
                                        onImageZoomChange={onCoverImageZoomChange}
                                    />
                                    <span className="mt-1.5 block text-[10px] text-white/25">Shown on the overview page and timeline cards.</span>
                                </div>
                            </div>
                        )}

                        {tab === "events" && (
                            <div>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-base font-semibold">Events</p>
                                        <p className="mt-1 text-xs text-white/35">{events.length ? "Select an event to edit its story." : "Build the story one event at a time."}</p>
                                    </div>
                                    <button type="button" onClick={addEvent} className="flex-shrink-0 rounded-xl border border-indigo-400/25 bg-indigo-500/15 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-indigo-200 active:scale-95">
                                        + Add Event
                                    </button>
                                </div>

                                {events.length === 0 ? (
                                    <div className="mt-5 rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center">
                                        <p className="text-sm font-medium text-white/60">No events yet</p>
                                        <p className="mt-1 text-xs leading-relaxed text-white/30">Add the first event to start shaping this timeline.</p>
                                        <button type="button" onClick={addEvent} className="mt-4 rounded-xl bg-indigo-500/15 px-4 py-2 text-xs text-indigo-200">Create first event</button>
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-2">
                                        {events.map((event, index) => {
                                            const isActive = index === activeEventIndex;
                                            const linkedCount = event.linkedFeatureIds.length;
                                            return (
                                                <article key={event.id ?? index} className={`overflow-hidden rounded-2xl border ${isActive ? "border-indigo-400/35 bg-indigo-500/[0.07]" : "border-white/[0.07] bg-white/[0.025]"}`}>
                                                    <button type="button" onClick={() => onActiveEventIndexChange(isActive ? null : index)} className="flex w-full items-center gap-3 px-3 py-3 text-left">
                                                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border text-[10px] font-mono ${isActive ? "border-indigo-400/35 bg-indigo-500/20 text-indigo-200" : "border-white/10 bg-white/[0.03] text-white/35"}`}>
                                                            {String(index + 1).padStart(2, "0")}
                                                        </span>
                                                        <span className="min-w-0 flex-grow">
                                                            <span className="block truncate text-sm font-medium text-white/80">{event.title || "Untitled Event"}</span>
                                                            <span className="mt-0.5 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/30">
                                                                <span>{formatDate(event.date)}</span>
                                                                {linkedCount > 0 && (
                                                                    <>
                                                                        <span className="h-1 w-1 rounded-full bg-white/20" />
                                                                        <span className="text-indigo-300/70">{linkedCount}L</span>
                                                                    </>
                                                                )}
                                                            </span>
                                                        </span>
                                                        <span className="text-white/30">{isActive ? "-" : "+"}</span>
                                                    </button>

                                                    {isActive && (
                                                        <div className="space-y-3 border-t border-white/[0.07] px-3 pb-4 pt-3">
                                                            <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2">
                                                                <span className="text-[9px] font-mono uppercase tracking-wider text-white/35">Linked Spatial Layers</span>
                                                                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300/70">
                                                                    {linkedCount} linked
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="mb-1 block text-[9px] font-mono uppercase tracking-wider text-white/35">Date</span>
                                                                <MobileDateInput value={event.date} onChange={(value) => onEventChange(index, "date", value)} />
                                                            </div>
                                                            <label className="block">
                                                                <span className="mb-1 block text-[9px] font-mono uppercase tracking-wider text-white/35">Title</span>
                                                                <input value={event.title} onChange={(e) => onEventChange(index, "title", e.target.value)} placeholder="Event title" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-indigo-400/50" />
                                                            </label>
                                                            <label className="block">
                                                                <span className="mb-1 block text-[9px] font-mono uppercase tracking-wider text-white/35">Description</span>
                                                                <textarea value={event.description} onChange={(e) => onEventChange(index, "description", e.target.value)} placeholder="Describe what happened" rows={5} className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-indigo-400/50" />
                                                            </label>
                                                            <div>
                                                                <span className="mb-1 block text-[9px] font-mono uppercase tracking-wider text-white/35">Images & Audio</span>
                                                                <MediaUploader 
                                                                    media={event.mediaData || []} 
                                                                    onChange={(media) => onEventChange(index, "mediaData", media)}
                                                                />
                                                            </div>
                                                            <EventFeatureLinker
                                                                event={event}
                                                                eventIndex={index}
                                                                features={features}
                                                                onToggleFeatureLink={onToggleFeatureLink}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    const shouldDelete = await confirm({
                                                                        title: "Delete event?",
                                                                        message: `Delete "${event.title || `event ${index + 1}`}"?`,
                                                                        confirmLabel: "Delete",
                                                                        variant: "danger",
                                                                    });
                                                                    if (shouldDelete) onRemoveEvent(index);
                                                                }}
                                                                className="text-xs text-rose-300/75"
                                                            >
                                                                Delete event
                                                            </button>
                                                        </div>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === "features" && (
                            <div>
                                <div>
                                    <p className="text-base font-semibold">Geospatial Features</p>
                                    <p className="mt-1 text-xs text-white/35">
                                        {features.length ? `${features.length} map feature${features.length === 1 ? "" : "s"} available.` : "Draw points, lines, or polygons on the map to add them here."}
                                    </p>
                                </div>

                                {features.length === 0 ? (
                                    <div className="mt-5 rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center">
                                        <p className="text-sm font-medium text-white/60">No map features yet</p>
                                        <p className="mt-1 text-xs leading-relaxed text-white/30">Use the drawing tools on the map to create points, routes, and zones.</p>
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-2">
                                        {features.map((feature, index) => {
                                            const type = feature.geometry?.type ?? "Feature";
                                            const meta = GEO_TYPE_META[type] ?? { label: type, color: "text-white/50", bg: "bg-white/[0.04]", border: "border-white/10", dot: "bg-white/40" };
                                            const featureId = String(feature.id ?? "");
                                            const linkedCount = featureId
                                                ? events.filter((event) => event.linkedFeatureIds.includes(featureId)).length
                                                : 0;

                                            return (
                                                <article key={featureId || index} className={`rounded-2xl border px-3 py-3 ${meta.bg} ${meta.border}`}>
                                                    <div className="flex items-start gap-3">
                                                        <FeatureGlyph type={type} />
                                                        <div className="min-w-0 flex-grow">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="truncate text-sm font-medium text-white/80">{featureDisplayName(feature, index)}</p>
                                                                <span className={`flex-shrink-0 text-[9px] font-mono uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                                                            </div>
                                                            <p className="mt-1 text-xs text-white/35">{featureDetail(feature)}</p>
                                                            {featureId && (
                                                                <label className="mt-2 block">
                                                                    <span className="sr-only">Feature name</span>
                                                                    <input
                                                                        value={typeof feature.properties?.name === "string" ? feature.properties.name : ""}
                                                                        onChange={(event) => onFeatureNameChange(featureId, event.target.value)}
                                                                        placeholder="name this layer..."
                                                                        className="w-full rounded-lg border border-white/[0.08] bg-black/20 px-2.5 py-2 text-xs text-white/70 outline-none placeholder:text-white/20 focus:border-white/20"
                                                                    />
                                                                </label>
                                                            )}
                                                            <div className="mt-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/25">
                                                                <span>{linkedCount} linked event{linkedCount === 1 ? "" : "s"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === "ai" && (
                            <MobileAiAssistantPanel onAiImport={onAiImport} />
                        )}

                        {tab === "import" && (
                            <MobileImportDataPanel onImport={onImport} />
                        )}

                        {!TABS.find((item) => item.id === tab)?.ready && (
                            <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center">
                                <p className="text-sm font-medium text-white/60">{TABS.find((item) => item.id === tab)?.label}</p>
                                <p className="mt-1 text-xs text-white/30">This mobile workspace is the next section to build.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}
