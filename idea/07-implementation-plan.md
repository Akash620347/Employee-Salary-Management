# Build Order and Commit Plan

**No coding until the one-page requirements and main design choices are accepted as the project baseline.** Each step should result in a small working increment and a meaningful commit.

At the start of implementation, verify that the Angular build can resolve `common-ui-v2` and render one JSON-defined table and form. This checks the shared dependency before the frontend screens depend on it.

| Step | Deliverable | Example commit message |
| --- | --- | --- |
| 1 | Requirements, decisions, and planned tests | `docs: define salary management MVP` |
| 2 | Spring Boot project, database connection, Flyway schema | `feat: set up backend and employee schema` |
| 3 | Repeatable 10,000-record seed script | `feat: add deterministic employee seed` |
| 4 | Employee list/detail/create/update/deactivate APIs + validations | `feat: implement employee management` |
| 5 | Backend unit and API/repository tests | `test: cover employee workflows` |
| 6 | Search, filters, pagination, and salary insights APIs | `feat: add employee search and pay insights` |
| 7 | Angular employee screens from JSON page definitions | `feat: add HR employee screens` |
| 8 | Angular insights screen with shared tables and focused UI tests | `feat: add salary insights view` |
| 9 | End-to-end validation, docs, deployment, demo video | `chore: prepare working assessment demo` |

## Scope rules while coding

- Do the smallest useful implementation for each endpoint and screen.
- Prefer clear methods over clever streams, reflection, generic helpers, or large abstractions.
- Avoid long controller methods: put business rules in services and queries in repositories.
- No full HRMS, advanced UI, chatbot, salary history, Excel functionality, currency conversion, or extra infrastructure.
- Document only decisions that matter; every class and design choice should be easy to explain in an interview.
- Keep commit messages honest: commit each working increment instead of one final bulk commit.

## Delivery checklist

- [ ] Repository contains the one-page requirements and supporting design notes.
- [ ] Tests run with a documented command; database setup and seed steps are documented.
- [ ] The deployment build can resolve the approved Taomish library dependency from a clean checkout.
- [ ] Backend, frontend, and PostgreSQL are running together in the deployed demo.
- [ ] Record a short walkthrough: list/filter -> create -> update salary -> deactivate -> view insights.
- [ ] Link repository and deployed demo when replying to the assessment email.
