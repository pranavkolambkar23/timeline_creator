"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";

type ParsedEvent = {
    title: string;
    description: string;
    date: string;
    locationStr: string;
    status: 'pending' | 'geocoding' | 'ready' | 'error';
    coords?: [number, number];
};

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (events: ParsedEvent[]) => void;
}

export default function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
    const [dragActive, setDragActive] = useState(false);
    const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
    const [step, setStep] = useState<'upload' | 'preview' | 'geocoding'>('upload');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const processFile = async (file: File) => {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const events: ParsedEvent[] = json.map(row => {
            // Try to map common column names
            const title = row.Title || row.Event || row.Name || row.title || '';
            const description = row.Description || row.Details || row.Notes || row.description || '';
            
            // Excel dates can be tricky, try to parse
            let date = '';
            if (row.Date || row.date) {
                const rawDate = row.Date || row.date;
                if (typeof rawDate === 'number') {
                    // Excel serial date
                    const dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
                    date = dateObj.toISOString().split('T')[0];
                } else {
                    try {
                        date = new Date(rawDate).toISOString().split('T')[0];
                    } catch {
                        date = String(rawDate);
                    }
                }
            }

            const locationStr = row.Location || row.City || row.Place || row.location || '';

            return {
                title: String(title),
                description: String(description),
                date,
                locationStr: String(locationStr),
                status: 'pending' as const
            };
        }).filter(e => e.title || e.date || e.locationStr); // Filter empty rows

        setParsedEvents(events);
        setStep('preview');
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await processFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            await processFile(e.target.files[0]);
        }
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const startGeocoding = async () => {
        setStep('geocoding');
        
        const updatedEvents = [...parsedEvents];
        for (let i = 0; i < updatedEvents.length; i++) {
            const ev = updatedEvents[i];
            if (!ev.locationStr) {
                ev.status = 'ready';
                setParsedEvents([...updatedEvents]);
                continue;
            }

            ev.status = 'geocoding';
            setParsedEvents([...updatedEvents]);

            try {
                // Respect Nominatim limits
                await sleep(1000); 
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ev.locationStr)}`);
                const data = await res.json();

                if (data && data.length > 0) {
                    ev.coords = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
                    ev.status = 'ready';
                } else {
                    ev.status = 'error';
                }
            } catch (err) {
                ev.status = 'error';
            }
            
            setParsedEvents([...updatedEvents]);
        }

        // Wait a bit to show the completed states before auto-closing
        await sleep(500);
        onImport(updatedEvents);
        handleClose();
    };

    const handleClose = () => {
        setStep('upload');
        setParsedEvents([]);
        onClose();
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { Date: '2024-10-12', Title: 'Arrive in Rome', Description: 'Flight lands at FCO at 10 AM', Location: 'Rome, Italy' },
            { Date: '2024-10-14', Title: 'Colosseum Tour', Description: 'Guided tour starts at 9 AM', Location: 'Colosseum, Rome' }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Trip Plan");
        XLSX.writeFile(wb, "Timeline_Template.xlsx");
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-[#060606]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            🪄
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-sm">Import Data</h2>
                            <p className="text-[10px] font-mono text-white/40">Excel or CSV</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 text-white/40 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {step === 'upload' && (
                        <div className="flex flex-col gap-4">
                            <div 
                                className={`w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer
                                    ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input ref={fileInputRef} type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleChange} />
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                </div>
                                <p className="text-sm text-white/80 font-medium">Click or drag file to this area to upload</p>
                                <p className="text-[10px] font-mono text-white/40 mt-1">Supports .xlsx, .csv</p>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                                <div className="flex items-center gap-3">
                                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-[11px] text-indigo-200/70 font-mono">Need the correct columns?</span>
                                </div>
                                <button onClick={downloadTemplate} className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                                    Download Template
                                </button>
                            </div>
                        </div>
                    )}

                    {(step === 'preview' || step === 'geocoding') && (
                        <div className="flex flex-col gap-4 max-h-[60vh]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-white">Preview Data ({parsedEvents.length} events found)</h3>
                                {step === 'geocoding' && (
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-indigo-400">
                                        <div className="w-3 h-3 border border-indigo-400/50 border-t-indigo-400 rounded-full animate-spin" />
                                        <span>Geocoding locations...</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-grow overflow-y-auto border border-white/10 rounded-xl bg-[#080808]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#ffffff10 transparent' }}>
                                <table className="w-full text-left text-[11px] text-white/70">
                                    <thead className="bg-[#111] sticky top-0 z-10 text-[9px] font-mono uppercase text-white/40">
                                        <tr>
                                            <th className="px-4 py-2 border-b border-white/10">Date</th>
                                            <th className="px-4 py-2 border-b border-white/10">Title</th>
                                            <th className="px-4 py-2 border-b border-white/10">Location</th>
                                            <th className="px-4 py-2 border-b border-white/10 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedEvents.map((ev, idx) => (
                                            <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                                <td className="px-4 py-2 whitespace-nowrap text-white/50">{ev.date || '—'}</td>
                                                <td className="px-4 py-2 font-medium text-white/90">{ev.title}</td>
                                                <td className="px-4 py-2 text-white/60">{ev.locationStr || '—'}</td>
                                                <td className="px-4 py-2 text-right">
                                                    {ev.status === 'pending' && <span className="text-white/30">Pending</span>}
                                                    {ev.status === 'geocoding' && <span className="text-indigo-400 animate-pulse">Searching...</span>}
                                                    {ev.status === 'ready' && <span className="text-emerald-400">Ready</span>}
                                                    {ev.status === 'error' && <span className="text-amber-400">No coords found</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'preview' && (
                    <div className="px-6 py-4 border-t border-white/[0.06] bg-[#060606] flex items-center justify-between">
                        <button 
                            onClick={() => setStep('upload')} 
                            className="text-[11px] font-bold text-white/40 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={startGeocoding}
                            className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-2"
                        >
                            <span>Import & Auto-Map</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
