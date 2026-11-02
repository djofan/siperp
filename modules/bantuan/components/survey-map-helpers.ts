export interface SurveyPoint { latitude: number; longitude: number }

/** Reject missing/partial pairs, booleans and non-finite or out-of-range values. */
export function surveyPoint(latitude: unknown, longitude: unknown): SurveyPoint | null {
  const number = (value: unknown) => typeof value === "number" ? value :
    typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  const lat = number(latitude), lng = number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { latitude: lat, longitude: lng } : null;
}

/** Haversine great-circle distance on the mean Earth sphere, in metres. */
export function surveyDistance(a: SurveyPoint, b: SurveyPoint): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function formatSurveyDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres).toLocaleString("id-ID")} m` :
    `${(metres / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} km`;
}

/** Use the nearest world copy when the two endpoints straddle the date line. */
export function nearbyLongitude(origin: number, destination: number): number {
  return origin + ((destination - origin + 540) % 360) - 180;
}

export function surveyDirections(destination: SurveyPoint, origin: SurveyPoint | null): string {
  const params = new URLSearchParams({ api: "1", destination: `${destination.latitude},${destination.longitude}`, travelmode: "driving" });
  if (origin) params.set("origin", `${origin.latitude},${origin.longitude}`);
  return `https://www.google.com/maps/dir/?${params}`;
}
