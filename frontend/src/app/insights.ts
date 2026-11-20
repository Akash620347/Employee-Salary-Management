import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import summaryConfig from '../assets/application/pages/salary-summary.json';
import departmentsConfig from '../assets/application/pages/salary-by-department.json';
import topConfig from '../assets/application/pages/top-earners.json';
import { SalaryApi, SalaryGroup, SalarySummary, TopEarner, apiError, currencies } from './salary-api';

@Component({
  standalone: false,
  selector: 'salary-insights',
  templateUrl: './insights.html',
})
export class InsightsComponent implements OnInit {
  private readonly api = inject(SalaryApi);
  private readonly view = inject(ChangeDetectorRef);
  private topRequest = 0;
  readonly summaryConfig = summaryConfig;
  readonly departmentsConfig = departmentsConfig;
  readonly topConfig = topConfig;
  readonly currencies = currencies;
  currency = 'USD';
  summary: SalarySummary | null = null;
  departments: SalaryGroup[] | null = null;
  topEarners: Array<TopEarner & { fullName: string }> | null = null;
  summaryError = '';
  departmentsError = '';
  topError = '';

  ngOnInit(): void {
    void this.loadSummary();
    void this.loadDepartments();
    void this.loadTop(this.currency);
  }

  async loadSummary(): Promise<void> {
    this.summaryError = '';
    try {
      this.summary = await this.api.summary();
    } catch (error) {
      this.summaryError = apiError(error, 'Salary summaries could not be loaded.').message;
    } finally {
      this.view.markForCheck();
    }
  }

  async loadDepartments(): Promise<void> {
    this.departmentsError = '';
    try {
      this.departments = await this.api.departments();
    } catch (error) {
      this.departmentsError = apiError(error, 'Department summaries could not be loaded.').message;
    } finally {
      this.view.markForCheck();
    }
  }

  async loadTop(currency: string): Promise<void> {
    const request = ++this.topRequest;
    this.currency = currency;
    this.topEarners = null;
    this.topError = '';
    try {
      const employees = await this.api.topEarners(currency);
      if (request === this.topRequest) {
        this.topEarners = employees.map(employee => ({
          ...employee,
          fullName: employee.firstName + ' ' + employee.lastName,
        }));
      }
    } catch (error) {
      if (request === this.topRequest) this.topError = apiError(error, 'Top earners could not be loaded.').message;
    } finally {
      this.view.markForCheck();
    }
  }
}
