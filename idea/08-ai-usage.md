# AI Usage and Engineering Decision Log

The assessment **requires intentional AI-assisted development**, not an AI chatbot inside the product. Use AI to speed up design, test brainstorming, and focused code review; personally verify all output. The goal is readable code you can explain, not hiding AI assistance.

## How to use AI well

1. **Before coding:** Ask AI to find missing edge cases or trade-offs in the agreed one-page requirements.
2. **During coding:** Use small prompts (one endpoint, query, component, or test at a time). Review and simplify generated suggestions before committing.
3. **After coding:** Ask for focused review of validation, data consistency, salary/currency grouping, and test gaps.
4. **Verification:** Run tests, inspect SQL/API behavior, and make the final decisions yourself. Do not accept code just because it compiles.

## Record only actual work

As implementation progresses, replace the template entries below with real prompts and outcomes. **Do not claim tools or reviews you did not use.**

| Date / commit | Task | AI tool / prompt (summary or exact prompt) | What I accepted, changed, or rejected | How I verified |
| --- | --- | --- | --- | --- |
| 2026-11-20 | Review requirements and update the design | Codex reviewed `idea/` for a simple Angular design with Taomish JSON rendering and Java service interfaces with direct DTO responses. | Updated the plan and specified validation, precision, and stale-update cases. | Compared the plan with the local Taomish `Page` interface, sample JSON, component module, and `JsonService`. |
| 2026-11-20 | Implement and verify the demo | Codex implemented the Spring Boot API, PostgreSQL schema and seed, and Angular screens around the existing Taomish components. | Used Java records for API responses, decimal strings across the API, and Angular reactive forms driven by page JSON. | Ran the unit tests, seeded PostgreSQL twice, checked the real API, and exercised the employee and insights screens in headless Chrome. |

## Decisions to explain in the final review

- Why a single table for employee and current salary?
- Why PostgreSQL and server-side pagination at 10,000 records?
- Why `BigDecimal` rather than floating-point numbers?
- Why salary results are grouped by currency and not summed globally?
- What validation and stale-update safeguards are in place?
- Why optional enhancements were deliberately excluded?

Keep final code small, idiomatic, and easy to walk through without reading an AI-generated essay.
