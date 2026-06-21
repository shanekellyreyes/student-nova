"use client";

import { useCallback, useRef, useState } from "react";
import {
  AGE_RANGES,
  CITIES,
  FIRST_GEN_OPTIONS,
  IDENTITY_OPTIONS,
  INTEREST_OPTIONS,
  SUPPORT_OPTIONS,
} from "@/data/opportunities";
import { getReliabilityLabel, matchOpportunities } from "@/data/matcher";
import type { IntakeFormData, MatchResults, ScoredOpportunity } from "@/types/opportunity";
import { MATCH_STRENGTH_LABELS } from "@/types/opportunity";

type Stage = "hero" | "intro" | "form" | "results";

const emptyForm: IntakeFormData = {
  city: "",
  ageRange: "",
  firstGen: "",
  identities: [],
  interests: [],
  supportNeeded: [],
};

function toggleChip(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function HeroSection({ onUnlock }: { onUnlock: () => void }) {
  const [videoError, setVideoError] = useState(false);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20">
      {!videoError ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setVideoError(true)}
        >
          <source src="/343300.mp4" type="video/mp4" />
        </video>
      ) : (
        <div className="paper-texture absolute inset-0" />
      )}

      <div className="hero-overlay absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-onyx/50 via-transparent to-onyx/20" />

      <div className="cloud-drift pointer-events-none absolute top-[12%] left-[8%] h-16 w-32 rounded-full bg-ivory/10 blur-xl" />
      <div className="cloud-drift pointer-events-none absolute top-[18%] right-[10%] h-12 w-24 rounded-full bg-lavender-soft/15 blur-xl [animation-delay:4s]" />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
        <p className="hero-eyebrow mb-5 text-xs font-medium tracking-widest uppercase">
          Bay Area STEM opportunity guide
        </p>
        <h1 className="font-display hero-title text-5xl leading-[1.05] sm:text-6xl md:text-7xl">
          Student Nova
        </h1>
        <p className="font-display hero-tagline mt-8 text-2xl sm:text-3xl md:text-[2rem]">
          Discover STEM opportunities built for you.
        </p>
        <p className="hero-support mt-5 max-w-md text-sm leading-relaxed sm:text-base">
          A warm guide for Bay Area students looking for scholarships, programs, workshops, and
          communities that open doors.
        </p>

        <button
          type="button"
          onClick={onUnlock}
          className="hero-cta mt-10 rounded-full px-8 py-4 text-base font-medium active:scale-[0.98]"
        >
          <span className="hero-cta-icon" aria-hidden="true">
            ❧
          </span>
          Begin your path
        </button>

        <p className="hero-support mt-6 text-sm">
          No account needed. All questions are optional.
        </p>
      </div>
    </section>
  );
}

