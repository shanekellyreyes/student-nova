import "server-only";

import type { Page } from "playwright-core";

export const SOURCE_SCOUT_EXCERPT_MAX = 220;
export const SOURCE_SCOUT_FALLBACK_EXCERPT =
  "Official source checked. No clean summary was extracted from the page.";

const NOISY_LINE_PATTERN =
  /\b(skip to content|facebook|twitter|instagram|youtube|tiktok|linkedin|login|sign in|donate|contact|menu|search|language|subscribe|privacy|terms|cookie|chatbot|may i help you)\b/i;

const SOCIAL_PLATFORMS = [
  "facebook",
  "twitter",
  "instagram",
  "youtube",
  "tiktok",
  "linkedin",
] as const;

const OPPORTUNITY_KEYWORDS = [
  "scholarship",
  "apply",
  "application",
  "deadline",
  "eligibility",
  "requirements",
  "students",
  "program",
  "mentorship",
  "fellowship",
  "college",
  "stem",
  "engineering",
  "computer science",
  "financial aid",
] as const;

const DEADLINE_SENTENCE_PATTERN =
  /\b[^.!?\n]{0,120}\b(?:deadline|due|apply by|application closes|priority deadline)\b[^.!?\n]{0,80}[.!?]?/gi;

function cleanVisibleText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function countSocialPlatforms(text: string): number {
  const lower = text.toLowerCase();
  return SOCIAL_PLATFORMS.filter((platform) => lower.includes(platform)).length;
}

function countNoisyWords(text: string): number {
  const matches = text.toLowerCase().match(
    /\b(skip to content|facebook|twitter|instagram|youtube|tiktok|linkedin|login|sign in|donate|contact|menu|search|language|subscribe|privacy|terms|cookie|chatbot|may i help you)\b/g,
  );
  return matches?.length ?? 0;
}

function usefulCharacterCount(text: string): number {
  return text.replace(/[^a-zA-Z0-9]/g, "").length;
}

function scoreLine(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const keyword of OPPORTUNITY_KEYWORDS) {
    if (lower.includes(keyword)) score += 2;
  }
  score += Math.min(text.length / 40, 3);
  score -= countNoisyWords(text) * 2;
  score -= countSocialPlatforms(text) * 3;
  return score;
}

export function isNoisyLine(line: string): boolean {
  const cleaned = cleanVisibleText(line);
  if (!cleaned || cleaned.length < 12) return true;
  if (NOISY_LINE_PATTERN.test(cleaned) && cleaned.length < 80) return true;
  if (/^skip to content/i.test(cleaned)) return true;
  if (/^may i help you/i.test(cleaned)) return true;
  if (countSocialPlatforms(cleaned) >= 2 && cleaned.length < 120) return true;
  return false;
}

export function isJunkExcerpt(text: string): boolean {
  const cleaned = cleanVisibleText(text);
  if (!cleaned) return true;
  if (usefulCharacterCount(cleaned) < 40) return true;
  if (/^skip to content/i.test(cleaned)) return true;
  if (/^may i help you/i.test(cleaned)) return true;
  if (countSocialPlatforms(cleaned) > 3) return true;

  const words = cleaned.split(/\s+/);
  const noisy = countNoisyWords(cleaned);
  if (words.length > 0 && noisy / words.length > 0.35) return true;

  const shortSegments = cleaned.split(/[|•·]/).map((part) => part.trim());
  if (shortSegments.length >= 4 && shortSegments.every((part) => part.length < 35)) {
    return true;
  }

  return false;
}

function trimExcerpt(text: string): string {
  const cleaned = cleanVisibleText(text);
  if (cleaned.length <= SOURCE_SCOUT_EXCERPT_MAX) return cleaned;
  return `${cleaned.slice(0, SOURCE_SCOUT_EXCERPT_MAX).trim()}…`;
}

