"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ✅ Define Event Type
type EventType = {
    title: string;
    description: string;
    date: string;
};

export default function CreateTimeline() {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    // ✅ Typed events
    const [events, setEvents] = useState<EventType[]>([
        { title: "", description: "", date: "" },
    ]);

    // ✅ Fix: restrict field type
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

            const res = await fetch("/api/timeline", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    description,
                    events, // ✅ send events also
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Something went wrong");
            }

            router.push("/");

        } catch (error: any) {
            console.error(error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl"
            >
                <h1 className="text-2xl font-bold mb-6">
                    Create Timeline
                </h1>

                {/* Title */}
                <div className="mb-4">
                    <label className="block mb-1 font-medium">
                        Title
                    </label>
                    <input
                        type="text"
                        className="w-full border p-2 rounded"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                {/* Description */}
                <div className="mb-6">
                    <label className="block mb-1 font-medium">
                        Description
                    </label>
                    <textarea
                        className="w-full border p-2 rounded"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {/* 🔥 Events Section */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">
                        Events
                    </h2>

                    {events.map((event, index) => (
                        <div
                            key={index}
                            className="border p-4 rounded mb-4 bg-gray-50"
                        >
                            <input
                                type="text"
                                placeholder="Event Title"
                                className="w-full border p-2 rounded mb-2"
                                value={event.title}
                                onChange={(e) =>
                                    handleEventChange(index, "title", e.target.value)
                                }
                            />

                            <textarea
                                placeholder="Event Description"
                                className="w-full border p-2 rounded mb-2"
                                value={event.description}
                                onChange={(e) =>
                                    handleEventChange(index, "description", e.target.value)
                                }
                            />

                            <input
                                type="date"
                                className="w-full border p-2 rounded mb-2"
                                value={event.date}
                                onChange={(e) =>
                                    handleEventChange(index, "date", e.target.value)
                                }
                            />

                            {events.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeEvent(index)}
                                    className="text-red-500 text-sm"
                                >
                                    Remove Event
                                </button>
                            )}
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addEvent}
                        className="bg-gray-200 px-4 py-2 rounded"
                    >
                        + Add Event
                    </button>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
                >
                    {loading ? "Creating..." : "Create Timeline"}
                </button>
            </form>
        </main>
    );
}