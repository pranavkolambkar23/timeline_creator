"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "./Logo";

export default function Header() {
    const { data: session } = useSession();
    const [isDarkMode, setIsDarkMode] = useState(true);

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
        <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-foreground/5 px-6 py-4 transition-all duration-300">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Left: Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <Logo className="w-9 h-9 transition-transform group-hover:scale-110 duration-500" />
                    <h1 className="text-xl font-black text-foreground tracking-tight hidden sm:block">
                        Timeline<span className="text-indigo-500">Creator</span>
                    </h1>
                </Link>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <button 
                        onClick={toggleTheme}
                        className="p-2.5 rounded-2xl bg-foreground/5 hover:bg-foreground/10 text-foreground transition-all active:scale-90"
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
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => signIn()}
                                className="text-[10px] font-black uppercase tracking-widest text-foreground/60 hover:text-foreground px-4 py-2 transition-colors"
                            >
                                Login
                            </button>
                            <Link
                                href="/signup"
                                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}