export function buildSourceExcerptFromLines(lines: string[]): {
  sourceExcerpt: string;
  usedFallback: boolean;
} {
  const filtered = lines.map(cleanVisibleText).filter((line) => line && !isNoisyLine(line));

  if (filtered.length === 0) {
    return { sourceExcerpt: SOURCE_SCOUT_FALLBACK_EXCERPT, usedFallback: true };
  }

  const ranked = [...filtered].sort((a, b) => scoreLine(b) - scoreLine(a));
  const best = ranked.find((line) => scoreLine(line) > 0) ?? ranked[0];
  const candidate = trimExcerpt(best);

  if (isJunkExcerpt(candidate)) {
    return { sourceExcerpt: SOURCE_SCOUT_FALLBACK_EXCERPT, usedFallback: true };
  }

  return { sourceExcerpt: candidate, usedFallback: false };
}

export function extractPossibleDeadlineText(text: string): string | undefined {
  const cleaned = cleanVisibleText(text);
  if (!cleaned) return undefined;

  const matches = cleaned.match(DEADLINE_SENTENCE_PATTERN);
  if (!matches?.length) return undefined;

  for (const match of matches) {
    const sentence = cleanVisibleText(match).slice(0, 160);
    const lower = sentence.toLowerCase();
    const hasDeadlineSignal =
      lower.includes("deadline") ||
      lower.includes("apply by") ||
      lower.includes("application closes") ||
      lower.includes("priority deadline") ||
      (lower.includes("due") && lower.includes("application"));

    if (!hasDeadlineSignal) continue;
    if (isNoisyLine(sentence)) continue;
    if (countSocialPlatforms(sentence) > 0) continue;
    if (usefulCharacterCount(sentence) < 20) continue;

    return sentence;
  }

  return undefined;
}

export async function extractCleanPageContent(page: Page): Promise<{
  pageTitle: string;
  rawTextLength: number;
  cleanedTextLength: number;
  lines: string[];
}> {
  const pageTitle = cleanVisibleText(await page.title());
  const extracted = await page.evaluate(() => {
    const body = document.body;
    if (!body) {
      return { rawTextLength: 0, lines: [] as string[] };
    }

    const rawTextLength = (body.innerText ?? "").length;
    const root = body.cloneNode(true) as HTMLElement;

    const removeSelectors = [
      "nav",
      "header",
      "footer",
      "script",
      "style",
      "noscript",
      "svg",
      "button",
      "form",
      "input",
      "select",
      "aside",
      "dialog",
      '[aria-hidden="true"]',
    ];

    for (const selector of removeSelectors) {
      root.querySelectorAll(selector).forEach((element) => element.remove());
    }

    const contentRoot =
      root.querySelector("main, article, [role='main']") ??
      root.querySelector("#main, #content, .main-content") ??
      root;

    const lines: string[] = [];
    const seen = new Set<string>();

    contentRoot.querySelectorAll("h1, h2, h3, p, li, section").forEach((element) => {
      const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
      if (!text || text.length < 20) return;
      if (seen.has(text)) return;
      seen.add(text);
      lines.push(text);
    });

    if (lines.length === 0) {
      const fallback = contentRoot.textContent?.replace(/\s+/g, " ").trim() ?? "";
      if (fallback) lines.push(fallback);
    }

    return { rawTextLength, lines };
  });

  const lines = extracted.lines.map(cleanVisibleText).filter(Boolean);
  const cleanedTextLength = lines.join(" ").length;

  return {
    pageTitle,
    rawTextLength: extracted.rawTextLength,
    cleanedTextLength,
    lines,
  };
}

export function buildCheckedSourceFields(lines: string[]): {
  sourceExcerpt: string;
  possibleDeadlineText?: string;
  usedFallback: boolean;
} {
  const { sourceExcerpt, usedFallback } = buildSourceExcerptFromLines(lines);
  const fullCleanText = lines.join(" ");
  const possibleDeadlineText = extractPossibleDeadlineText(fullCleanText);

  return {
    sourceExcerpt,
    possibleDeadlineText,
    usedFallback,
  };
}
