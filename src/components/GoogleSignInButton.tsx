"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

type GoogleSignInButtonProps = {
    callbackUrl?: string;
};

export default function GoogleSignInButton({
    callbackUrl = "/",
}: GoogleSignInButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        await signIn("google", { callbackUrl });
        setIsLoading(false);
    };

    return (
        <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className={`relative z-10 w-full flex items-center justify-center gap-3 py-4 px-4 border border-foreground/10 text-sm font-bold rounded-2xl text-foreground bg-background hover:bg-foreground/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all active:scale-95 ${
                isLoading ? "opacity-70 cursor-not-allowed" : ""
            }`}
        >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.2-2.05H12v3.86h5.37a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.99-4.3 2.99-7.34Z" />
                <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.23-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.81-1.76-5.6-4.13H3.06v2.59A9.99 9.99 0 0 0 12 22Z" />
                <path fill="#FBBC05" d="M6.4 13.88A6.01 6.01 0 0 1 6.09 12c0-.65.11-1.29.31-1.88V7.53H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.47l3.34-2.59Z" />
                <path fill="#EA4335" d="M12 5.99c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.62 9.62 0 0 0 12 2a9.99 9.99 0 0 0-8.94 5.53l3.34 2.59c.79-2.37 3-4.13 5.6-4.13Z" />
            </svg>
            {isLoading ? "Connecting..." : "Continue with Google"}
        </button>
    );
}
