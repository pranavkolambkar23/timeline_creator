"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./StudioTour.css"; // Custom overrides

export default function StudioTour() {
    const tourInitiated = useRef(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const hasSeenTour = localStorage.getItem("hasSeenStudioTour");
        if (hasSeenTour || tourInitiated.current) return;

        tourInitiated.current = true;

        const driverObj = driver({
            showProgress: true,
            animate: true,
            allowClose: false, // Force them to at least skip properly
            popoverClass: 'driverjs-theme', // Custom class for styling
            steps: [
                {
                    element: '#tour-spatial-canvas',
                    popover: {
                        title: 'Spatial Canvas',
                        description: 'This is where you map your story. Use the drawing tools on the left to drop Points, draw Routes (double-click to finish), and map Zones.',
                        side: "right",
                        align: 'start'
                    }
                },
                {
                    element: '#tour-narrative-panel',
                    popover: {
                        title: 'Narrative Data',
                        description: 'Here you add chronological events. Each event can be linked to features you drew on the map.',
                        side: "left",
                        align: 'start'
                    }
                },
                {
                    element: '#tour-ai-import',
                    popover: {
                        title: 'AI Timeline Assistant',
                        description: 'Got an itinerary, a block of text, or a Wikipedia article? Paste it here and let AI automatically generate map points, dates, and events for you in seconds.',
                        side: "bottom",
                        align: 'end'
                    }
                },
                {
                    element: '#tour-manual-import',
                    popover: {
                        title: 'Manual Data Import',
                        description: 'If you have an Excel or CSV file with your timeline data, you can upload it here to bulk-create events.',
                        side: "bottom",
                        align: 'end'
                    }
                }
            ],
            onDestroyStarted: () => {
                if (!driverObj.hasNextStep() || confirm("Are you sure you want to skip the tour?")) {
                    driverObj.destroy();
                    localStorage.setItem("hasSeenStudioTour", "true");
                }
            },
        });

        // Delay starting the tour slightly to ensure DOM is fully rendered
        setTimeout(() => {
            driverObj.drive();
        }, 500);

    }, []);

    return null;
}
