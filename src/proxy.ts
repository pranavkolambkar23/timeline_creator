import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    const hostname = request.headers.get("host") || "";
    const requestHeaders = new Headers(request.headers);

    // Check if visiting the easylearning subdomain (production or local dev)
    const isEasyLearning = 
        hostname.startsWith("easylearning.timelinecreator.co.in") || 
        hostname.startsWith("easylearning.localhost");

    if (isEasyLearning) {
        requestHeaders.set("x-tenant-tag", "Class 10 History");
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

// Ensure proxy runs on api and page routes, but skips static files/assets
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
