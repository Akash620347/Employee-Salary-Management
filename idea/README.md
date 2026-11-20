# Employee Salary Management — Assessment Plan

A small, functional web application for **one HR Manager** to manage employee records and understand annual gross base salaries across countries.

**Status:** Local implementation. See the [setup and verification guide](../README.md).

## Chosen stack

- **Frontend:** Angular + TypeScript, Taomish `common-ui-v2`, and JSON-driven pages
- **Backend:** Java 21 + Spring Boot 3, Spring Web, Spring Data JPA, Bean Validation
- **Database:** PostgreSQL, with Flyway for schema changes
- **Tests:** JUnit 5, Mockito, and Spring tests for the backend. Angular TestBed with the frontend workspace's test runner for key UI behavior.

## Read these files in order

1. [One-page requirements](01-requirements.md)
2. [Architecture and decisions](02-architecture.md)
3. [Backend plan](03-backend.md)
4. [Frontend plan](04-frontend.md)
5. [Database and scale](05-database.md)
6. [Test plan](06-testing.md)
7. [Build and commit plan](07-implementation-plan.md)
8. [AI usage and decisions](08-ai-usage.md)

## Product boundaries

Build employee listing, details, creation, editing, and deactivation, with current annual gross base salary, country/currency support, search and filters, and a **plain salary insights screen**. Use **10,000 deterministic dummy employees**. No full HRMS, payroll, AI feature, salary history, currency conversion, Excel import/export, or elaborate UI.

## Submission definition of done

- One-page requirements finished **before** coding
- Working backend and Angular UI, connected to PostgreSQL
- Repeatable seed script with 10,000 employees
- Focused automated tests passing
- Public demo deployment with dummy data
- Short demo video; Git repository with **incremental, meaningful commits**
- Evidence of design trade-offs and actual AI use in the docs

**Principle:** Solve the stated problem with clean, explainable code. No extra features unless the core workflow is finished and requirements change.
