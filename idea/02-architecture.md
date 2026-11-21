# Architecture and Design Decisions

## Simple architecture

```text
HR Manager (browser)
       |
Angular + TypeScript (JSON page config and Taomish common components)
       |  HTTP /api, JSON
Spring Boot REST API
       |  Controller -> Service -> Repository
PostgreSQL (employees table)
```

No microservices, queues, caching, background jobs, or added infrastructure. The dataset is moderate and the operations are mostly CRUD and grouped reporting.

## Key decisions and why

| Decision | Reason |
| --- | --- |
| Java 21 + Spring Boot | Straightforward API, validation, transactions, and automated tests. |
| Angular + TypeScript | Reuse the Taomish shared components and page JSON conventions. |
| PostgreSQL | Relational data, indexes, numeric salaries, and aggregate queries are a good fit. |
| One `employees` table with current salary | Salary history is not needed; a second salary model adds complexity. |
| One application backend | Easier to build, debug, test, and explain than microservices. |
| Server-side filters/pagination | Avoids loading 10,000 rows into the browser. |
| Group insights by currency | No false totals from mixing INR, USD, EUR, and other currencies. |
| No demo user accounts | The exercise focuses on one HR persona and uses synthetic data only; production would need login/security controls. |
| No charts initially | Tables and summary figures answer the salary questions with less UI code. |

## Data flow

1. The Angular page reads its JSON configuration and requests a filtered employee page from the API.
2. Controller validates query parameters; service applies rules; repository queries PostgreSQL.
3. Employee create/update/deactivate goes through validated endpoints and a database transaction.
4. Insights endpoints return database aggregates grouped by currency and department. Angular formats the amounts using the returned currency codes.
5. Liquibase loads reproducible dummy data once during application startup.

## Practical boundaries

- Define `EmployeeService` and `InsightService` interfaces for the use cases, with one implementation each. Use Spring Data repository interfaces for database access.
- Use HTTP status codes consistently: `400` invalid input, `404` missing employee, `409` duplicate/stale update.
- Return typed DTOs directly. Use Spring status annotations for status codes and a controller advice for error DTOs.
- Document assumptions rather than inventing features to cover every edge case.
