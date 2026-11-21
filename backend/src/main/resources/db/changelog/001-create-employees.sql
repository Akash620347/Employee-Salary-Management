CREATE TABLE employees (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_code VARCHAR(20) NOT NULL CONSTRAINT employee_code_unique UNIQUE,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(255) NOT NULL CONSTRAINT employee_email_unique UNIQUE,
    department VARCHAR(100) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    annual_gross_base_salary NUMERIC(18,2) NOT NULL CHECK (annual_gross_base_salary > 0 AND annual_gross_base_salary <> 'NaN'::numeric),
    status VARCHAR(8) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (employee_code <> '' AND employee_code = upper(trim(employee_code))),
    CHECK (email <> '' AND email = lower(trim(email))),
    CHECK ((country_code, currency_code) IN (
        ('IN', 'INR'), ('US', 'USD'), ('GB', 'GBP'), ('DE', 'EUR'), ('FR', 'EUR'), ('SG', 'SGD')
    ))
);

CREATE INDEX employee_country_idx ON employees (country_code);
CREATE INDEX employee_currency_salary_idx ON employees (currency_code, annual_gross_base_salary DESC);
CREATE INDEX employee_department_idx ON employees (lower(department));
