"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";

export default function AdminPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [timelines, setTimelines] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");

    useEffect(() => {
        if (session && session.user?.role !== "ADMIN") {
            router.push("/");
            return;
        }

        const fetchAll = async () => {
            setIsLoading(true);
            try {
                const res = await fetch("/api/timeline?adminAll=true");
                if (res.ok) {
                    const data = await res.json();
                    setTimelines(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        if (session) fetchAll();
    }, [session]);

    const handleToggleFeatured = async (id: string, current: boolean) => {
        try {
            const res = await fetch(`/api/timeline/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isFeatured: !current }),
            });
            if (res.ok) {
                setTimelines(prev => prev.map(t => t.id === id ? { ...t, isFeatured: !current } : t));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredTimelines = timelines.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                             t.user?.email.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = ["All", ...Array.from(new Set(timelines.map(t => t.category)))];

    if (isLoading) {
        return (
            <main className="min-h-screen bg-background">
                <Header />
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background">
            <Header />

            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-foreground tracking-tight mb-2">Management Portal</h1>
                        <p className="text-foreground/50 font-medium italic">Overseeing the collective memory of {timelines.length} records.</p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <input 
                            type="text"
                            placeholder="Search by title or author..."
                            className="bg-foreground/5 border border-foreground/5 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium w-full md:w-64"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select 
                            className="bg-foreground/5 border border-foreground/5 p-4 rounded-2xl outline-none font-black appearance-none cursor-pointer pr-10"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table View */}
                <div className="bg-card rounded-[2.5rem] border border-foreground/5 overflow-hidden shadow-2xl shadow-indigo-500/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-foreground/5">
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-foreground/30">Timeline</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-foreground/30">Creator</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-foreground/30">Category</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-foreground/30">Events</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-foreground/30 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-foreground/5">
                                {filteredTimelines.map(t => (
                                    <tr key={t.id} className="group hover:bg-foreground/[0.02] transition-colors">
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-foreground text-lg tracking-tight group-hover:text-indigo-500 transition-colors">{t.title}</span>
                                                <span className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest mt-1">Created {new Date(t.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-sm font-medium text-foreground/60">{t.user?.email}</span>
                                        </td>
                                        <td className="p-6">
                                            <span className="px-3 py-1 bg-foreground/5 border border-foreground/5 rounded-full text-[10px] font-black uppercase tracking-widest text-foreground/40">
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-sm font-black text-foreground/40">{t._count.timelineEvents}</span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <Link 
                                                    href={`/timeline/${t.id}`}
                                                    className="p-2.5 rounded-xl bg-foreground/5 text-foreground/40 hover:bg-indigo-600 hover:text-white transition-all"
                                                    title="View Timeline"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </Link>
                                                <button
                                                    onClick={() => handleToggleFeatured(t.id, t.isFeatured)}
                                                    className={`p-2.5 rounded-xl transition-all ${
                                                        t.isFeatured 
                                                            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                                                            : "bg-foreground/5 text-foreground/40 hover:bg-rose-500/10 hover:text-rose-500"
                                                    }`}
                                                    title={t.isFeatured ? "Unfeature" : "Promote to Featured"}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
