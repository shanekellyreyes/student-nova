import type { Opportunity } from "@/types/opportunity";
import { BAY_AREA_CITIES, type LocationScope } from "@/data/opportunity-metadata";

export const LOCATION_WEIGHTS = {
  exactCity: 560,
  bayArea: 340,
  california: 140,
  nearbyBayAreaCity: 70,
  national: 35,
} as const;

export type LocationMatch = {
  score: number;
  chip: string | null;
};

function isBayAreaCity(city: string): boolean {
  return (BAY_AREA_CITIES as readonly string[]).includes(city);
}

export function scoreLocationMatch(opportunity: Opportunity, userCity: string): LocationMatch {
  if (!userCity) return { score: 0, chip: null };

  const scope = opportunity.locationScope ?? "national";
  const serviceAreas = opportunity.serviceAreas ?? [];
  const primaryCity = opportunity.primaryCity;

  if (userCity === "Other Bay Area") {
    if (scope === "bay-area" || scope === "city") {
      return { score: LOCATION_WEIGHTS.bayArea, chip: "Bay Area Match" };
    }
    if (scope === "california") {
      return { score: LOCATION_WEIGHTS.california, chip: null };
    }
    return { score: LOCATION_WEIGHTS.national, chip: null };
  }

  if (primaryCity === userCity || serviceAreas.includes(userCity)) {
    return { score: LOCATION_WEIGHTS.exactCity, chip: `${userCity} Match` };
  }

  if (scope === "bay-area" && isBayAreaCity(userCity)) {
    return { score: LOCATION_WEIGHTS.bayArea, chip: "Bay Area Match" };
  }

  if (
    primaryCity &&
    primaryCity !== userCity &&
    isBayAreaCity(userCity) &&
    isBayAreaCity(primaryCity)
  ) {
    return { score: LOCATION_WEIGHTS.nearbyBayAreaCity, chip: null };
  }

  if (scope === "california") {
    return { score: LOCATION_WEIGHTS.california, chip: null };
  }

  if (scope === "national") {
    return { score: LOCATION_WEIGHTS.national, chip: null };
  }

  return { score: 0, chip: null };
}

export function getLocationScopeLabel(scope: LocationScope | undefined): string {
  switch (scope) {
    case "city":
      return "city";
    case "bay-area":
      return "bay-area";
    case "california":
      return "california";
    default:
      return "national";
  }
}
