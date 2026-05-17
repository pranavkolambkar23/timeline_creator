"use client";

import { useState, useRef } from "react";

type ParsedEvent = {
    title: string;
    description: string;
    date: string;
    locationStr: string;
    status: 'pending' | 'geocoding' | 'ready' | 'error';
    coords?: [number, number];
};

interface AiImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (events: ParsedEvent[]) => void;
}

export default function AiImportModal({ isOpen, onClose, onImport }: AiImportModalProps) {
    const [prompt, setPrompt] = useState("");
    const [files, setFiles] = useState<{ name: string, mimeType: string, base64: string }[]>([]);
    const [step, setStep] = useState<'input' | 'processing' | 'preview' | 'geocoding'>('input');
    const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        
        const newFiles: typeof files = [];
        for (let i = 0; i < e.target.files.length; i++) {
            const file = e.target.files[i];
            // Read as base64
            const reader = new FileReader();
            await new Promise<void>((resolve) => {
                reader.onload = () => {
                    newFiles.push({
                        name: file.name,
                        mimeType: file.type || 'application/octet-stream',
                        base64: reader.result as string
                    });
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        }
        setFiles(prev => [...prev, ...newFiles]);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        if (!prompt.trim() && files.length === 0) {
            setErrorMsg("Please provide a prompt or upload documents.");
            return;
        }

        setStep('processing');
        setErrorMsg(null);

        try {
            const res = await fetch('/api/ai-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, files })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to process request");
            }

            if (!Array.isArray(data)) {
                throw new Error("AI returned invalid format");
            }

            const events: ParsedEvent[] = data.map((ev: any) => ({
                title: ev.title || 'Untitled',
                description: ev.description || '',
                date: ev.date || '',
                locationStr: ev.locationStr || '',
                status: 'pending' as const
            }));

            setParsedEvents(events);
            setStep('preview');
        } catch (err: any) {
            setErrorMsg(err.message);
            setStep('input');
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
        setStep('input');
        setParsedEvents([]);
        setPrompt('');
        setFiles([]);
        setErrorMsg(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-300">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-[#060606]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            ✨
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-sm">AI Timeline Assistant</h2>
                            <p className="text-[10px] font-mono text-white/40">Upload itineraries or paste text</p>
                        </div>
                    </div>
                    <button onClick={handleClose} disabled={step === 'processing' || step === 'geocoding'} className="p-2 text-white/40 hover:text-white transition-colors disabled:opacity-30">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {step === 'input' && (
                        <div className="flex flex-col gap-4">
                            {errorMsg && (
                                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-mono">
                                    {errorMsg}
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2 block">
                                    Describe the trip / history
                                </label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g. I am going to Paris on Oct 12, then taking a train to Lyon on Oct 15..."
                                    className="w-full bg-[#111] border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-amber-500/50 transition-colors resize-none h-32"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
                                        Attach Documents (Optional)
                                    </label>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
                                    >
                                        + Add File
                                    </button>
                                </div>
                                <input 
                                    ref={fileInputRef} 
                                    type="file" 
                                    multiple 
                                    className="hidden" 
                                    accept="image/*,application/pdf" 
                                    onChange={handleFileChange} 
                                />

                                {files.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {files.map((f, i) => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/70">
                                                <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                                <span className="max-w-[150px] truncate">{f.name}</span>
                                                <button onClick={() => removeFile(i)} className="text-white/30 hover:text-rose-400 ml-1">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:border-white/20 transition-colors bg-[#111]"
                                    >
                                        <p className="text-[11px] font-mono text-white/30">Supports PDF & Images (Flight tickets, hotel bookings)</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={!prompt.trim() && files.length === 0}
                                className="w-full py-3.5 mt-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 font-bold text-sm rounded-xl hover:bg-amber-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Generate Timeline
                            </button>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-16 gap-5">
                            <div className="relative">
                                <div className="w-16 h-16 border border-amber-500/20 rounded-full animate-ping absolute inset-0" />
                                <div className="w-16 h-16 border-t-2 border-amber-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center text-amber-500">
                                    ✨
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-white mb-1">AI is analyzing your data...</p>
                                <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Extracting events and locations</p>
                            </div>
                        </div>
                    )}

                    {(step === 'preview' || step === 'geocoding') && (
                        <div className="flex flex-col gap-4 max-h-[60vh]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-white">Preview AI Data ({parsedEvents.length} events)</h3>
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
                            onClick={() => setStep('input')} 
                            className="text-[11px] font-bold text-white/40 hover:text-white transition-colors"
                        >
                            ← Edit Prompt
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
