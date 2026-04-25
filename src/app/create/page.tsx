"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

type EventType = {
    title: string;
    description: string;
    date: string;
};

const CATEGORIES = ["General", "History", "Technology", "Science", "Art", "Sports"];

export default function CreateTimeline() {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("General");
    const [tagsInput, setTagsInput] = useState("");
    const [loading, setLoading] = useState(false);

    const [events, setEvents] = useState<EventType[]>([
        { title: "", description: "", date: "" },
    ]);

    const handleEventChange = (
        index: number,
        field: keyof EventType,
        value: string
    ) => {
        const updated = [...events];
        updated[index][field] = value;
        setEvents(updated);
    };

    const addEvent = () => {
        setEvents([
            ...events,
            { title: "", description: "", date: "" },
        ]);
    };

    const removeEvent = (index: number) => {
        const updated = events.filter((_, i) => i !== index);
        setEvents(updated);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (!title || !description) {
            alert("Please fill all fields");
            return;
        }

        try {
            setLoading(true);

            const tags = tagsInput.split(",").map(t => t.trim()).filter(t => t !== "");

            const res = await fetch("/api/timeline", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    description,
                    category,
                    tags,
                    events,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Something went wrong");
            }

            router.push("/");
            router.refresh();

        } catch (error: any) {
            console.error(error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-background transition-colors duration-500">
            <Header />
            
            <div className="max-w-4xl mx-auto px-6 py-20">
                <form onSubmit={handleSubmit} className="space-y-12">
                    {/* Header */}
                    <div className="bg-card p-12 rounded-[3rem] border border-foreground/5 shadow-2xl shadow-indigo-500/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-[100px]" />
                        
                        <div className="relative z-10">
                            <h1 className="text-5xl font-black text-foreground mb-4 tracking-tighter leading-none">Draft a New Chapter</h1>
                            <p className="text-foreground/40 mb-12 font-medium text-lg">Define the scope, category, and tags for your story.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-4 ml-1">Timeline Title</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-foreground/5 border border-foreground/5 p-5 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-xl font-black placeholder-foreground/20"
                                        placeholder="The Silicon Revolution..."
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-4 ml-1">Narrative Description</label>
                                    <textarea
                                        required
                                        className="w-full bg-foreground/5 border border-foreground/5 p-5 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-h-[140px] font-medium placeholder-foreground/20"
                                        placeholder="Explain the significance of this sequence of events..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-4 ml-1">Classification</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full bg-foreground/5 border border-foreground/5 p-5 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-black appearance-none cursor-pointer"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                        >
                                            {CATEGORIES.map(cat => (
                                                <option key={cat} value={cat} className="bg-background">{cat}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-4 ml-1">Keywords (Comma separated)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-foreground/5 border border-foreground/5 p-5 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-black placeholder-foreground/20"
                                        placeholder="tech, innovation, future..."
                                        value={tagsInput}
                                        onChange={(e) => setTagsInput(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Events */}
                    <div className="space-y-8">
                        <div className="flex items-center justify-between px-6">
                            <h2 className="text-3xl font-black text-foreground tracking-tight">Sequence of Events</h2>
                            <button
                                type="button"
                                onClick={addEvent}
                                className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-500/20"
                            >
                                + Add Event
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            {events.map((event, index) => (
                                <div key={index} className="bg-card p-10 rounded-[3rem] border border-foreground/5 shadow-xl relative group animate-in fade-in slide-in-from-bottom-6 duration-500">
                                    {events.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeEvent(index)}
                                            className="absolute top-8 right-8 p-3 text-foreground/20 hover:text-rose-500 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-3 ml-1">Timestamp</label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full bg-foreground/5 border border-foreground/5 p-4 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-black text-xs text-foreground"
                                                value={event.date}
                                                onChange={(e) => handleEventChange(index, "date", e.target.value)}
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-3 ml-1">Event Headline</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-foreground/5 border border-foreground/5 p-4 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-black text-sm placeholder-foreground/20"
                                                placeholder="Historical breakthrough..."
                                                value={event.title}
                                                onChange={(e) => handleEventChange(index, "title", e.target.value)}
                                            />
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-3 ml-1">Extended Narrative</label>
                                            <textarea
                                                required
                                                className="w-full bg-foreground/5 border border-foreground/5 p-4 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium min-h-[100px] placeholder-foreground/20"
                                                placeholder="Deep dive into the details..."
                                                value={event.description}
                                                onChange={(e) => handleEventChange(index, "description", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-12 text-center">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full max-w-lg mx-auto bg-slate-900 dark:bg-white text-white dark:text-black py-6 rounded-[2.5rem] text-sm font-black uppercase tracking-[0.2em] hover:scale-[1.02] transition-all shadow-2xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                            {loading ? "Archiving Record..." : "Publish to Gallery"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}