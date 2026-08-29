import axios from "axios";
import config from "../config";

export const haversineDistance = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): number => {
  const R = 6371;
  const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
  const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((origin.lat * Math.PI) / 180) *
    Math.cos((destination.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getDistanceAndDuration = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ distanceKm: number; durationMinutes: number; source: "google" | "haversine" }> => {
  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/distancematrix/json",
      {
        params: {
          origins: `${origin.lat},${origin.lng}`,
          destinations: `${destination.lat},${destination.lng}`,
          key: config.googleMapsApiKey,
        },
        timeout: 5000,
      }
    );

    const data = response.data;
    const element = data?.rows?.[0]?.elements?.[0];

    if (data.status === "OK" && element?.status === "OK") {
      const durationSeconds = element.duration.value;
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
      return {
        distanceKm: element.distance.value / 1000,
        durationMinutes,
        source: "google",
      };
    }
  } catch (error: any) {
    console.error("Google Maps API request failed:", error?.message || error);
  }

  const distanceKm = haversineDistance(origin, destination);
  const estimatedSeconds = (distanceKm / 40) * 3600;
  const durationMinutes = Math.max(1, Math.round(estimatedSeconds / 60));

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationMinutes,
    source: "haversine",
  };
};
