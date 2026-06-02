"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

import FeedbackModal from "./FeedbackModal";
import Logo from "./Logo";

export default function Footer() {
    const { data: session } = useSession();
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    const createHref = session ? "/create" : "/signup";
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-foreground/5 bg-card/30 px-6 py-12">
            <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
                <div>
                    <Link href="/" className="inline-flex items-center gap-3">
                        <Logo className="h-9 w-9" />
                        <span className="text-xl font-black tracking-tight text-foreground">
                            Timeline<span className="text-indigo-500">Creator</span>
                        </span>
                    </Link>
                    <p className="mt-4 max-w-md text-sm font-medium leading-relaxed text-foreground/50">
                        Create, explore, and share interactive timelines for history, personal stories, and big ideas.
                    </p>
                </div>

                <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/35">Explore</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-1">
                        <a href="/#explore" className="text-sm font-bold text-foreground/55 transition-colors hover:text-foreground">
                            Explore Timelines
                        </a>
                        <Link href="/global" className="text-sm font-bold text-foreground/55 transition-colors hover:text-foreground">
                            Global Timeline
                        </Link>
                        <Link href={createHref} className="text-sm font-bold text-foreground/55 transition-colors hover:text-foreground">
                            Create Timeline
                        </Link>
                    </div>
                </div>

                <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/35">Support</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-1">
                        <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent("open-onboarding-guide"))}
                            className="text-left text-sm font-bold text-foreground/55 transition-colors hover:text-foreground"
                        >
                            Guide & Docs
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsFeedbackOpen(true)}
                            className="text-left text-sm font-bold text-foreground/55 transition-colors hover:text-foreground"
                        >
                            Give Feedback
                        </button>
                    </div>
                </div>
            </div>

            <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-foreground/5 pt-6 text-xs font-bold text-foreground/35 sm:flex-row sm:items-center sm:justify-between">
                <p>© {year} TimelineCreator. All rights reserved.</p>
                <p>Built for curious timelines and better context.</p>
            </div>

            <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        </footer>
    );
}
