import { HttpBackend, HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import employeesPage from '../assets/application/pages/employees.json';

export interface EmployeeFields {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  jobTitle: string;
  countryCode: string;
  currencyCode: string;
  annualGrossBaseSalary: string;
}

export interface Employee extends EmployeeFields {
  id: number;
  status: 'ACTIVE' | 'INACTIVE';
  version: number;
}

export interface EmployeePage {
  content: Employee[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SalaryGroup {
  department: string | null;
  currencyCode: string;
  employeeCount: number;
  average: string;
  minimum: string;
  maximum: string;
  total: string;
}

export interface SalarySummary {
  activeEmployeeCount: number;
  byCurrency: SalaryGroup[];
}

export type TopEarner = Pick<Employee, 'id' | 'employeeCode' | 'firstName' | 'lastName'
  | 'department' | 'currencyCode' | 'annualGrossBaseSalary'>;

export interface ApiError {
  message: string;
  fieldErrors?: Record<string, string>;
}

export const countries = employeesPage.lists.countryCode;
export const currencies = [...new Set(countries.map(country => country.currencyCode))].sort();
export const amountPattern = /^[0-9]{1,16}(\.[0-9]{1,2})?$/;

export function cents(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function formatSalary(amount: string, currency: string, showCurrency = true): string {
  return new Intl.NumberFormat('en', {
    style: showCurrency ? 'currency' : 'decimal',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount as Intl.StringNumericLiteral);
}

export function apiError(error: unknown, fallback: string): ApiError {
  if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
    return error.error;
  }
  return { message: fallback };
}

@Injectable({ providedIn: 'root' })
export class SalaryApi {
  // Salary endpoints use same-origin HTTP and do not require Taomish's authentication interceptors.
  private readonly http = new HttpClient(inject(HttpBackend));

  employees(filters: Record<string, string>, page: number): Promise<EmployeePage> {
    const query: Record<string, string> = { page: String(page) };
    for (const [field, value] of Object.entries(filters)) {
      if (value.trim()) query[field] = value.trim();
    }
    const params = new HttpParams({ fromObject: query });
    return firstValueFrom(this.http.get<EmployeePage>('/api/employees', { params }));
  }

  employee(id: number): Promise<Employee> {
    return firstValueFrom(this.http.get<Employee>('/api/employees/' + id));
  }

  save(fields: EmployeeFields, employee: Employee | null): Promise<Employee> {
    if (employee) {
      return firstValueFrom(this.http.put<Employee>('/api/employees/' + employee.id,
        { ...fields, version: employee.version }));
    }
    return firstValueFrom(this.http.post<Employee>('/api/employees', fields));
  }

  deactivate(employee: Employee): Promise<Employee> {
    return firstValueFrom(this.http.patch<Employee>('/api/employees/' + employee.id + '/deactivate',
      { version: employee.version }));
  }

  summary(): Promise<SalarySummary> {
    return firstValueFrom(this.http.get<SalarySummary>('/api/insights/summary'));
  }

  departments(): Promise<SalaryGroup[]> {
    return firstValueFrom(this.http.get<SalaryGroup[]>('/api/insights/departments'));
  }

  topEarners(currency: string): Promise<TopEarner[]> {
    return firstValueFrom(this.http.get<TopEarner[]>('/api/insights/top-earners', { params: { currency } }));
  }
}
