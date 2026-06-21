# Student Nova Agent Rules

Student Nova is a UC Berkeley AI Hackathon project for DDOSKI's World.

Mission:
Help underrepresented, first-generation, and Bay Area students discover STEM opportunities, scholarships, workshops, programs, and professional communities.

Core demo path:
Landing page → optional intake form → matched opportunity results in three lanes:
1. Financial: scholarships, stipends, fellowships, STEM-specific aid
2. Educational: programs, workshops, hackathons, university/community programs
3. Professional: orgs, networks, mentorship, career communities

Rules:
- This is an informational directory, not an eligibility-determination tool.
- Never tell users they qualify for anything.
- Say “may be relevant,” “review requirements,” or “verify on the official site.”
- Keep all intake fields optional.
- No auth.
- No payments.
- Use seeded data first.
- Preserve the demo path.
- Small, focused changes only.
- Do not add external APIs until the seeded demo works.

Sponsor plan:
- Redis: geo-ranking and cached matches.
- Browserbase: live opportunity link enrichment.
- Sai: research, QA, demo prep.