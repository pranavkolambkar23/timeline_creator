"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminControls({ 
    timelineId, 
    initialIsFeatured 
}: { 
    timelineId: string; 
    initialIsFeatured: boolean 
}) {
    const [isFeatured, setIsFeatured] = useState(initialIsFeatured);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const toggleFeatured = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/timeline/${timelineId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isFeatured: !isFeatured }),
            });

            if (res.ok) {
                setIsFeatured(!isFeatured);
                router.refresh();
            } else {
                alert("Failed to update timeline status.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-[100] group">
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-4 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 shadow-2xl">
                Admin Manager
            </div>

            <button
                onClick={toggleFeatured}
                disabled={isLoading}
                className={`flex items-center gap-3 pl-6 pr-5 py-4 rounded-[2rem] border backdrop-blur-xl transition-all shadow-2xl active:scale-95 ${
                    isFeatured 
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-500" 
                        : "bg-indigo-600/10 border-indigo-500/30 text-indigo-500 hover:bg-indigo-600 hover:text-white"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
                <span className="text-[10px] font-black uppercase tracking-widest">
                    {isLoading ? "Syncing..." : isFeatured ? "Unfeature" : "Promote to Homepage"}
                </span>
                
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isFeatured ? "bg-rose-500 text-white" : "bg-indigo-500 text-white"
                }`}>
                    {isFeatured ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                </div>
            </button>
        </div>
    );
}
