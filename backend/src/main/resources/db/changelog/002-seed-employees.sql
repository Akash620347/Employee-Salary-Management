WITH countries(country_code, currency_code, base_salary, pay_step) AS (
    VALUES ('IN', 'INR', 480000, 1600), ('US', 'USD', 52000, 140),
           ('GB', 'GBP', 34000, 100), ('DE', 'EUR', 40000, 105),
           ('FR', 'EUR', 38000, 105), ('SG', 'SGD', 55000, 135)
),
numbered_countries AS (
    SELECT *, row_number() OVER (ORDER BY country_code) - 1 AS country_index
    FROM countries
),
teams(department, titles) AS (
    VALUES ('Engineering', ARRAY['Software Engineer', 'QA Analyst', 'Tech Lead']),
           ('Finance', ARRAY['Accountant', 'Financial Analyst', 'Finance Manager']),
           ('Operations', ARRAY['Coordinator', 'Operations Analyst', 'Operations Manager']),
           ('People', ARRAY['HR Associate', 'Recruiter', 'HR Manager']),
           ('Sales', ARRAY['Sales Associate', 'Account Executive', 'Sales Manager']),
           ('Support', ARRAY['Support Associate', 'Customer Specialist', 'Support Lead'])
),
numbered_teams AS (
    SELECT *, row_number() OVER (ORDER BY department) - 1 AS team_index
    FROM teams
),
names AS (
    SELECT ARRAY['Aarav','Amelia','Emma','Ethan','Felix','Hannah','Isabel','Jules','Lea','Liam','Lina','Maya',
                 'Noah','Oliver','Priya','Ravi','Sofia','Theo','Wei','Zoe'] AS first_names,
           ARRAY['Adler','Bennett','Chen','Dubois','Evans','Fischer','Garcia','Hughes','Iyer','Khan','Laurent',
                 'Martin','Meyer','Nair','Park','Patel','Reed','Singh','Tan','Wong'] AS last_names
)
INSERT INTO employees (employee_code, first_name, last_name, email, department, job_title,
                       country_code, currency_code, annual_gross_base_salary, status)
SELECT 'DEMO-' || lpad(employee_number::text, 5, '0'),
       first_names[1 + (employee_number * 7 % 20)],
       last_names[1 + ((employee_number / 20 * 3 + employee_number) % 20)],
       'employee-' || employee_number || '@example.invalid',
       department, titles[1 + (employee_number % 3)],
       country_code, currency_code,
       base_salary + (employee_number * 43 % 1000) * pay_step + (employee_number % 100) / 100.0,
       CASE WHEN employee_number % 19 = 0 THEN 'INACTIVE' ELSE 'ACTIVE' END
FROM generate_series(1, 10000) AS employee_number
JOIN numbered_countries ON country_index = employee_number % 6
JOIN numbered_teams ON team_index = (employee_number / 6) % 6
CROSS JOIN names
ON CONFLICT DO NOTHING;
