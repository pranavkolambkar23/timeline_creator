export type TimelineEvent = {
    id: number;
    title: string;
    date: string;
    displayDate: string;
    description: string;
};

export type Timeline = {
    id: string;
    title: string;
    description: string;
    tags: string[];
    events: TimelineEvent[];
};

export const shivajiTimeline: Timeline = {
    id: "shivaji-maharaj",
    title: "Chhatrapati Shivaji Maharaj Timeline",
    description: "Life and major events of Shivaji Maharaj",
    tags: ["history", "india", "maratha-empire"],

    events: [
        {
            id: 1,
            title: "Birth",
            date: "1630-02-19",
            displayDate: "1630",
            description: "Born at Shivneri Fort",
        },
        {
            id: 2,
            title: "Battle of Torna",
            date: "1645",
            displayDate: "1645",
            description: "Captured Torna Fort at a young age",
        },
        {
            id: 3,
            title: "Afzal Khan Defeated",
            date: "1659",
            displayDate: "1659",
            description: "Killed Afzal Khan in a historic encounter",
        },
        {
            id: 4,
            title: "Coronation as Chhatrapati",
            date: "1674-06-06",
            displayDate: "1674",
            description: "Crowned as Chhatrapati at Raigad",
        },
        {
            id: 5,
            title: "Death",
            date: "1680-04-03",
            displayDate: "1680",
            description: "Passed away at Raigad Fort",
        }
    ]
};