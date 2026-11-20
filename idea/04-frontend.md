# Frontend Plan — Angular

Use Angular and TypeScript with the existing Taomish `common-ui-v2` components from `C:\Taomish-repo\taomish-ui\libs\common-ui-v2`. Keep two routes, `/employees` and `/insights`. Use the shared styles, readable tables, and clear form labels for a professional HR screen that fits a laptop.

## Taomish page rendering

- Put configuration in `assets/application/pages/`. Follow the existing `Page` shape: `title`, `store`, `tableList` for columns, `steps[].fields` for form fields, and `lists` for fixed choices. Use `employees.json` for the employee list and form. The insights route combines the table configurations from `salary-summary.json`, `salary-by-department.json`, and `top-earners.json`.
- Use `tui-table` for configured columns, `tui-form` for employee fields, `tui-dialog` for deactivation, and the shared loader and badges. Verify the existing table's custom cells and action slots with a salary row before writing the full page. Keep keyboard access, focus restoration, and accessible dialog labels in the integration check.
- Keep filters, server pagination, validation, and save/deactivate actions in the Angular pages and a small typed API service. Load static metadata with Angular `HttpClient` because Taomish `JsonService` also requests a label dictionary from the Taomish backend. Pass the current API page to the table and disable its built-in pagination so the server owns page boundaries.

This excerpt uses the same column and field keys as the Taomish application pages.

```json
{
  "title": "Employees",
  "store": "employees",
  "tableList": [
    { "name": "employeeCode", "label": "Employee code" },
    { "name": "annualGrossBaseSalary", "label": "Annual gross base salary" }
  ],
  "steps": [
    {
      "stepName": "employee",
      "label": "Employee details",
      "index": 0,
      "status": true,
      "fields": [
        {
          "name": "employeeCode",
          "type": "input",
          "inputType": "text",
          "label": "Employee code",
          "validation": { "required": true, "maxLength": 20 }
        },
        {
          "name": "annualGrossBaseSalary",
          "type": "input",
          "inputType": "text",
          "label": "Annual gross base salary",
          "validation": { "required": true }
        }
      ]
    }
  ]
}
```

## Employees

- Show employee code, name, department, country, currency, annual gross base salary, status, and available actions. A read-only detail view includes email and job title. Reuse one form for creation and editing. Set the salary currency from the country and require confirmation of the amount in the new currency when the country changes.
- Provide name, department, country, status, currency, minimum salary, and maximum salary filters. Show a currency error before applying a salary range without one. Reset to the first page when filters change or clear. Use the latest request when filters change quickly. If a save or deactivation empties the current page, load the preceding available page.
- Confirm deactivation with the employee's name. Keep inactive records visible with a status badge and a View action. Preserve filters after changes. Show loading, error, empty, and success feedback, and disable the action while a mutation is pending.
- Put API field errors beside the matching controls and preserve entered values on failure. For a stale version, show a reload action so the HR manager can review the latest record before saving again.

## Salary insights

- Show the active employee count, then count, average, minimum, maximum, and total in summary tables by currency and by department with currency.
- Show top earners for the selected currency. Label every result as annual gross base salary and display the ISO currency code with the amount. Keep the API's decimal values as strings through formatting to preserve cents, including large totals.
- Show an empty state when the selected currency has zero active employees. Keep load or API failure feedback visible for the affected section.

## Shared library build

The local Taomish checkout resolves `@taomish-ui/common-ui-v2` through its Nx TypeScript paths. The library is a workspace source project. Its module registers router and HTTP providers, and the dynamic form uses Taomish's `Environment` and `WebFunctionProvider`. Verify one JSON-driven salary page in an Angular workspace with approved access to the library and its dependencies. Use a versioned source or package dependency that the deployment build can resolve from a clean checkout. The local Windows path identifies the reference checkout.
