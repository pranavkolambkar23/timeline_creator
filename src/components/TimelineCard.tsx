import Link from "next/link";
import { getCategoryColor } from "@/lib/colors";

type Props = {
    id: string;
    title: string;
    description: string;
    category: string;
    tags?: string[];
};

export default function TimelineCard({
    id,
    title,
    description,
    category,
    tags = [],
}: Props) {
    const categoryClass = getCategoryColor(category);

    return (
        <Link href={`/timeline/${id}`} className="block group">
            <div className="relative h-full bg-card rounded-[2.5rem] p-10 border border-foreground/5 shadow-sm hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_30px_60px_-15px_rgba(79,70,229,0.2)] hover:border-indigo-500/30 transition-all duration-500 flex flex-col overflow-hidden">
                {/* Decorative background accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full opacity-10 transition-transform duration-700 group-hover:scale-150 ${categoryClass.split(' ')[0]}`} />

                {/* Category Badge */}
                <div className="mb-8 flex flex-wrap gap-2 relative z-10">
                    <span className={`px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] border rounded-full transition-colors ${categoryClass}`}>
                        {category}
                    </span>
                    {tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-foreground/40 bg-foreground/5 border border-foreground/5 rounded-full">
                            #{tag}
                        </span>
                    ))}
                </div>

                {/* Title */}
                <h3 className="text-3xl font-black text-foreground group-hover:text-indigo-500 transition-colors mb-4 leading-[1.1] tracking-tighter">
                    {title}
                </h3>

                {/* Description */}
                <p className="text-foreground/50 text-sm leading-relaxed flex-grow line-clamp-3 font-medium">
                    {description}
                </p>

                {/* Footer */}
                <div className="mt-10 flex items-center justify-between border-t border-foreground/5 pt-8">
                    <div className="flex items-center text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform">
                        Explore Chapter
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 ml-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}