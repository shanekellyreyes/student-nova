export type LocationScope = "city" | "bay-area" | "california" | "national";

export type FirstGenFocus = "primary" | "secondary" | "none";

export const BAY_AREA_CITIES = [
  "Oakland",
  "Berkeley",
  "San Francisco",
  "San Jose",
  "Hayward",
  "Fremont",
  "Richmond",
  "Daly City",
  "Other Bay Area",
] as const;

export type LocationMetadata = {
  serviceAreas: string[];
  locationScope: LocationScope;
  primaryCity?: string;
};

const PRIMARY_FIRST_GEN_IDS = new Set([
  "fin-ten-thousand-degrees",
  "edu-breakthrough-sv",
  "pro-beyond12",
  "pro-college-track",
  "edu-genesys-works",
]);

export function deriveLocationFromRegion(region: string): LocationMetadata {
  const normalized = region.toLowerCase();

  const servesBayArea =
    normalized.includes("bay area") ||
    normalized.includes("silicon valley") ||
    normalized.includes("marin") ||
    normalized.includes("serves bay area");

  if (normalized.includes("statewide ca") || normalized.includes("statewide")) {
    return {
      serviceAreas: ["California", "Bay Area"],
      locationScope: "california",
    };
  }

  for (const city of BAY_AREA_CITIES) {
    if (city === "Other Bay Area") continue;
    if (normalized.includes(city.toLowerCase())) {
      const serviceAreas = servesBayArea ? [city, "Bay Area"] : [city];
      return {
        serviceAreas,
        locationScope: servesBayArea && normalized.indexOf("bay area") < normalized.indexOf(city.toLowerCase())
          ? "bay-area"
          : "city",
        primaryCity: city,
      };
    }
  }

  if (normalized.includes("silicon valley")) {
    return {
      serviceAreas: ["San Jose", "Bay Area"],
      locationScope: "bay-area",
      primaryCity: "San Jose",
    };
  }

  if (normalized.includes("marin")) {
    return {
      serviceAreas: ["Bay Area", "Marin"],
      locationScope: "bay-area",
    };
  }

  if (servesBayArea) {
    return {
      serviceAreas: ["Bay Area"],
      locationScope: "bay-area",
    };
  }

  if (normalized.includes("national")) {
    return {
      serviceAreas: servesBayArea ? ["National", "Bay Area"] : ["National"],
      locationScope: "national",
    };
  }

  return {
    serviceAreas: [],
    locationScope: "national",
  };
}

type FirstGenFocusInput = {
  id: string;
  firstGenRelevant: boolean;
  primaryCommunities: string[];
  secondaryCommunities: string[];
  openToAll: boolean;
};

export function deriveFirstGenFocus(opportunity: FirstGenFocusInput): FirstGenFocus {
  if (!opportunity.firstGenRelevant) return "none";

  if (PRIMARY_FIRST_GEN_IDS.has(opportunity.id)) return "primary";

  const hasIdentityPrimary = opportunity.primaryCommunities.length > 0;
  const broadAccessOnly =
    !hasIdentityPrimary &&
    !opportunity.openToAll &&
    (opportunity.secondaryCommunities.includes("Underrepresented") ||
      opportunity.secondaryCommunities.includes("Low-income"));

  if (broadAccessOnly) return "primary";

  return "secondary";
}
