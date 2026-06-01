"use client";

import { KeyboardEvent, PointerEvent, useRef, useState } from "react";
import { EventType } from "@/hooks/useTimelineStudio";

const CATEGORIES = ["General", "History", "Technology", "Science", "Art", "Sports"];

type StudioTab = "overview" | "events" | "features" | "ai" | "import";
type DrawerSnap = "low" | "middle" | "full";

const SNAP_HEIGHTS: Record<DrawerSnap, number> = {
    low: 18,
    middle: 56,
    full: 90,
};

const TABS: { id: StudioTab; label: string; ready: boolean }[] = [
    { id: "overview", label: "Overview", ready: true },
    { id: "events", label: "Events", ready: true },
    { id: "features", label: "Geospatial Features", ready: false },
    { id: "ai", label: "AI Assistant", ready: false },
    { id: "import", label: "Import Data", ready: false },
];

interface MobileTimelineStudioDrawerProps {
    mode: "create" | "edit";
    title: string;
    description: string;
    category: string;
    tagsInput: string;
    events: EventType[];
    activeEventIndex: number | null;
    saving: boolean;
    saveStatus: "idle" | "saving" | "saved" | "error";
    onTitleChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
    onTagsInputChange: (value: string) => void;
    onActiveEventIndexChange: (index: number | null) => void;
    onEventChange: (index: number, field: keyof EventType, value: string) => void;
    onAddEvent: () => void;
    onRemoveEvent: (index: number) => void;
    onSubmit: () => void;
}

function formatDate(date: string) {
    if (!date) return "No date";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "Invalid date";
    return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getDateParts(date: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    return match ? { day: match[3], month: match[2], year: match[1] } : { day: "", month: "", year: "" };
}

function toIsoDate(date: string) {
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date.trim());
    if (!match) return null;
    const [, day, month, year] = match;
    const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
    if (
        Number.isNaN(parsed.getTime())
        || parsed.getFullYear() !== Number(year)
        || parsed.getMonth() + 1 !== Number(month)
        || parsed.getDate() !== Number(day)
    ) return null;
    return `${year}-${month}-${day}`;
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
    const initialDate = getDateParts(value);
    const [day, setDay] = useState(initialDate.day);
    const [month, setMonth] = useState(initialDate.month);
    const [year, setYear] = useState(initialDate.year);
    const dayRef = useRef<HTMLInputElement>(null);
    const monthRef = useRef<HTMLInputElement>(null);
    const yearRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<HTMLInputElement>(null);
    const monthInvalid = month.length === 2 && (Number(month) < 1 || Number(month) > 12);

    const commit = (nextDay = day, nextMonth = month, nextYear = year) => {
        if (!nextDay && !nextMonth && !nextYear) return onChange("");
        const isoDate = toIsoDate(`${nextDay}-${nextMonth}-${nextYear}`);
        if (isoDate) onChange(isoDate);
    };

    const editSegment = (
        text: string,
        maxLength: number,
        setSegment: (next: string) => void,
        nextRef?: React.RefObject<HTMLInputElement | null>,
    ) => {
        const digits = text.replace(/\D/g, "").slice(0, maxLength);
        setSegment(digits);
        if (digits.length === maxLength) nextRef?.current?.focus();
    };

    const moveBackOnEmpty = (event: KeyboardEvent<HTMLInputElement>, previousRef: React.RefObject<HTMLInputElement | null>) => {
        if (event.key === "Backspace" && !event.currentTarget.value) previousRef.current?.focus();
    };

    return (
        <div>
            <div className={`flex items-center gap-2 rounded-xl border bg-white/[0.04] px-3 ${monthInvalid ? "border-rose-400/60" : "border-white/10 focus-within:border-indigo-400/50"}`}>
                <div className="flex min-w-0 flex-grow items-center gap-1 py-3 text-sm text-white">
                    <input ref={dayRef} value={day} onChange={(event) => editSegment(event.target.value, 2, setDay, monthRef)} onFocus={(event) => event.currentTarget.select()} onBlur={() => commit()} inputMode="numeric" placeholder="DD" aria-label="Day" className="w-6 bg-transparent text-center outline-none placeholder:text-white/20" />
                    <span className="text-white/35">-</span>
                    <input ref={monthRef} value={month} onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, "").slice(0, 2);
                        setMonth(digits);
                        if (digits.length === 2 && Number(digits) >= 1 && Number(digits) <= 12) yearRef.current?.focus();
                    }} onKeyDown={(event) => moveBackOnEmpty(event, dayRef)} onFocus={(event) => event.currentTarget.select()} onBlur={() => commit()} inputMode="numeric" placeholder="MM" aria-label="Month" aria-invalid={monthInvalid} className={`w-6 bg-transparent text-center outline-none placeholder:text-white/20 ${monthInvalid ? "text-rose-300" : ""}`} />
                    <span className="text-white/35">-</span>
                    <input ref={yearRef} value={year} onChange={(event) => editSegment(event.target.value, 4, setYear)} onKeyDown={(event) => moveBackOnEmpty(event, monthRef)} onFocus={(event) => event.currentTarget.select()} onBlur={() => commit()} inputMode="numeric" placeholder="YYYY" aria-label="Year" className="w-11 bg-transparent text-center outline-none placeholder:text-white/20" />
                </div>
                <button type="button" onClick={() => {
                    const picker = pickerRef.current;
                    if (picker?.showPicker) picker.showPicker();
                    else picker?.click();
                }} aria-label="Open date picker" className="rounded-lg p-1.5 text-indigo-200/70">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                    </svg>
                </button>
                <input ref={pickerRef} type="date" value={value} onChange={(event) => {
                    const nextDate = getDateParts(event.target.value);
                    setDay(nextDate.day);
                    setMonth(nextDate.month);
                    setYear(nextDate.year);
                    onChange(event.target.value);
                }} tabIndex={-1} className="pointer-events-none absolute h-0 w-0 opacity-0" />
            </div>
            {monthInvalid
                ? <span className="mt-1.5 block text-[10px] text-rose-300">Month must be between 01 and 12.</span>
                : <span className="mt-1.5 block text-[10px] text-white/25">Use the calendar or enter DD-MM-YYYY.</span>
            }
        </div>
    );
}

