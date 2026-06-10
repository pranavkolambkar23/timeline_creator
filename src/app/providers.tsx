"use client";

import { SessionProvider } from "next-auth/react";
import { ConfirmProvider } from "@/hooks/useConfirm";
import { ToastProvider } from "@/hooks/useToast";

export default function Providers({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SessionProvider>
            <ToastProvider>
                <ConfirmProvider>{children}</ConfirmProvider>
            </ToastProvider>
        </SessionProvider>
    );
}
