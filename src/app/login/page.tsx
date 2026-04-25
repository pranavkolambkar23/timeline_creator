"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid email or password");
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch (err: any) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 transition-colors duration-500">
            <div className="max-w-md w-full space-y-8 p-10 bg-card rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-foreground/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                
                <div className="text-center relative z-10">
                    <div className="mx-auto w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl shadow-indigo-500/20">
                        <Logo className="w-8 h-8" />
                    </div>
                    <h2 className="text-4xl font-black text-foreground tracking-tighter">
                        Welcome Back
                    </h2>
                    <p className="mt-3 text-sm text-foreground/50 font-medium">
                        Continue your journey into history.
                    </p>
                </div>

                <form className="mt-10 space-y-6 relative z-10" onSubmit={handleSubmit}>
                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-2xl text-center font-black uppercase tracking-widest animate-shake">
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-3 ml-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none block w-full px-5 py-4 bg-foreground/5 border border-foreground/5 rounded-2xl placeholder-foreground/20 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-all font-medium"
                                placeholder="name@example.com"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-3 ml-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/30">
                                    Password
                                </label>
                                <a href="#" className="text-[10px] font-black text-indigo-500 hover:text-indigo-400 uppercase tracking-widest">
                                    Forgot?
                                </a>
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none block w-full px-5 py-4 bg-foreground/5 border border-foreground/5 rounded-2xl placeholder-foreground/20 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-all font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`group relative w-full flex justify-center py-5 px-4 border border-transparent text-xs font-black uppercase tracking-widest rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 ${
                                isLoading ? "opacity-70 cursor-not-allowed" : ""
                            }`}
                        >
                            {isLoading ? "Verifying..." : "Sign In"}
                        </button>
                    </div>
                </form>

                <div className="text-center pt-6 relative z-10">
                    <p className="text-sm text-foreground/40 font-medium">
                        New explorer?{" "}
                        <Link href="/signup" className="font-black text-indigo-500 hover:text-indigo-400">
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
