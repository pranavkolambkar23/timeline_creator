// /data/timelines/map.ts

import { shivajiTimeline, Timeline } from "./shivajiTimeline";
import { androidTimeline } from "./androidTimeline";

export const timelineMap: Record<string, Timeline> = {
    "shivaji-maharaj": shivajiTimeline,
    "android-versions": androidTimeline,
};