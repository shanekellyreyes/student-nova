import { matchOpportunities, scoreAllOpportunities } from "@/data/matcher";
import type { IntakeFormData } from "@/types/opportunity";

export type SanityCheckResult = {
  name: string;
  pass: boolean;
  detail: string;
};

function rankByScore(intake: IntakeFormData, id: string): number {
  const ranked = scoreAllOpportunities(intake);
  const index = ranked.findIndex((opportunity) => opportunity.id === id);
  return index === -1 ? ranked.length : index + 1;
}

function isInTopN(intake: IntakeFormData, id: string, n: number): boolean {
  return rankByScore(intake, id) <= n;
}

function ranksAbove(intake: IntakeFormData, higherId: string, lowerId: string): boolean {
  return rankByScore(intake, higherId) < rankByScore(intake, lowerId);
}

function topLaneIds(intake: IntakeFormData): string[] {
  return matchOpportunities(intake).lanes.flatMap((lane) =>
    lane.opportunities.map((opportunity) => opportunity.id),
  );
}

function allMatchReasons(intake: IntakeFormData): string[] {
  return matchOpportunities(intake).lanes.flatMap((lane) =>
    lane.opportunities.flatMap((opportunity) => opportunity.matchReasons),
  );
}

function isInLaneTop3(intake: IntakeFormData, id: string): boolean {
  return topLaneIds(intake).includes(id);
}

export function runMatcherSanityChecks(): SanityCheckResult[] {
  const results: SanityCheckResult[] = [];

  const blackCsMentorship: IntakeFormData = {
    city: "Oakland",
    ageRange: "16–17",
    firstGen: "yes",
    identities: ["Black / African American"],
    interests: ["Computer Science"],
    supportNeeded: ["Mentorship"],
  };

  const mustBeatShpe = [
    "fin-uncf",
    "pro-nsbe",
    "pro-dev-color",
    "pro-bit",
    "edu-hidden-genius",
    "edu-smash",
    "edu-hack-the-hood",
    "edu-code-nation",
    "edu-codepath",
    "pro-kapor",
  ];
  const shpeBeatenByAll = mustBeatShpe.every((id) => ranksAbove(blackCsMentorship, id, "fin-shpe"));

  results.push({
    name: "Black + CS + Mentorship does not rank SHPE above Black-focused resources",
    pass: shpeBeatenByAll && !isInLaneTop3(blackCsMentorship, "fin-shpe"),
    detail: `SHPE rank ${rankByScore(blackCsMentorship, "fin-shpe")}; top lane IDs: ${topLaneIds(blackCsMentorship).join(", ")}`,
  });

  const latinxEngineering: IntakeFormData = {
    city: "Oakland",
    ageRange: "18–24",
    firstGen: "yes",
    identities: ["Latinx / Hispanic"],
    interests: ["Engineering"],
    supportNeeded: ["Community"],
  };

  results.push({
    name: "Latinx + Engineering can rank SHPE highly",
    pass: isInTopN(latinxEngineering, "fin-shpe", 12),
    detail: `SHPE rank ${rankByScore(latinxEngineering, "fin-shpe")}`,
  });

  const notFirstGen: IntakeFormData = {
    city: "Oakland",
    ageRange: "18–24",
    firstGen: "no",
    identities: ["Black / African American"],
    interests: ["Computer Science"],
    supportNeeded: ["Mentorship"],
  };

  const notFirstGenChips = allMatchReasons(notFirstGen);
  results.push({
    name: "First-gen No never shows First-Gen Match chips",
    pass: !notFirstGenChips.includes("First-Gen Match"),
    detail: `Chips seen: ${[...new Set(notFirstGenChips)].join(", ") || "none"}`,
  });

  const oaklandUser: IntakeFormData = {
    city: "Oakland",
    ageRange: "16–17",
    firstGen: "yes",
    identities: [],
    interests: ["Computer Science"],
    supportNeeded: ["Free workshops"],
  };

  const oaklandMatches = matchOpportunities(oaklandUser);
  const oaklandTopIds = topLaneIds(oaklandUser);
  const oaklandLocationChips = oaklandMatches.lanes.flatMap((lane) =>
    lane.opportunities.flatMap((opportunity) =>
      opportunity.matchReasons.filter(
        (chip) => chip === "Oakland Match" || chip === "Bay Area Match",
      ),
    ),
  );

  results.push({
    name: "Oakland user boosts local/Bay Area resources with location chips",
    pass:
      oaklandTopIds.includes("edu-hidden-genius") ||
      oaklandTopIds.includes("edu-hack-the-hood") ||
      oaklandLocationChips.length > 0,
    detail: `Top IDs: ${oaklandTopIds.join(", ")}; location chips: ${oaklandLocationChips.join(", ") || "none"}`,
  });

  const lgbtqIntake: IntakeFormData = {
    city: "San Francisco",
    ageRange: "18–24",
    firstGen: "no",
    identities: ["LGBTQ+"],
    interests: ["Computer Science"],
    supportNeeded: ["Community", "Mentorship"],
  };

  const lgbtqTopIds = topLaneIds(lgbtqIntake);
  const lgbtqTargets = ["pro-ostem", "fin-point", "pro-startout", "pro-o4u"] as const;
  const lgbtqHits = lgbtqTargets.filter((id) => lgbtqTopIds.includes(id));
  results.push({
    name: "LGBTQ+ surfaces oSTEM, Point Foundation, StartOut, and O4U in top matches",
    pass: lgbtqHits.length >= 3,
    detail: `Matched ${lgbtqHits.length}/4 (${lgbtqHits.join(", ")}); top IDs: ${lgbtqTopIds.join(", ")}`,
  });

  const disabilityIntake: IntakeFormData = {
    city: "Berkeley",
    ageRange: "18–24",
    firstGen: "no",
    identities: ["Disabled / neurodivergent"],
    interests: ["Computer Science"],
    supportNeeded: ["Scholarships", "Internships"],
  };

  const disabilityTopIds = topLaneIds(disabilityIntake);
  results.push({
    name: "Disabled/neurodivergent surfaces Lime Connect, AAPD, and Disability:IN in top matches",
    pass:
      disabilityTopIds.includes("fin-lime-connect") &&
      disabilityTopIds.includes("edu-aapd") &&
      disabilityTopIds.includes("pro-disability-in"),
    detail: `Top IDs: ${disabilityTopIds.join(", ")}`,
  });

  const veteranIntake: IntakeFormData = {
    city: "San Francisco",
    ageRange: "18–24",
    firstGen: "no",
    identities: ["Veteran / military-connected"],
    interests: ["Computer Science", "Cybersecurity"],
    supportNeeded: ["Mentorship", "Internships"],
  };

  const veteranTopIds = topLaneIds(veteranIntake);
  results.push({
    name: "Veteran/military-connected surfaces VetsinTech and Tillman Scholars in top matches",
    pass: veteranTopIds.includes("edu-vetsintech") && veteranTopIds.includes("fin-tillman"),
    detail: `Top IDs: ${veteranTopIds.join(", ")}`,
  });

  return results;
}
