// Cache structure to store geocoded results
interface GeocodingCache {
  [place: string]: {
    coordinates: [number, number];
    timestamp: number;
  };
}

// Load cache from localStorage
const loadCache = (): GeocodingCache => {
  if (typeof window === "undefined") return {};
  try {
    const cached = localStorage.getItem("geocoding-cache");
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

// Save cache to localStorage
const saveCache = (cache: GeocodingCache) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("geocoding-cache", JSON.stringify(cache));
  } catch (error) {
    console.error("Error saving geocoding cache:", error);
  }
};

// Cache expiration time (30 days)
const CACHE_EXPIRATION = 30 * 24 * 60 * 60 * 1000;

// Add this helper function to split place hierarchies
function getPlaceVariations(place: string): string[] {
  // Split on comma and clean up whitespace
  const parts = place.split(",").map((p) => p.trim());
  const variations: string[] = [];

  // Start with the full place name
  variations.push(parts.join(", "));

  // Then try removing parts from the beginning (most specific) only
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      variations.push(parts.slice(i).join(", "));
    }
  }

  return variations;
}

export async function geocodePlace(
  place: string
): Promise<[number, number] | null> {
  const cache = loadCache();
  const now = Date.now();

  // Check cache first
  if (cache[place] && now - cache[place].timestamp < CACHE_EXPIRATION) {
    return cache[place].coordinates;
  }

  // Get all variations of the place name to try
  const variations = getPlaceVariations(place);

  for (const placeVariation of variations) {
    // Add delay to respect rate limits (1 request per second)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          placeVariation
        )}&format=json&limit=1`,
        {
          headers: {
            "User-Agent": "FamilyMapApp/1.0",
          },
        }
      );

      const data = await response.json();

      if (data && data[0]) {
        const coordinates: [number, number] = [
          parseFloat(data[0].lat),
          parseFloat(data[0].lon),
        ];

        // Cache the result for the original full place name
        cache[place] = {
          coordinates,
          timestamp: now,
        };
        saveCache(cache);

        console.log(
          `Found coordinates for "${place}" using variation "${placeVariation}":`,
          coordinates
        );
        return coordinates;
      }
    } catch (error) {
      console.error(`Geocoding error for "${placeVariation}":`, error);
    }
  }

  console.log(
    `Failed to geocode "${place}" after trying variations:`,
    variations
  );
  return null;
}
