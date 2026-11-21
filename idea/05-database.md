# Database, Seeding, and Reasonable Scale

## Database choice

**PostgreSQL.** A single relational table plus a few indexes easily supports 10,000 employee records. Liquibase applies the SQL changesets at startup.

## `employees` table

| Column | Type | Note |
| --- | --- | --- |
| `id` | BIGINT identity PK | Internal identifier |
| `employee_code` | VARCHAR(20) UNIQUE NOT NULL | HR-facing reference |
| `first_name`, `last_name` | VARCHAR(80) NOT NULL | Employee name |
| `email` | VARCHAR(255) UNIQUE NOT NULL | Employee contact |
| `department`, `job_title` | VARCHAR(100) NOT NULL | Search and insights |
| `country_code` | CHAR(2) NOT NULL | ISO country code |
| `currency_code` | CHAR(3) NOT NULL | Local salary currency |
| `annual_gross_base_salary` | NUMERIC(18,2) NOT NULL | Positive annual salary |
| `status` | VARCHAR(8) NOT NULL | `ACTIVE` or `INACTIVE` |
| `version` | BIGINT NOT NULL | Optimistic update check |
| `created_at`, `updated_at` | TIMESTAMPTZ NOT NULL | Basic metadata (not history) |

Enforce positive salary, valid status, and unique code and email. Normalize code and email before writing and enforce the normalized formats in PostgreSQL so direct writes follow the same rules.

Use a fixed sample set of country/currency pairs: `IN/INR`, `US/USD`, `GB/GBP`, `DE/EUR`, `FR/EUR`, and `SG/SGD`. Germany and France provide a test that summary groups follow currency even when employees live in different countries.

## Indexing and querying

- Index `status`, `department`, `country_code`, and `currency_code` where useful for filtering/insights.
- Use database `LIMIT`/`OFFSET` (Spring `Pageable`) for employee list; return `totalElements` for pagination.
- Compute totals/averages/min/max using `GROUP BY`, not a Java loop over the whole table.
- Use a stable default sort (employee code + id) so pages do not shuffle unexpectedly.
- Review indexes with sample queries before adding more; 10,000 rows does not justify premature tuning.

## Seed changeset

Liquibase applies `db/changelog/002-seed-employees.sql` to insert **exactly 10,000 synthetic employees** into an empty database.

- Use deterministic employee codes and reserved example email domains. Seed a fixed set of countries, currencies, departments, and job titles.
- Plausible but **fake** salary amounts; use no real personal information.
- Match currency to country. Include different pay bands and a few inactive employees.
- Verify that the first run against a fresh database inserts 10,000 employees and a second run leaves the count and salaries unchanged. Use `ON CONFLICT DO NOTHING` so the seed preserves existing rows.
- Keep the seed and table definition in separate changesets. Liquibase records each applied changeset.

## Data consistency

CRUD updates are transactional. Use `@Version` for a clean conflict response (`409`) if the same record changes before an update or deletion. Deactivation updates the status. Permanent deletion removes the row through the separate delete action. Only the current salary is in scope.
