# Test Plan — Small, Meaningful, Deterministic

## Backend tests (highest priority)

**EmployeeService tests (JUnit 5 + Mockito)**
- Create employee with valid fields; update current salary; deactivate employee.
- Reject duplicate employee code/email; zero/negative salary; invalid country/currency; missing fields.
- Return not found for unknown id; reject changes to inactive employees.
- Salary range: reject `min > max` or range without currency.
- Handle stale version update with a conflict rather than silent overwrite.
- Cover whitespace-only required values, case-insensitive duplicates, mismatched country and currency, overlong strings, and amounts beyond the database precision or scale.
- Verify that changing the country requires the matching currency and an explicit amount. Reject stale deactivation and check repeated deactivation with the current version.

**Repository / API tests**
- Verify literal name search with `%` and `_`, combined filters, one-sided and exact-bound salary ranges, currency-only filters, and stable server pagination with an out-of-range page.
- Check every aggregate against fixed mixed-currency data, including two countries with the same currency, inactive employees, and an empty active population.
- Verify top earners for a supported currency, salary ties, inactive records, invalid limits, and a currency with zero employees.
- Verify a failed update does not partially change a record.
- Consistent `400`, `404`, `409` error responses.

Use small fixed test datasets. Mockito for business logic and Spring test slices for API/persistence. Keep PostgreSQL-only seed logic out of unit tests; test the seed separately against the local PostgreSQL database.

## Frontend tests (focused)

- Render an employee table and form from the Taomish-style JSON with the actual shared components. Verify a clean build can resolve the library and load the page without a Taomish backend.
- Employee list shows records, an empty state, and an API failure. Verify the filter parameters, page resets, and recovery when the last row on a page disappears.
- Add/edit form blocks invalid input, shows server field errors, and preserves the draft when a save conflicts. Check that a pending save disables another submission.
- Deactivation confirmation calls the endpoint only after confirmation.
- Currency labels render correctly on the list and insights pages. Use a large decimal with cents to verify that formatting preserves exact amounts.

## Manual acceptance checklist

- [ ] Seed exactly 10,000 employees and verify repeat run is safe.
- [ ] List, search, filter, and paginate employees.
- [ ] Add employee; edit salary; deactivate; verify state remains correct after refresh.
- [ ] Verify invalid values show useful errors and do not modify stored data.
- [ ] Compare insights with known sample queries; ensure no cross-currency totals.
- [ ] Confirm layout works on a laptop and loading/error states are visible.
- [ ] Run all tests; verify deployed demo uses only fake data.

## Quality rule

Tests should make business behavior obvious; avoid brittle snapshots, huge mocks, and tests that depend on execution order or random input.
