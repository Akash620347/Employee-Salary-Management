# Backend Plan — Java / Spring Boot

## Package structure

```text
com.acme.salary
  controller/
    ApiExceptionHandler.java
    EmployeeController.java
    InsightController.java
  services/
    DefaultEmployeeService.java
    DefaultInsightService.java
  interfaces/
    EmployeeService.java
    InsightService.java
  repository/
    EmployeeRepository.java
    EmployeeSpecifications.java
    InsightRepository.java
  entity/
    Employee.java
  dto/
    ApiError.java
    DeactivationRequest.java
    EmployeeFilter.java
    EmployeeRequest.java
    EmployeeResponse.java
    InsightResponse.java
  common/
    ApiException.java
    SalaryRules.java
```

Use one service interface and one implementation per feature. Keep the controllers focused on HTTP mapping, and use records for request and response DTOs.

Configure PostgreSQL, JPA, Liquibase, and the HTTP listener in `backend/src/main/resources/application.yml`. Set the database credentials through environment variables.

## Required endpoints

| Method + path | Purpose |
| --- | --- |
| `GET /api/employees` | Paginated list; name, department, country, status, currency, minSalary, maxSalary filters |
| `GET /api/employees/{id}` | Employee details |
| `POST /api/employees` | Create an active employee and return `201` with the saved DTO |
| `PUT /api/employees/{id}` | Save employee details and current salary using the version from the form |
| `PATCH /api/employees/{id}/deactivate` | Mark the employee inactive using the version from the record |
| `GET /api/insights/summary` | Active employee count and count, average, minimum, maximum, and total per currency |
| `GET /api/insights/departments` | Count, average, minimum, maximum, and total per department and currency for active employees |
| `GET /api/insights/top-earners?currency=INR&limit=5` | Highest-paid active employees in one currency |

No login or role system for the assessment demo (synthetic data only). Do not use this configuration with real employee salary data.

## API response shapes

- Employee reads and mutations return `EmployeeResponse`, including `id`, `status`, and `version`. The list returns `EmployeePageResponse` with `content`, `page`, `size`, `totalElements`, and `totalPages`. Keep that contract independent of Spring Data's internal page type.
- Use `@ResponseStatus` for `201` and return the DTO from the controller method. Use `@RestControllerAdvice` with typed `ApiError` records and status annotations for `400`, `404`, and `409`. Provide a short `message` and `fieldErrors` keyed by request field where applicable. Controllers and advice return DTOs directly, without `ResponseEntity`.
- Exchange salary values and monetary aggregates as decimal strings so the browser can keep cents exact across the full `NUMERIC(18,2)` range. Validate the decimal text at the boundary and use `BigDecimal` for business logic. Round displayed averages to two decimal places consistently.

## Rules and validations

- Trim text, check required fields and column lengths, and validate email format. Normalize employee codes to uppercase and emails to lowercase before storing. Enforce uniqueness in PostgreSQL, including inactive records, and map duplicate constraint failures to the relevant `409` field error.
- Salary must be positive with at most 16 integer digits and two fractional digits. Use the documented country/currency pairs. If an edit changes the country, validate the new pair and amount together. A country change never converts the salary automatically.
- Name search is a case-insensitive literal substring of the full name. An empty name filter is ignored. Page numbering starts at zero. Default to 20 rows, allow 1–100, and sort by employee code then ID for stable results. A page beyond the results returns empty content and pagination totals.
- Match the trimmed department filter case-insensitively. Reject unsupported country, currency, and status filter values. Filters for valid values with zero matches return an empty page.
- Salary bounds are inclusive, non-negative, and may be supplied independently. Validate `minSalary <= maxSalary` when both are present. Either bound requires a supported currency. A currency alone is a valid filter.
- The list includes both statuses unless filtered. Inactive employees remain readable. Edits to inactive employees return `409`. A repeat deactivation with the current version returns the inactive record.
- Use `@Transactional` and `@Version`. Compare the supplied version with the loaded record before an edit or deactivation, then let JPA check it again on write. A stale version or optimistic-lock failure returns `409`. A missing ID returns `404`.
- For top earners, require a supported currency, default the limit to 5, and accept 1–100. Sort by salary descending, then employee code and ID. An empty result is an empty list. A dashboard with no active employees returns a count of zero and empty summary groups.

## Implementation style

Controller: HTTP mapping only. Service: business rules. Repository: database access. DTOs: request/response shape. Exception handler: consistent errors. Query the database for pagination and aggregates; do not pull all 10,000 employees into Java just to calculate reports.
