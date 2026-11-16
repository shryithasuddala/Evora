const Charity = require("../models/Charity");

// Hyderabad prominent localities coordinate directory for fast local geocoding fallback
const HYDERABAD_LOCALITIES = [
  { name: "Banjara Hills", lat: 17.4156, lng: 78.4357 },
  { name: "Jubilee Hills", lat: 17.4319, lng: 78.4073 },
  { name: "Hitec City", lat: 17.4435, lng: 78.3772 },
  { name: "Madhapur", lat: 17.4483, lng: 78.3915 },
  { name: "Gachibowli", lat: 17.4401, lng: 78.3489 },
  { name: "Kondapur", lat: 17.4699, lng: 78.3578 },
  { name: "Kukatpally", lat: 17.4938, lng: 78.3995 },
  { name: "Begumpet", lat: 17.4447, lng: 78.4664 },
  { name: "Secunderabad", lat: 17.4399, lng: 78.4983 },
  { name: "Charminar", lat: 17.3616, lng: 78.4747 },
  { name: "Abids", lat: 17.3888, lng: 78.4740 },
  { name: "Ameerpet", lat: 17.4375, lng: 78.4482 },
  { name: "Somajiguda", lat: 17.4262, lng: 78.4578 },
  { name: "Mehdipatnam", lat: 17.3916, lng: 78.4400 },
  { name: "Tolichowki", lat: 17.3992, lng: 78.4144 },
  { name: "Uppal", lat: 17.4019, lng: 78.5602 },
  { name: "Dilsukhnagar", lat: 17.3688, lng: 78.5247 },
  { name: "LB Nagar", lat: 17.3457, lng: 78.5522 },
  { name: "Miyapur", lat: 17.4968, lng: 78.3614 },
  { name: "Manikonda", lat: 17.4034, lng: 78.3813 },
  { name: "Shamshabad", lat: 17.2403, lng: 78.4294 },
  { name: "Financial District", lat: 17.4150, lng: 78.3420 },
];

/**
 * Calculates Haversine distance between two sets of coordinates in kilometers.
 */
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
};

/**
 * Geocodes an address or venue string into { lat, lng, displayName }.
 * Supports Google Maps API, OpenStreetMap Nominatim, or local Hyderabad lookup fallback.
 */
const geocodeAddress = async (address = "", city = "Hyderabad") => {
  const query = `${address} ${city}`.trim();
  const provider = (process.env.GEOCODING_PROVIDER || "local").toLowerCase();

  // 1. Google Maps Geocoding API (if enabled & key provided)
  if (provider === "google" && process.env.GOOGLE_MAPS_API_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query
      )}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "OK" && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return {
          lat: Number(lat),
          lng: Number(lng),
          displayName: data.results[0].formatted_address,
          provider: "google",
        };
      }
    } catch (err) {
      console.warn("Google geocoding error, falling back:", err.message);
    }
  }

  // 2. OpenStreetMap Nominatim (if provider configured as osm)
  if (provider === "osm") {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "EVORA-Charity-AI/1.0 (evora-platform@celebrations.internal)" },
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          lat: Number(data[0].lat),
          lng: Number(data[0].lon),
          displayName: data[0].display_name,
          provider: "osm",
        };
      }
    } catch (err) {
      console.warn("OSM geocoding error, falling back:", err.message);
    }
  }

  // 3. Built-in Local Hyderabad Geocoding Dictionary
  const lowerQuery = query.toLowerCase();
  const matchedLocality = HYDERABAD_LOCALITIES.find((loc) =>
    lowerQuery.includes(loc.name.toLowerCase())
  );

  if (matchedLocality) {
    return {
      lat: matchedLocality.lat,
      lng: matchedLocality.lng,
      displayName: `${matchedLocality.name}, Hyderabad, Telangana`,
      provider: "local_dictionary",
    };
  }

  // Default Central Hyderabad coordinates (near Hussain Sagar / Secretariat)
  return {
    lat: 17.4123,
    lng: 78.4744,
    displayName: `${address || "Hyderabad Venue"}, Hyderabad, Telangana`,
    provider: "default_center",
  };
};

/**
 * Searches charities near a coordinate using MongoDB $geoNear / 2dsphere index.
 * Falls back to in-memory Haversine distance calculation if Geo index is not ready.
 */
const findNearbyCharities = async ({
  lng,
  lat,
  radiusInKm = 25,
  type = null,
  acceptsCookedOnly = false,
  verifiedOnly = false,
}) => {
  const numericLng = parseFloat(lng);
  const numericLat = parseFloat(lat);

  if (isNaN(numericLng) || isNaN(numericLat)) {
    throw new Error("Invalid longitude or latitude provided for nearby charity search.");
  }

  const maxDistanceMeters = radiusInKm * 1000;
  const matchCriteria = {};

  if (type && type !== "all") {
    matchCriteria.type = type;
  }
  if (acceptsCookedOnly) {
    matchCriteria.acceptsCookedFood = true;
  }
  if (verifiedOnly) {
    matchCriteria.verified = true;
  }

  try {
    const pipeline = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [numericLng, numericLat],
          },
          distanceField: "distanceMeters",
          maxDistance: maxDistanceMeters,
          spherical: true,
          query: matchCriteria,
        },
      },
      {
        $addFields: {
          distanceKm: {
            $round: [{ $divide: ["$distanceMeters", 1000] }, 1],
          },
        },
      },
      {
        $sort: { distanceMeters: 1 },
      },
    ];

    const results = await Charity.aggregate(pipeline);
    return results;
  } catch (geoErr) {
    console.warn("MongoDB $geoNear failed, using in-memory Haversine distance fallback:", geoErr.message);

    // Fallback: Fetch from Charity collection and calculate distance manually
    const query = { ...matchCriteria };
    const allCharities = await Charity.find(query).lean();

    const results = allCharities
      .map((charity) => {
        const [cLng, cLat] = charity.location?.coordinates || [78.4867, 17.3850];
        const distKm = calculateDistanceKm(numericLat, numericLng, cLat, cLng);
        return {
          ...charity,
          distanceMeters: Math.round(distKm * 1000),
          distanceKm: distKm,
        };
      })
      .filter((charity) => charity.distanceKm <= radiusInKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return results;
  }
};

module.exports = {
  geocodeAddress,
  findNearbyCharities,
  calculateDistanceKm,
  HYDERABAD_LOCALITIES,
};
