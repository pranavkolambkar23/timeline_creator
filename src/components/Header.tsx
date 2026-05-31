"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import FeedbackModal from "./FeedbackModal";

export default function Header() {
    const { data: session } = useSession();
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "light") {
            setIsDarkMode(false);
            document.documentElement.classList.add("light");
            document.documentElement.classList.remove("dark");
        } else {
            setIsDarkMode(true);
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
        }
    }, []);

    const toggleTheme = () => {
        if (isDarkMode) {
            document.documentElement.classList.add("light");
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
            setIsDarkMode(false);
        } else {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
            localStorage.setItem("theme", "dark");
            setIsDarkMode(true);
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-foreground/5 px-3 sm:px-6 py-4 transition-all duration-300">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Left: Logo */}
                <Link href="/" className="flex shrink-0 sm:shrink items-center gap-3 group">
                    <Logo className="w-8 h-8 sm:w-9 sm:h-9 transition-transform group-hover:scale-110 duration-500" />
                    <h1 className="text-xl font-black text-foreground tracking-tight hidden sm:block">
                        Timeline<span className="text-indigo-500">Creator</span>
                    </h1>
                </Link>

                {/* Right: Actions */}
                <div className="min-w-0 flex items-center gap-1.5 sm:gap-4">
                    {/* Global Timeline Link */}
                    <Link
                        href="/global"
                        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all mr-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Global Timeline
                    </Link>

                    {/* Help Guide Button */}
                    <button 
                        onClick={() => window.dispatchEvent(new CustomEvent("open-onboarding-guide"))}
                        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-foreground/5 border border-foreground/10 text-foreground/60 hover:bg-foreground/10 hover:text-foreground rounded-lg text-[9px] font-black uppercase tracking-widest transition-all mr-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Guide & Docs
                    </button>

                    {/* Feedback Button */}
                    <button 
                        onClick={() => setIsFeedbackOpen(true)}
                        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-foreground/5 border border-foreground/10 text-foreground/60 hover:bg-foreground/10 hover:text-foreground rounded-lg text-[9px] font-black uppercase tracking-widest transition-all mr-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Give Feedback
                    </button>

                    {/* Admin Link */}
                    {session?.user?.role === "ADMIN" && (
                        <Link 
                            href="/admin" 
                            className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all mr-1"
                        >
                            Admin
                        </Link>
                    )}

                    {/* Theme Toggle */}
                    <button 
                        onClick={toggleTheme}
                        className="p-1.5 sm:p-2.5 rounded-2xl bg-foreground/5 hover:bg-foreground/10 text-foreground transition-all active:scale-90"
                        title="Toggle Light/Dark Mode"
                    >
                        {isDarkMode ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        )}
                    </button>

                    {session ? (
                        <div className="flex items-center gap-3 pl-4 border-l border-foreground/10">
                            <div className="flex flex-col items-end hidden md:flex">
                                <span className="text-[10px] font-black text-foreground uppercase tracking-widest opacity-60">
                                    {session.user?.email?.split("@")[0]}
                                </span>
                                <button
                                    onClick={() => signOut()}
                                    className="text-[9px] uppercase tracking-tighter font-black text-slate-500 hover:text-red-500 transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20">
                                {session.user?.email?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <button
                                onClick={() => signIn()}
                                className="text-[10px] font-black uppercase tracking-widest text-foreground/60 hover:text-foreground px-1.5 sm:px-4 py-2 transition-colors"
                            >
                                Login
                            </button>
                            <Link
                                href="/signup"
                                className="bg-indigo-600 text-white px-3 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                <span className="sm:hidden">Sign Up</span>
                                <span className="hidden sm:inline">Get Started</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
            <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        </header>
    );
}
