import "server-only";

import Browserbase from "@browserbasehq/sdk";
import { chromium } from "playwright-core";

import type { SourceScoutDegradedReason, SourceScoutNote, SourceScoutNoteStatus } from "@/types/source-scout";
import { SOURCE_SCOUT_MAX_URLS } from "@/types/source-scout";
import {
  buildCheckedSourceFields,
  extractCleanPageContent,
} from "@/lib/source-scout-extract";

export type OfficialSourceTarget = {
  opportunityId: string;
  title: string;
  sourceUrl: string;
};

export type BrowserbaseConfigSnapshot = {
  hasApiKey: boolean;
  hasProjectId: boolean;
  enabled: boolean;
};

export type CheckOfficialSourcesResult = {
  sessionUrl?: string;
  notes: SourceScoutNote[];
  reason?: SourceScoutDegradedReason;
};

const PAGE_TIMEOUT_MS = 12_000;
const FALLBACK_NOTE_REASON = "Live refresh unavailable — showing seeded official links";

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

function devLog(message: string, meta?: Record<string, string | number | boolean>) {
  if (!isDev()) return;
  if (meta) {
    console.log(`[source-scout] ${message}`, meta);
  } else {
    console.log(`[source-scout] ${message}`);
  }
}

export function getBrowserbaseConfigSnapshot(): BrowserbaseConfigSnapshot {
  return {
    hasApiKey: Boolean(process.env.BROWSERBASE_API_KEY?.trim()),
    hasProjectId: Boolean(process.env.BROWSERBASE_PROJECT_ID?.trim()),
    enabled: process.env.BROWSERBASE_ENABLE_FETCH === "true",
  };
}

export function getBrowserbaseDisabledReason(): SourceScoutDegradedReason | null {
  const config = getBrowserbaseConfigSnapshot();
  if (!config.hasApiKey) return "missing_api_key";
  if (!config.hasProjectId) return "missing_project_id";
  if (!config.enabled) return "disabled";
  return null;
}

export function isBrowserbaseFetchEnabled(): boolean {
  return getBrowserbaseDisabledReason() === null;
}

function classifyErrorReason(error: unknown): SourceScoutDegradedReason {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    if (message.includes("timeout") || name.includes("timeout")) {
      return "timeout";
    }
  }
  return "unknown_error";
}

function classifyPageFetchReason(error: unknown): SourceScoutDegradedReason {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    if (message.includes("timeout") || name.includes("timeout")) {
      return "timeout";
    }
  }
  return "page_fetch_failed";
}

function isSafeOfficialUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function buildNote(
  target: OfficialSourceTarget,
  checkedAt: string,
  status: SourceScoutNoteStatus,
  sessionUrl: string | undefined,
  fields: Partial<SourceScoutNote> = {},
): SourceScoutNote {
  return {
    opportunityId: target.opportunityId,
    title: target.title,
    sourceUrl: target.sourceUrl,
    checkedAt,
    status,
    sessionUrl,
    ...fields,
  };
}

function buildFallbackNotes(
  batch: OfficialSourceTarget[],
  checkedAt: string,
  sessionUrl?: string,
): SourceScoutNote[] {
  return batch.map((target) =>
    buildNote(target, checkedAt, "fallback", sessionUrl, {
      reason: FALLBACK_NOTE_REASON,
    }),
  );
}

function summarizePageFailures(notes: SourceScoutNote[]): SourceScoutDegradedReason {
  const failedNotes = notes.filter((note) => note.status === "failed");
  if (failedNotes.some((note) => note.reason?.toLowerCase().includes("timeout"))) {
    return "timeout";
  }
  return "page_fetch_failed";
}

export async function checkOfficialSourcesWithBrowserbase(
  targets: OfficialSourceTarget[],
): Promise<CheckOfficialSourcesResult> {
  const checkedAt = new Date().toISOString();
  const batch = targets.slice(0, SOURCE_SCOUT_MAX_URLS);

  const apiKey = process.env.BROWSERBASE_API_KEY?.trim();
  const bb = new Browserbase({ apiKey: apiKey! });

  let session: Awaited<ReturnType<typeof bb.sessions.create>> | null = null;
  let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | null = null;
  const sessionUrl = () =>
    session ? `https://www.browserbase.com/sessions/${session.id}` : undefined;

  try {
    session = await bb.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      timeout: 120,
    });
    devLog("session create success", { sessionId: session.id });
  } catch (error) {
    devLog("session create failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      notes: buildFallbackNotes(batch, checkedAt),
      reason: "session_create_failed",
    };
  }

  try {
    browser = await chromium.connectOverCDP(session.connectUrl);
    devLog("connect success");
  } catch (error) {
    devLog("connect failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      sessionUrl: sessionUrl(),
      notes: buildFallbackNotes(batch, checkedAt, sessionUrl()),
      reason: "browser_connect_failed",
    };
  }

  try {
    const context = browser.contexts()[0] ?? (await browser.newContext());
    let page = context.pages()[0];
    if (!page) {
      page = await context.newPage();
    }

    const notes: SourceScoutNote[] = [];

    for (const target of batch) {
      if (!isSafeOfficialUrl(target.sourceUrl)) {
        notes.push(
          buildNote(target, checkedAt, "failed", sessionUrl(), {
            reason: "Official URL could not be checked safely.",
          }),
        );
        devLog("page fetch failure", {
          opportunityId: target.opportunityId,
          message: "unsafe url",
        });
        continue;
      }

      try {
        await page.goto(target.sourceUrl, {
          waitUntil: "domcontentloaded",
          timeout: PAGE_TIMEOUT_MS,
        });

        const { pageTitle, rawTextLength, cleanedTextLength, lines } =
          await extractCleanPageContent(page);
        const { sourceExcerpt, possibleDeadlineText, usedFallback } =
          buildCheckedSourceFields(lines);

        devLog("extraction quality", {
          opportunityId: target.opportunityId,
          rawTextLength,
          cleanedTextLength,
          usedFallback,
        });

        notes.push(
          buildNote(target, checkedAt, "checked", sessionUrl(), {
            pageTitle: pageTitle || undefined,
            sourceExcerpt,
            possibleDeadlineText,
          }),
        );
        devLog("page fetch success", { opportunityId: target.opportunityId });
      } catch (error) {
        const pageReason = classifyPageFetchReason(error);
        notes.push(
          buildNote(target, checkedAt, "failed", sessionUrl(), {
            reason:
              error instanceof Error
                ? `Could not load official source (${error.message}). Verify on the official site.`
                : "Could not load official source. Verify on the official site.",
          }),
        );
        devLog("page fetch failure", {
          opportunityId: target.opportunityId,
          message: error instanceof Error ? error.message : "unknown",
          reason: pageReason,
        });
      }
    }

    const checkedCount = notes.filter((note) => note.status === "checked").length;
    const hasFailed = notes.some((note) => note.status === "failed");

    if (checkedCount === 0 && hasFailed) {
      return {
        sessionUrl: sessionUrl(),
        notes,
        reason: summarizePageFailures(notes),
      };
    }

    if (hasFailed) {
      return {
        sessionUrl: sessionUrl(),
        notes,
        reason: summarizePageFailures(notes),
      };
    }

    return { sessionUrl: sessionUrl(), notes };
  } catch (error) {
    devLog("page fetch failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      sessionUrl: sessionUrl(),
      notes: buildFallbackNotes(batch, checkedAt, sessionUrl()),
      reason: classifyErrorReason(error),
    };
  } finally {
    try {
      await browser?.close();
    } catch {
      // Best-effort cleanup.
    }
  }
}
