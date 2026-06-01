"use client";

import { useRef, useState } from "react";
import { HistoricalDatePrecision, parseHistoricalDate } from "@/lib/historicalDate";

const MONTHS = [
    ["01", "Jan"], ["02", "Feb"], ["03", "Mar"], ["04", "Apr"],
    ["05", "May"], ["06", "Jun"], ["07", "Jul"], ["08", "Aug"],
    ["09", "Sep"], ["10", "Oct"], ["11", "Nov"], ["12", "Dec"],
];

function ordinalSuffix(value: number) {
    if (value % 100 >= 11 && value % 100 <= 13) return "th";
    if (value % 10 === 1) return "st";
    if (value % 10 === 2) return "nd";
    if (value % 10 === 3) return "rd";
    return "th";
}

function partsFromValue(value: string) {
    const parsed = parseHistoricalDate(value);
    return {
        precision: parsed?.datePrecision ?? "exact" as HistoricalDatePrecision,
        era: parsed && parsed.historicalYear < 0 ? "BCE" : "CE",
        approximate: parsed?.isApproximate ?? false,
        year: parsed ? String(Math.abs(parsed.historicalYear)) : "",
        month: parsed?.historicalMonth ? String(parsed.historicalMonth).padStart(2, "0") : "",
        day: parsed?.historicalDay ? String(parsed.historicalDay).padStart(2, "0") : "",
    };
}

export default function HistoricalDateEditor({ value, onChange, compact = false }: {
    value: string;
    onChange: (value: string) => void;
    compact?: boolean;
}) {
    const [initial] = useState(() => partsFromValue(value));
    const [precision, setPrecision] = useState<HistoricalDatePrecision>(initial.precision);
    const [era, setEra] = useState(initial.era);
    const [approximate, setApproximate] = useState(initial.approximate);
    const [year, setYear] = useState(initial.year);
    const [month, setMonth] = useState(initial.month);
    const [day, setDay] = useState(initial.day);
    const [optionsOpen, setOptionsOpen] = useState(initial.era === "BCE" || initial.approximate || initial.precision !== "exact");
    const pickerRef = useRef<HTMLInputElement>(null);

    const emit = (next: Partial<ReturnType<typeof partsFromValue>>) => {
        const state = { precision, era, approximate, year, month, day, ...next };
        const prefix = state.approximate ? "c. " : "";
        const suffix = state.era === "BCE" ? " BCE" : "";
        let result = "";
        if (state.precision === "century") {
            const number = Number(state.year);
            result = number ? `${prefix}${number}${ordinalSuffix(number)} century ${state.era}` : "";
        } else if (state.precision === "year") {
            result = state.year ? `${prefix}${state.year}${suffix}` : "";
        } else if (state.precision === "month") {
            result = state.month && state.year ? `${prefix}${state.month}-${state.year}${suffix}` : "";
        } else {
            result = state.day && state.month && state.year ? `${prefix}${state.day}-${state.month}-${state.year}${suffix}` : "";
        }
        onChange(result);
    };

    const invalid = Boolean(value) && !parseHistoricalDate(value);
    const inputClass = "rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-center text-xs text-white/75 outline-none focus:border-indigo-400/50";

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                {precision === "exact" && <input value={day} onChange={(e) => { setDay(e.target.value.replace(/\D/g, "").slice(0, 2)); emit({ day: e.target.value.replace(/\D/g, "").slice(0, 2) }); }} placeholder="DD" inputMode="numeric" aria-label="Day" className={`${inputClass} w-12`} />}
                {(precision === "exact" || precision === "month") && (
                    <select value={month} onChange={(e) => { setMonth(e.target.value); emit({ month: e.target.value }); }} aria-label="Month" className={`${inputClass} w-20 text-left`}>
                        <option value="" className="bg-[#111]">Month</option>
                        {MONTHS.map(([number, label]) => <option key={number} value={number} className="bg-[#111]">{label}</option>)}
                    </select>
                )}
                <input value={year} onChange={(e) => { setYear(e.target.value.replace(/\D/g, "").slice(0, 6)); emit({ year: e.target.value.replace(/\D/g, "").slice(0, 6) }); }} placeholder={precision === "century" ? "Century" : "YYYY"} inputMode="numeric" aria-label={precision === "century" ? "Century" : "Year"} className={`${inputClass} ${precision === "century" ? "w-20" : "w-24"}`} />
                {precision === "exact" && era === "CE" && !approximate && (
                    <>
                        <button type="button" onClick={() => pickerRef.current?.showPicker?.()} className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-indigo-200/70" aria-label="Open calendar">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>
                        </button>
                        <input ref={pickerRef} type="date" tabIndex={-1} className="pointer-events-none absolute h-0 w-0 opacity-0" onChange={(e) => {
                            const [nextYear, nextMonth, nextDay] = e.target.value.split("-");
                            setYear(nextYear); setMonth(nextMonth); setDay(nextDay);
                            onChange(`${nextDay}-${nextMonth}-${nextYear}`);
                        }} />
                    </>
                )}
            </div>

            <button type="button" onClick={() => setOptionsOpen(!optionsOpen)} className="text-[10px] font-medium text-indigo-300/75 hover:text-indigo-200">
                {optionsOpen ? "Hide historical date options" : "Historical date options"}
            </button>

            {optionsOpen && (
                <div className={`grid gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 ${compact ? "grid-cols-1" : "sm:grid-cols-3"}`}>
                    <label className="space-y-1">
                        <span className="block text-[9px] font-mono uppercase tracking-wider text-white/35">Precision</span>
                        <select value={precision} onChange={(e) => { const next = e.target.value as HistoricalDatePrecision; setPrecision(next); emit({ precision: next }); }} className="w-full rounded-lg border border-white/10 bg-[#111] px-2 py-2 text-xs text-white/70">
                            <option value="exact">Exact date</option>
                            <option value="month">Month and year</option>
                            <option value="year">Year only</option>
                            <option value="century">Century only</option>
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="block text-[9px] font-mono uppercase tracking-wider text-white/35">Era</span>
                        <select value={era} onChange={(e) => { setEra(e.target.value); emit({ era: e.target.value }); }} className="w-full rounded-lg border border-white/10 bg-[#111] px-2 py-2 text-xs text-white/70">
                            <option value="CE">Common era</option>
                            <option value="BCE">BCE</option>
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="block text-[9px] font-mono uppercase tracking-wider text-white/35">Certainty</span>
                        <select value={approximate ? "approximate" : "known"} onChange={(e) => { const next = e.target.value === "approximate"; setApproximate(next); emit({ approximate: next }); }} className="w-full rounded-lg border border-white/10 bg-[#111] px-2 py-2 text-xs text-white/70">
                            <option value="known">Known date</option>
                            <option value="approximate">Approximate date</option>
                        </select>
                    </label>
                </div>
            )}

            <p className={`text-[10px] ${invalid ? "text-rose-300" : "text-white/25"}`}>
                {invalid ? "Complete the selected date fields." : approximate ? "Approximate date: the exact historical date is uncertain." : precision === "century" ? "Century-level date: used when a more precise date is unavailable." : "Use the calendar or enter the available date parts."}
            </p>
        </div>
    );
}