function GeospatialFeaturePlaceholder() {
    const [open, setOpen] = useState(false);

    return (
        <div>
            <span className="mb-1 block text-[9px] font-mono uppercase tracking-wider text-white/35">Link Geospatial Features</span>
            <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left text-sm text-white/45">
                <span>Select features</span>
                <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
                </svg>
            </button>
            {open && <p className="mt-2 rounded-xl border border-dashed border-white/10 px-3 py-3 text-xs leading-relaxed text-white/30">No geospatial features are available yet. This picker will connect to the Geospatial Features tab next.</p>}
        </div>
    );
}

export default function MobileTimelineStudioDrawer({
    mode,
    title,
    description,
    category,
    tagsInput,
    events,
    activeEventIndex,
    saving,
    saveStatus,
    onTitleChange,
    onDescriptionChange,
    onCategoryChange,
    onTagsInputChange,
    onActiveEventIndexChange,
    onEventChange,
    onAddEvent,
    onRemoveEvent,
    onSubmit,
}: MobileTimelineStudioDrawerProps) {
    const [snap, setSnap] = useState<DrawerSnap>("middle");
    const [tab, setTab] = useState<StudioTab>("overview");
    const [dragHeight, setDragHeight] = useState<number | null>(null);
    const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

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
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={saving}
                    className="flex-shrink-0 rounded-xl border border-indigo-400/25 bg-indigo-500/15 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-indigo-200 transition active:scale-95 disabled:opacity-50"
                >
                    {statusLabel}
                </button>
            </div>

            {snap !== "low" && (
                <>
                    <div className="flex flex-shrink-0 gap-1 overflow-x-auto border-y border-white/[0.07] px-3 py-2 scrollbar-hide">
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

                    <div className="flex-grow overflow-y-auto overscroll-contain px-4 pb-8 pt-4">
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
                                            return (
                                                <article key={event.id ?? index} className={`overflow-hidden rounded-2xl border ${isActive ? "border-indigo-400/35 bg-indigo-500/[0.07]" : "border-white/[0.07] bg-white/[0.025]"}`}>
                                                    <button type="button" onClick={() => onActiveEventIndexChange(isActive ? null : index)} className="flex w-full items-center gap-3 px-3 py-3 text-left">
                                                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border text-[10px] font-mono ${isActive ? "border-indigo-400/35 bg-indigo-500/20 text-indigo-200" : "border-white/10 bg-white/[0.03] text-white/35"}`}>
                                                            {String(index + 1).padStart(2, "0")}
                                                        </span>
                                                        <span className="min-w-0 flex-grow">
                                                            <span className="block truncate text-sm font-medium text-white/80">{event.title || "Untitled Event"}</span>
                                                            <span className="mt-0.5 block text-[10px] font-mono uppercase tracking-wider text-white/30">{formatDate(event.date)}</span>
                                                        </span>
                                                        <span className="text-white/30">{isActive ? "-" : "+"}</span>
                                                    </button>

                                                    {isActive && (
                                                        <div className="space-y-3 border-t border-white/[0.07] px-3 pb-4 pt-3">
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
                                                            <GeospatialFeaturePlaceholder />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (confirm(`Delete "${event.title || `event ${index + 1}`}"?`)) onRemoveEvent(index);
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
