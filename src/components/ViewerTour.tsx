"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./StudioTour.css"; // Reuse styling overrides

export default function ViewerTour() {
    const tourInitiated = useRef(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const hasSeenTour = localStorage.getItem("hasSeenViewerTour");
        if (hasSeenTour || tourInitiated.current) return;

        tourInitiated.current = true;

        const driverObj = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            popoverClass: 'driverjs-theme', // Custom class for styling
            steps: [
                {
                    element: '#tour-view-modes',
                    popover: {
                        title: 'Interactive Formats',
                        description: 'This timeline supports three distinct viewing formats to experience history. You can seamlessly toggle between them at any time!',
                        side: "top",
                        align: 'center'
                    }
                },
                {
                    element: '#tour-story-mode',
                    popover: {
                        title: '1. Story Mode',
                        description: 'A cinematic, horizontal scrolling format. Drag, use your mouse wheel, click directly on cards, or use the floating Next/Prev arrows to advance through the story.',
                        side: "top",
                        align: 'start'
                    }
                },
                {
                    element: '#tour-hybrid-mode',
                    popover: {
                        title: '2. Hybrid Mode',
                        description: 'A split-screen interface syncing a live Map on the left with a vertical narrative timeline on the right. Perfect for tracing geographical progression.',
                        side: "top",
                        align: 'center'
                    }
                },
                {
                    element: '#tour-map-mode',
                    popover: {
                        title: '3. Explorer Mode',
                        description: 'A full-screen interactive Map. View all coordinates, routes, and polygons simultaneously. Click on any spatial feature to explore its details.',
                        side: "top",
                        align: 'end'
                    }
                }
            ],
            onDestroyed: () => {
                localStorage.setItem("hasSeenViewerTour", "true");
            },
        });

        // Delay starting the tour to ensure all DOM elements are fully painted
        setTimeout(() => {
            driverObj.drive();
        }, 1200);

    }, []);

    return null;
}
