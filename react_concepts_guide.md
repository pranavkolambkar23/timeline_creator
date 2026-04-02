# React & Next.js Concepts: Timeline Creator Guide

This document explains the core concepts of React, Next.js, and TypeScript used in the `timeline_creator` project. Using real code examples from the project, we'll break down how everything works together.

## 1. Project Architecture (Next.js App Router)

Next.js is a React framework that provides structure and features like routing out of the box. This project uses the **App Router** (introduced in Next.js 13+), which relies on a file-system-based routing mechanism.

*   `src/app/page.tsx`: This file is the **root page** of your application (i.e., when you visit `/`).
*   `src/app/layout.tsx`: This wraps all your pages, providing a common HTML structure, `<head>`, and `<body>`.
*   `src/components/`: Sub-components that you can reuse across different pages (e.g., `TimelineCard.tsx`).
*   `src/data/`: Dummy data serving as your database (e.g., `timelines.ts`).

## 2. Routing (Static & Dynamic)

### Next.js `Link` Component (Client-side Navigation)
In traditional HTML, an `<a>` tag causes a full page reload. In React/Next.js, we use the `<Link>` component to navigate smoothly without reloading the entire page.

*Seen in `src/components/TimelineCard.tsx`:*
```tsx
import Link from "next/link";

<Link href={`/timeline/${id}`}>
    // ... card content
</Link>
```

### Dynamic Routing
Often, you need a single page layout to display varying data depending on the URL (e.g., `/timeline/shivaji-maharaj` vs `/timeline/android-versions`). This is called a **Dynamic Route**.
In Next.js, enclosing a folder name in square brackets creates a dynamic route segment: `src/app/timeline/[id]/page.tsx`.

*Seen in `src/app/timeline/[id]/page.tsx`:*
```tsx
export default async function TimelinePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    // 1. We extract the ID from the URL parameters
    const { id } = await params;

    // 2. We use that ID to fetch the corresponding timeline data
    const timeline = timelineMap[id];
    
    // ... render page
}
```
**Note:** In Next.js 15+, `params` in naturally dynamic routes must be `await`ed as it's provided as a Promise.

## 3. React Components (Building Blocks)

A React component is a reusable piece of UI. In modern React, components are just standard JavaScript/TypeScript functions that return JSX (HTML-like syntax).

### Component Creation
*Seen in `src/app/page.tsx`:*
```tsx
export default function Home() {
  return (
    <main>
       <h1>Explore Timelines</h1>
    </main>
  );
}
```

### Reusing Components
To prevent writing identical code over and over, you extract it into its own file and reuse it.

*Seen in `src/app/page.tsx`:*
```tsx
import TimelineCard from "@/components/TimelineCard";

// Later in the JSX...
<TimelineCard ... />
```

## 4. Props (Passing Data)

"Props" (short for properties) are how React components communicate. They allow you to pass data from a parent component down to a child component.

*Defining Props (Child Component - `src/components/TimelineCard.tsx`):*
```tsx
type Props = {
    id: string;
    title: string;
    description: string;
    category: string;
};

// Receiving the props into the component
export default function TimelineCard({ id, title, description, category }: Props) {
    return <h2>{title}</h2>;
}
```

*Passing Props (Parent Component - `src/app/page.tsx`):*
```tsx
<TimelineCard
    id={timeline.id}
    title={timeline.title}
    description={timeline.description}
    category={timeline.category}
/>
```

## 5. Rendering Lists (Data Mapping)

When you have an array of data and want to turn it into an array of UI components, you use the JavaScript `.map()` array method.

*Seen in `src/app/page.tsx`:*
```tsx
{timelines.map((timeline) => (
  <TimelineCard
    key={timeline.id}  // React needs a unique string/number for 'key'
    id={timeline.id}
    title={timeline.title}
    // ...
  />
))}
```
**Important:** Whenever you map over a list in React to render components, you *must* pass a unique `key` prop. This helps React identify which items have changed, been added, or been removed, optimizing rendering performance.

## 6. TypeScript Integration

TypeScript adds static typing to JavaScript, meaning you declare the *shape* of data explicitly. This helps catch syntax errors, typos, and undefined data issues before your code ever runs.

### Defining Object Types
You define the shape of your data using `type` or `interface`.

*Seen in `src/components/timeline/Timeline.tsx`:*
```typescript
type Event = {
    title: string;
    date: string;       // Date represented as a string
    description: string;
};
```

### Typing Component Props
Using TypeScript, we can tell a component exactly what data it requires. If the parent component forgets to pass a required prop, TypeScript will throw an error highlighting the omission.

```typescript
// Timeline component EXPECTS an array of 'Event' objects
export default function Timeline({ events }: { events: Event[] }) {
    // ...
}
```

## 7. Server Components vs Client Components

Next.js introduces the concept of Server Components and Client Components.

*   **Server Components** (Default in Next.js App Router): They are executed strictly on the server. Code like database queries doesn't get sent to the client (browser), making your bundle smaller and the app faster. `page.tsx` and `layout.tsx` fall under this category.
*   **Client Components**: Interactivity (like clicking a button, state management, or lifecycle hooks like `useEffect`) requires Javascript running in the browser. You designate a Client Component with the `"use client";` directive.

*Seen in `src/components/timeline/Timeline.tsx`:*
```tsx
"use client";

// By having this directive at the top, React knows to ship the JavaScript
// for this component to the user's browser.
export default function Timeline({ events }: { events: Event[] }) {
    // ...
}
```

## Summary
The Timeline Creator project is a cleanly structured Next.js application leveraging the best of modern React:
1.  **File System Routing** with App router (`[id]/page.tsx`).
2.  **Reusable Components** via Props (`Timeline`, `TimelineCard`).
3.  **Rendering Data via Maps** (`timelines.map()`).
4.  **Type Safety** built natively using TypeScript.
5.  **Styling** entirely handled via TailwindCSS utility classes directly passing visual instructions in `className`.
