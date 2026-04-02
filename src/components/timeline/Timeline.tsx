"use client";

type Event = {
    title: string;
    date: string;
    description: string;
};

// 📅 Format date → dd-mm-yyyy
function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();

    return `${dd}-${mm}-${yyyy}`;
}

export default function Timeline({ events }: { events: Event[] }) {
    return (
        <div className="w-full overflow-x-auto py-16 scroll-smooth">

            <div className="flex gap-16 min-w-max items-start relative px-6 snap-x snap-mandatory">

                {/* 🌈 Highlighted Gradient Timeline Line */}
                <div className="absolute top-12 left-0 w-full h-[3px] bg-gradient-to-r from-blue-400 via-blue-600 to-purple-500"></div>

                {events.map((event, index) => (
                    <div
                        key={index}
                        className="relative flex flex-col items-center min-w-[260px] snap-center group transition"
                    >

                        {/* ✨ Glowing Dot */}
                        <div className="w-5 h-5 bg-blue-600 rounded-full z-10 shadow-[0_0_20px_rgba(37,99,235,0.8)] group-hover:scale-125 transition"></div>

                        {/* 📅 Date Arrow Card */}
                        <div className="mt-5 bg-white text-blue-600 px-5 py-2 rounded-lg relative shadow border border-blue-100 group-hover:shadow-lg group-hover:scale-105 transition">

                            {formatDate(event.date)}

                            {/* Arrow */}
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-blue-100 rotate-45"></div>
                        </div>

                        {/* 🏷 Title */}
                        <h3 className="mt-4 font-semibold text-lg text-gray-800 text-center">
                            {event.title}
                        </h3>

                        {/* 📄 Description Card */}
                        <div className="mt-3 bg-white shadow-lg rounded-xl p-4 text-sm text-gray-600 text-center border border-gray-100 
                            group-hover:shadow-xl group-hover:-translate-y-1 group-hover:scale-[1.02] transition">

                            {event.description}

                        </div>

                    </div>
                ))}

            </div>
        </div>
    );
}