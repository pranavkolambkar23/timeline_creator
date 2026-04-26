"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function AdminControls({ 
    timelineId, 
    initialIsFeatured,
    creatorId
}: { 
    timelineId: string; 
    initialIsFeatured: boolean;
    creatorId: string;
}) {
    const { data: session } = useSession();
    const isOwner = session?.user?.id === creatorId;
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
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-3 group">
            {/* Tooltip */}
            <div className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 shadow-2xl">
                Archive Management
            </div>

            {isOwner && (
                <Link
                    href={`/timeline/${timelineId}/edit`}
                    className="flex items-center gap-3 pl-6 pr-5 py-4 rounded-[2rem] border border-indigo-500/30 bg-indigo-600/10 backdrop-blur-xl text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all shadow-2xl active:scale-95"
                >
                    <span className="text-[10px] font-black uppercase tracking-widest">Modify Narrative</span>
                    <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>
                </Link>
            )}

            <button
                onClick={toggleFeatured}
                disabled={isLoading}
                className={`flex items-center gap-3 pl-6 pr-5 py-4 rounded-[2rem] border backdrop-blur-xl transition-all shadow-2xl active:scale-95 ${
                    isFeatured 
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-500" 
                        : "bg-foreground/5 border-foreground/10 text-foreground/40 hover:bg-rose-500/10 hover:text-rose-500"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
                <span className="text-[10px] font-black uppercase tracking-widest">
                    {isLoading ? "Syncing..." : isFeatured ? "Remove Highlight" : "Highlight Archive"}
                </span>
                
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isFeatured ? "bg-rose-500 text-white" : "bg-foreground/20 text-foreground/40"
                }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                </div>
            </button>
        </div>
    );
}
