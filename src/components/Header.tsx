"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function Header() {
    const { data: session } = useSession();

    return (
        <header className="flex items-center justify-between bg-white px-6 py-4 shadow">

            {/* Left: Logo */}
            <h1 className="text-xl font-bold cursor-pointer">
                Timeline Creator
            </h1>

            {/* Middle: Search */}
            <input
                type="text"
                placeholder="Search timelines..."
                className="w-1/3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />

            {/* Right: Auth */}
            <div>
                {session ? (
                    <div className="flex items-center gap-4">

                        {/* Profile */}
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                            {session.user?.email?.charAt(0).toUpperCase()}
                        </div>

                        {/* Logout */}
                        <button
                            onClick={() => signOut()}
                            className="text-sm text-gray-600 hover:text-black"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => signIn()}
                            className="text-sm font-medium text-slate-600 hover:text-slate-900"
                        >
                            Login
                        </button>
                        <a
                            href="/signup"
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Sign Up
                        </a>
                    </div>
                )}
            </div>

        </header>
    );
}