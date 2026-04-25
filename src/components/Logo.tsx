import React from "react";

export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
    return (
        <svg 
            viewBox="0 0 32 32" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className={className}
        >
            {/* The Connecting Path */}
            <path 
                d="M6 16H26" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                className="text-indigo-500"
            />
            
            {/* Event Node 1 - Past */}
            <circle 
                cx="8" 
                cy="16" 
                r="4" 
                fill="currentColor" 
                className="text-indigo-600" 
            />
            
            {/* Event Node 2 - Future (Overlapping) */}
            <circle 
                cx="22" 
                cy="16" 
                r="6" 
                stroke="currentColor" 
                strokeWidth="2" 
                className="text-purple-500"
            />
            <circle 
                cx="22" 
                cy="16" 
                r="3" 
                fill="currentColor" 
                className="text-purple-500" 
            />

            {/* Stylized 'T' hidden in the path */}
            <path 
                d="M14 12V20" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round"
                className="opacity-40"
            />
        </svg>
    );
}
