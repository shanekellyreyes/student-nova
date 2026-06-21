# Student Nova

Student Nova helps students discover STEM opportunities that may fit their goals, interests, background, and support needs.

Built during the UC Berkeley AI Hackathon.

---

## The Problem

Students—especially first-generation, underrepresented, and underserved students—often miss valuable STEM opportunities because information is fragmented across dozens of websites, organizations, scholarships, and programs.

Even when opportunities exist, students may not know:

* Where to start
* Which programs are relevant
* Which communities can support them
* What resources exist in their region
* How to take the first step

Student Nova was built to create a warmer, more personalized first step into STEM.

---

## What Student Nova Does

Students complete a short optional onboarding experience.

Student Nova then:

* Matches opportunities across Financial, Educational, and Professional pathways
* Highlights why opportunities may fit
* Uses safe language instead of eligibility claims
* Provides official links for further verification
* Generates a personalized Nova Guide action plan
* Surfaces community-relevant resources and mentorship pathways

Examples include:

* Scholarships
* STEM programs
* Workshops
* Mentorship communities
* Professional organizations
* Career development resources

---

## Key Features

### Personalized Matching

Student Nova considers:

* Community relevance
* First-generation status
* Interests
* Support needs
* Age range
* Location relevance

The platform uses deterministic matching to remain transparent and explainable.

### Nova Guide AI

After matching, students can generate a personalized action plan that explains:

* Why opportunities may fit
* Suggested next steps
* Questions to ask
* Resources worth exploring

Nova Guide is designed as planning support—not an eligibility decision system.

### Redis Match Cache

Student Nova uses Redis to cache anonymous match metadata for repeated searches.

### Redis Opportunity Signals

Redis also powers anonymous aggregate signals, including:

* Popular interests
* Popular support needs
* Trending opportunities

No personal profile information is stored.

### Sentry Monitoring

Sentry provides:

* Error monitoring
* Tracing
* Reliability visibility

### Browserbase (In Progress)

Browserbase is being explored as a living-directory refresh system for checking official opportunity sources and surfacing updated information.

---

## Safety & Trust

Student Nova is intentionally designed not to make eligibility decisions.

The platform never says:

* "You qualify"
* "You are eligible"
* Guaranteed recommendations

Instead it uses:

* "May fit"
* "May be relevant"
* "Worth reviewing"
* "Verify requirements on the official site"

Students should always verify requirements directly with the opportunity provider.

---

## Tech Stack

### Frontend

* Next.js 16
* React
* TypeScript
* Tailwind CSS

### AI

* OpenAI
* Nova Guide AI

### Infrastructure

* Redis
* Sentry
* Vercel

### Exploration / Future Enhancements

* Browserbase
* Arize

---

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build for production:

```bash
npm run build
```

---

## Environment Variables

Examples:

```env
OPENAI_API_KEY=
OPENAI_MODEL=

REDIS_HOST=
REDIS_PORT=
REDIS_USER=
REDIS_PASSWORD=

BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=
BROWSERBASE_ENABLE_FETCH=true
```

---

## Limitations

Student Nova is not:

* An admissions tool
* A scholarship eligibility checker
* Legal advice
* Financial advice
* A guarantee of acceptance

Opportunity information may change over time.

Students should always verify requirements on the official website.

---

## Future Work

* Browserbase-powered opportunity refresh
* Improved location-aware recommendations
* Additional community-specific resources
* Enhanced opportunity verification
* Long-term mentorship pathways
* AI evaluation and observability

---

## Why We Built It

We believe opportunity should be easier to discover.

Student Nova helps students find pathways into STEM—one opportunity at a time.
