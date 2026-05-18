"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export default function FeedbackModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [content, setContent] = useState("");
    const [type, setType] = useState("Idea");
    const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");

    if (!isOpen) return null;
    if (typeof window === "undefined") return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setStatus("loading");
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, type })
            });

            if (!res.ok) throw new Error();
            
            setStatus("success");
            setTimeout(() => {
                setStatus("idle");
                setContent("");
                onClose();
            }, 2000);
        } catch {
            setStatus("error");
            setTimeout(() => setStatus("idle"), 3000);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
            <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-white tracking-tight">Give Feedback</h2>
                    <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                {status === "success" ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-white font-bold text-lg">Thank you!</p>
                        <p className="text-white/50 text-sm mt-2">Your feedback helps shape the future.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Feedback Type</label>
                            <div className="flex gap-2">
                                {["Idea", "Bug", "Other"].map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setType(t)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${type === t ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">What's on your mind?</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 resize-none transition-colors"
                                placeholder="I wish there was a way to..."
                                required
                            />
                        </div>

                        {status === "error" && <p className="text-rose-400 text-xs text-center font-medium">Failed to send. Please try again.</p>}

                        <button 
                            type="submit" 
                            disabled={status === "loading" || !content.trim()}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex justify-center items-center gap-2"
                        >
                            {status === "loading" ? "Sending..." : "Send Feedback"}
                            {!status && <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
                        </button>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}