function IntroSection({ visible, onStart }: { visible: boolean; onStart: () => void }) {
  if (!visible) return null;

  return (
    <section className="chapter-section stage-reveal relative px-6 py-24 botanical-corner botanical-corner-tr">
      <div className="mx-auto max-w-xl text-center">
        <div className="chapter-ornament mx-auto mb-6" aria-hidden="true" />
        <p className="font-display text-2xl leading-relaxed text-navy sm:text-3xl">
          I&apos;m here to help.
        </p>
        <p className="mt-4 font-display text-xl leading-relaxed text-navy/80 sm:text-2xl">
          I&apos;ll ask a few optional questions so I can find resources that may fit your goals,
          background, and location.
        </p>
        <div className="chapter-ornament mx-auto mt-8 rotate-180" aria-hidden="true" />
        <button
          type="button"
          onClick={onStart}
          className="mt-8 rounded-full border-2 border-navy bg-cream/60 px-8 py-3.5 text-base font-medium text-navy shadow-sm transition-all hover:bg-navy hover:text-cream hover:shadow-md"
        >
          Start matching
        </button>
      </div>
    </section>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium text-navy">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(toggleChip(selected, option))}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-sage/50 ${
                isSelected
                  ? "chip-selected"
                  : "border-tan bg-cream text-navy/80 hover:border-sage hover:bg-paper-warm"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function FormSection({
  visible,
  form,
  onChange,
  onSubmit,
}: {
  visible: boolean;
  form: IntakeFormData;
  onChange: (next: IntakeFormData) => void;
  onSubmit: () => void;
}) {
  if (!visible) return null;

  return (
    <section className="stage-reveal bg-cream px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-display mb-2 text-center text-3xl text-navy-deep">
          Tell us a little about you
        </h2>
        <p className="mb-10 text-center text-sm text-helper">
          Every field is optional — share only what feels comfortable.
        </p>
        <p className="mb-8 text-center text-xs leading-relaxed text-helper">
          If you&apos;re under 16, Student Nova will prioritize youth-friendly programs and encourage
          checking details with a parent, guardian, teacher, or counselor.
        </p>

        <form
          className="space-y-8 rounded-2xl border border-tan/60 bg-paper/60 p-6 shadow-sm sm:p-10"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-navy">City</span>
              <select
                value={form.city}
                onChange={(event) => onChange({ ...form, city: event.target.value })}
                className="w-full rounded-xl border border-tan bg-cream px-4 py-3 text-navy outline-none transition-colors focus:border-sage focus:ring-2 focus:ring-sage/40"
              >
                <option value="">Select a city (optional)</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-navy">Age range</span>
              <select
                value={form.ageRange}
                onChange={(event) => onChange({ ...form, ageRange: event.target.value })}
                className="w-full rounded-xl border border-tan bg-cream px-4 py-3 text-navy outline-none transition-colors focus:border-sage focus:ring-2 focus:ring-sage/40"
              >
                <option value="">Select age range (optional)</option>
                {AGE_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-navy">
              First-generation college student?
            </legend>
            <p className="mb-3 text-xs text-helper">
              Usually means neither parent completed a 4-year college degree.
            </p>
            <div className="flex flex-wrap gap-3">
              {FIRST_GEN_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm capitalize transition-colors ${
                    form.firstGen === option
                      ? "chip-selected"
                      : "border-tan bg-cream text-navy/80 hover:border-sage"
                  }`}
                >
                  <input
                    type="radio"
                    name="firstGen"
                    value={option}
                    checked={form.firstGen === option}
                    onChange={() => onChange({ ...form, firstGen: option })}
                    className="sr-only"
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <ChipGroup
            label="Identity / community focus"
            options={IDENTITY_OPTIONS}
            selected={form.identities}
            onChange={(identities) => onChange({ ...form, identities })}
          />

          <ChipGroup
            label="Interests"
            options={INTEREST_OPTIONS}
            selected={form.interests}
            onChange={(interests) => onChange({ ...form, interests })}
          />

          <ChipGroup
            label="Support needed"
            options={SUPPORT_OPTIONS}
            selected={form.supportNeeded}
            onChange={(supportNeeded) => onChange({ ...form, supportNeeded })}
          />

          <div className="pt-2 text-center">
            <button
              type="submit"
              className="rounded-full bg-navy px-10 py-4 text-base font-medium text-cream shadow-md transition-all hover:bg-navy-deep hover:shadow-lg active:scale-[0.98]"
            >
              Find my opportunities
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function OpportunityCard({ opportunity }: { opportunity: ScoredOpportunity }) {
  const { title, description, whyMayFit, badges, matchReasons, matchStrength, url, reliability } =
    opportunity;

  const strengthClass =
    matchStrength === "strong"
      ? "match-strength--strong"
      : matchStrength === "good"
        ? "match-strength--good"
        : "match-strength--explore";

  return (
    <article className="flex h-full flex-col rounded-xl border border-tan/50 bg-cream p-5 transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="font-display text-lg text-navy-deep">{title}</h4>
        <span className={`match-strength shrink-0 ${strengthClass}`}>
          {MATCH_STRENGTH_LABELS[matchStrength]}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-navy/75">{description}</p>
      {matchReasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {matchReasons.map((reason) => (
            <span key={reason} className="match-reason-chip">
              {reason}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-sm leading-relaxed text-navy/85">
        <span className="font-medium text-navy-deep">Why this may fit: </span>
        {whyMayFit}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {badges.map((badge) => (
          <span
            key={badge}
            className="rounded-full bg-lavender-soft/60 px-2.5 py-0.5 text-xs text-navy/70"
          >
            {badge}
          </span>
        ))}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center justify-center rounded-full border border-navy/30 px-4 py-2 text-sm font-medium text-navy transition-colors hover:border-navy hover:bg-navy hover:text-cream"
      >
        View official site
      </a>
      <p className="mt-2 text-xs text-helper">{getReliabilityLabel(reliability)}</p>
      <p className="mt-1 text-xs text-helper">Verify requirements on the official site.</p>
    </article>
  );
}

function ResultsSection({
  visible,
  matchResults,
  onRefine,
  onStartOver,
}: {
  visible: boolean;
  matchResults: MatchResults | null;
  onRefine: () => void;
  onStartOver: () => void;
}) {
  if (!visible || !matchResults) return null;

  const laneDescriptions: Record<string, string> = {
    financial: "Scholarships, stipends, and aid worth reviewing.",
    educational: "Programs, workshops, and learning paths to explore.",
    professional: "Networks, mentorship, and communities to connect with.",
  };

  const laneHeaderClass: Record<string, string> = {
    financial: "lane-header--financial",
    educational: "lane-header--educational",
    professional: "lane-header--professional",
  };

  const laneCountText = matchResults.lanes
    .map((lane) => `${lane.label} ${lane.opportunities.length}`)
    .join(" · ");

  return (
    <section className="stage-reveal bg-paper-warm px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-display text-center text-3xl text-navy-deep sm:text-4xl">
          Your matched opportunities
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-navy/80">
          Here are opportunities that may fit your goals, interests, and background.
        </p>
        <p className="mt-2 text-center text-sm text-helper">
          Showing {matchResults.totalCount} opportunities · {laneCountText}
        </p>

        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-lavender/40 bg-cream/80 px-5 py-4 text-center">
          <p className="text-sm leading-relaxed text-navy/85">{matchResults.personalizedSummary}</p>
        </div>

        {matchResults.isUnder16 && (
          <p className="mx-auto mt-4 max-w-2xl rounded-xl border border-sage/40 bg-sage/10 px-4 py-3 text-center text-sm leading-relaxed text-navy/80">
            Some opportunities may require a parent, guardian, teacher, or counselor to help apply.
          </p>
        )}

        <div className="results-lanes results-bloom mt-12">
          {matchResults.lanes.map((lane) => (
            <div key={lane.lane} className="lane-row">
              <div className={`lane-header ${laneHeaderClass[lane.lane]}`}>
                <h3 className="lane-header-title font-display text-xl sm:text-2xl">{lane.label}</h3>
                <p className="mt-1 text-sm text-helper">{laneDescriptions[lane.lane]}</p>
              </div>
              <div className="lane-cards">
                {lane.opportunities.map((opportunity) => (
                  <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRefine}
            className="rounded-full border-2 border-navy bg-cream px-6 py-3 text-sm font-medium text-navy transition-all hover:bg-navy hover:text-cream"
          >
            Refine answers
          </button>
          <button
            type="button"
            onClick={onStartOver}
            className="rounded-full border border-tan bg-paper px-6 py-3 text-sm font-medium text-navy/70 transition-all hover:border-sage hover:text-navy"
          >
            Start over
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-tan/40 bg-navy-deep px-6 py-10 text-center">
      <p className="mx-auto max-w-2xl text-sm leading-relaxed text-cream/70">
        Student Nova is an informational directory, not an eligibility decision tool. Always verify
        deadlines and requirements with the official program.
      </p>
      <p className="mt-4 text-xs text-cream/40">
        UC Berkeley AI Hackathon · DDOSKI&apos;s World
      </p>
    </footer>
  );
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("hero");
  const [form, setForm] = useState<IntakeFormData>(emptyForm);
  const [matchResults, setMatchResults] = useState<MatchResults | null>(null);

  const introRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleUnlock = () => {
    setStage("intro");
    scrollTo(introRef);
  };

  const handleStartMatching = () => {
    setStage("form");
    scrollTo(formRef);
  };

  const handleSubmit = () => {
    setMatchResults(matchOpportunities(form));
    setStage("results");
    scrollTo(resultsRef);
  };

  const handleRefine = () => {
    setStage("form");
    scrollTo(formRef);
  };

  const handleStartOver = () => {
    setForm(emptyForm);
    setMatchResults(null);
    setStage("hero");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <HeroSection onUnlock={handleUnlock} />

      <div ref={introRef}>
        <IntroSection visible={stage !== "hero"} onStart={handleStartMatching} />
      </div>

      <div ref={formRef}>
        <FormSection
          visible={stage === "form" || stage === "results"}
          form={form}
          onChange={setForm}
          onSubmit={handleSubmit}
        />
      </div>

      <div ref={resultsRef}>
        <ResultsSection
          visible={stage === "results"}
          matchResults={matchResults}
          onRefine={handleRefine}
          onStartOver={handleStartOver}
        />
      </div>

      <Footer />
    </>
  );
}
