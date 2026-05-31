"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Something went wrong");
            }

            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Account created, but failed to log in automatically. Please try logging in.");
                router.push("/login");
            } else {
                router.push("/");
                router.refresh();
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 transition-colors duration-500">
            <div className="max-w-md w-full space-y-8 p-10 bg-card rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-foreground/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full -ml-16 -mt-16 blur-2xl" />

                <div className="text-center relative z-10">
                    <div className="mx-auto w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl shadow-indigo-500/20">
                        <Logo className="w-8 h-8" />
                    </div>
                    <h2 className="text-4xl font-black text-foreground tracking-tighter">
                        Join the Journey
                    </h2>
                    <p className="mt-3 text-sm text-foreground/50 font-medium">
                        Start creating your first timeline today.
                    </p>
                </div>

                <GoogleSignInButton />

                <div className="relative z-10 flex items-center gap-4">
                    <div className="h-px flex-1 bg-foreground/10" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">
                        Or use email
                    </span>
                    <div className="h-px flex-1 bg-foreground/10" />
                </div>

                <form className="mt-10 space-y-6 relative z-10" onSubmit={handleSubmit}>
                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-2xl text-center font-black uppercase tracking-widest">
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-3 ml-1">
                                Email address
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
                            <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-3 ml-1">
                                Password
                            </label>
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
                            {isLoading ? "Enrolling..." : "Create Account"}
                        </button>
                    </div>
                </form>

                <div className="text-center pt-6 relative z-10">
                    <p className="text-sm text-foreground/40 font-medium">
                        Already an explorer?{" "}
                        <Link href="/login" className="font-black text-indigo-500 hover:text-indigo-400">
                            Log In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
