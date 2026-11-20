# One-Page Requirements — Employee Salary Management

## Goal and user

Replace Excel-based tracking for an organization with **10,000 employees across several countries**. A **single HR Manager** must manage employee data and answer basic questions about annual pay through a simple web application.

## In scope — functional requirements

1. **Employees:** List, view, add, edit, and **deactivate** employees (no permanent delete). Keep employee code, name, email, department, job title, country, status, annual gross base salary, and local currency.
2. **Salary:** Create and update the employee's **current annual gross base salary only**. Store the amount precisely and display its currency clearly.
3. **Search:** Paginated employee list with case-insensitive name search and department, country, status, and salary-range filters. A salary-range filter must specify a currency to avoid comparing unlike amounts.
4. **Insights:** Display employee count and useful annual-salary summaries: average, minimum, maximum, and total by currency and department; highest-paid employees **within a selected currency**. No conversions between currencies.
5. **Data:** Supply a repeatable script that loads **10,000 realistic-looking dummy employee records** into PostgreSQL.
6. **User:** Design for a single HR Manager persona. No login system, employee accounts, or permission hierarchy in the demo.

## Non-functional requirements

- **Correctness:** Validate required fields, unique employee code/email, positive salary, supported country/currency, and valid filter ranges. Use transactions for updates and return helpful errors.
- **Performance:** Server-side pagination, filtering, and aggregated database queries; keep the interface responsive with 10,000 employees. No large-scale optimization required.
- **Security:** Use only synthetic data, validate input, and keep database credentials out of source code. The open demo is **not suitable for real salary data** without authentication.
- **Quality:** Simple modular code, meaningful fast tests, readable errors, and clear README/setup steps.
- **Implementation:** Use Angular with existing Taomish `common-ui-v2` components and Taomish-style JSON page definitions. Use Java 21, Spring Boot, and PostgreSQL. Give employee and insight services explicit interfaces and return typed DTOs from HTTP endpoints.
- **Delivery:** Working deployed UI + backend + database; short demo video; incremental Git commits; document actual AI usage.

## Explicitly out of scope (and why)

- **Attendance, leave, PF, documents, payroll, tax, bonuses, allowances:** Not part of this salary-management problem.
- **Excel import/export, salary history/audit screens, bulk updates:** Optional enhancements; not needed for the core workflow.
- **Exchange-rate conversions:** Extra complexity and a risk of misleading totals; show breakdowns by stored currency instead.
- **Natural-language AI search, chatbot, elaborate charts/UI:** Not required; clear filters and simple insight tables solve the task.
- **Login/roles, employee portal, complex concurrency/distributed systems:** Single demo HR persona and modest dataset; production HR data would require authentication.

## Acceptance criteria

HR can browse/filter 10,000 employees, add/edit/deactivate a record, update the current annual salary, and see correctly currency-labelled insights. Validation and test cases pass, and the deployed demo is usable.
