const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Locating Shivaji Maharaj timeline events...");
  
  // Find the timeline
  const timeline = await prisma.timeline.findFirst({
    where: { title: { contains: "Shivaji" } },
    include: { timelineEvents: true }
  });

  if (!timeline) {
    console.error("Could not find Shivaji timeline.");
    return;
  }

  const events = timeline.timelineEvents;
  console.log(`Found ${events.length} events. Injecting spatial data...`);

  const updates = [];

  for (const event of events) {
    let locationData = null;

    if (event.title.includes("Shivneri")) {
      locationData = {
        type: "Feature",
        geometry: { type: "Point", coordinates: [73.8744, 19.1972] }, // Shivneri Fort
        properties: { type: "birthplace" }
      };
    } else if (event.title.includes("Torna")) {
      locationData = {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "Point", coordinates: [73.6214, 18.2758] }, properties: { type: "fort" } },
          { type: "Feature", geometry: { type: "Polygon", coordinates: [[[73.6, 18.25], [73.65, 18.25], [73.65, 18.3], [73.6, 18.3], [73.6, 18.25]]] }, properties: { type: "territory" } }
        ]
      };
    } else if (event.title.includes("Afzal Khan")) {
      locationData = {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "Point", coordinates: [73.5855, 17.9250] }, properties: { type: "fort" } }, // Pratapgad
          { type: "Feature", geometry: { type: "LineString", coordinates: [[75.7139, 16.8302], [73.5855, 17.9250]] }, properties: { type: "route" } } // Bijapur to Pratapgad
        ]
      };
    } else if (event.title.includes("Pavan Khind")) {
      locationData = {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "Point", coordinates: [73.8333, 16.8500] }, properties: { type: "stand" } },
          { type: "Feature", geometry: { type: "LineString", coordinates: [[74.1089, 16.8122], [73.8333, 16.8500], [73.7667, 16.8667]] }, properties: { type: "escape_route" } }
        ]
      };
    } else if (event.title.includes("Shaista Khan")) {
      locationData = {
        type: "Feature",
        geometry: { type: "Point", coordinates: [73.8567, 18.5204] }, // Pune
        properties: { type: "raid" }
      };
    } else if (event.title.includes("Agra")) {
      locationData = {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "Point", coordinates: [78.0081, 27.1767] }, properties: { type: "agra" } },
          { type: "Feature", geometry: { type: "Point", coordinates: [73.5222, 18.2433] }, properties: { type: "rajgad" } },
          { type: "Feature", geometry: { type: "LineString", coordinates: [[78.0081, 27.1767], [75.8577, 22.7196], [73.5222, 18.2433]] }, properties: { type: "escape_route" } }
        ]
      };
    } else if (event.title.includes("Raigad")) {
      locationData = {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "Point", coordinates: [73.4358, 18.2344] }, properties: { type: "capital" } },
          { type: "Feature", geometry: { type: "Polygon", coordinates: [[[72.5, 16.0], [75.0, 16.0], [75.0, 19.5], [72.5, 19.5], [72.5, 16.0]]] }, properties: { type: "empire" } }
        ]
      };
    }

    if (locationData) {
      updates.push(
        prisma.timelineEvent.update({
          where: { id: event.id },
          data: { locationData }
        })
      );
    }
  }

  await Promise.all(updates);
  console.log(`Successfully injected location data into ${updates.length} events!`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
