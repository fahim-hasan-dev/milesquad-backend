import axios from "axios";
import config from "../config";

const haversineDistance = (
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

const secondsToText = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} min`;
  return `${minutes} min`;
};

export const getDistanceAndDuration = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ distanceKm: number; durationText: string; source: "google" | "haversine" }> => {
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
      return {
        distanceKm: element.distance.value / 1000,
        durationText: element.duration.text,
        source: "google",
      };
    }
  } catch (error: any) {
    console.error("Google Maps API request failed:", error?.message || error);
  }

  const distanceKm = haversineDistance(origin, destination);
  const estimatedSeconds = (distanceKm / 40) * 3600;

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationText: secondsToText(estimatedSeconds),
    source: "haversine",
  };
};
