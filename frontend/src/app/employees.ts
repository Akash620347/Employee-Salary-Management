import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormControl, FormRecord, Validators } from '@angular/forms';
import { DialogComponent, SearchCriteria, ToastService } from '@taomish-ui/common-ui-v2';
import pageConfig from '../assets/application/pages/employees.json';
import { ConfiguredTable } from './configured-table';
import { Employee, EmployeeFields, EmployeePage, SalaryApi, amountPattern, apiError,
  cents, countries, currencies, formatSalary } from './salary-api';

type EmployeeAction = 'Reactivate' | 'Deactivate' | 'Permanently delete';
type EmployeeConfirmation = { employee: Employee; action: EmployeeAction }
  | { employees: Employee[]; action: 'Delete selected' };

@Component({
  standalone: false,
  selector: 'salary-employees',
  templateUrl: './employees.html',
})
export class EmployeesComponent implements OnInit {
  private readonly api = inject(SalaryApi);
  private readonly view = inject(ChangeDetectorRef);
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  @ViewChild('editor', { static: true }) private editor!: ElementRef<HTMLDialogElement>;
  @ViewChild('confirmation', { static: true }) private confirmation!: ElementRef<HTMLDialogElement>;
  @ViewChild(DialogComponent, { static: true }) private sharedDialog!: DialogComponent;
  @ViewChild(ConfiguredTable, { static: true }) table!: ConfiguredTable;

  private readonly filterOptions: Record<string, { value: string; label: string }[]> = {
    countryCode: countries,
    currencyCode: currencies.map(code => ({ value: code, label: code })),
    status: [{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }],
  };
  readonly config = {
    ...pageConfig,
    tableList: pageConfig.tableList.map(column => ({ ...column, fixedValueOptions: this.filterOptions[column.name] })),
  };
  readonly countries = countries;
  readonly fields = pageConfig.steps[0].fields;
  readonly formatSalary = formatSalary;
  readonly employeeForm = new FormRecord<FormControl<string>>({});
  private appliedFilters: Record<string, string> = {};
  private appliedSelections: Record<string, string[]> = {};
  private listRequest = 0;
  private detailRequest = 0;

  page: EmployeePage | null = null;
  rows: Array<Employee & { fullName: string }> = [];
  readonly selectedEmployeeIds = new Set<number>();
  loading = false;
  listFailed = false;

  mode: 'new' | 'edit' | 'view' = 'new';
  selected: Employee | null = null;
  pendingConfirmation: EmployeeConfirmation | null = null;
  detailsLoading = false;
  saving = false;
  stale = false;
  confirmationFailed = false;
  fieldErrors: Record<string, string> = {};

  ngOnInit(): void {
    for (const field of this.fields) {
      const validators = [Validators.required, Validators.pattern(/\S/)];
      if (field.validation.maxLength) validators.push(Validators.maxLength(field.validation.maxLength));
      if (field.name === 'email') validators.push(Validators.email);
      this.employeeForm.addControl(field.name, this.formBuilder.control('', validators));
    }
    void this.load();
  }

  async load(index = this.page?.page ?? 0): Promise<void> {
    const request = ++this.listRequest;
    this.selectedEmployeeIds.clear();
    this.loading = true;
    this.listFailed = false;
    try {
      let page = await this.api.employees(this.appliedFilters, this.appliedSelections, index);
      if (request !== this.listRequest) return;
      const lastPage = Math.max(0, page.totalPages - 1);
      if (index > lastPage) page = await this.api.employees(this.appliedFilters, this.appliedSelections, lastPage);
      if (request !== this.listRequest) return;
      this.page = page;
      this.rows = page.content.map(employee => ({
        ...employee,
        fullName: employee.firstName + ' ' + employee.lastName,
      }));
    } catch (error) {
      if (request !== this.listRequest) return;
      this.listFailed = true;
      ToastService.addErrorMessage('Employees', apiError(error, 'Employees could not be loaded.').message);
    } finally {
      if (request === this.listRequest) {
        this.loading = false;
        this.view.markForCheck();
      }
    }
  }

  applyFilters(criteria: SearchCriteria[]): void {
    const values = new Map(criteria.map(filter => [filter.fieldName, filter]));
    const filters: Record<string, string> = {};
    const selections: Record<string, string[]> = {};
    const queryNames = { fullName: 'name', employeeCode: 'employeeCode', email: 'email', department: 'department',
      jobTitle: 'jobTitle', countryCode: 'country', currencyCode: 'currency', status: 'status' };
    for (const [column, parameter] of Object.entries(queryNames)) {
      const value = values.get(column)?.value;
      if (typeof value === 'string' && value) filters[parameter] = value;
      if (Array.isArray(value) && value.length) selections[column] = [...value];
    }
    const range = values.get('annualGrossBaseSalary');
    if (range && !filters['currency']) {
      this.table.clearColumnFilter(range.fieldName);
      ToastService.addWarningMessage('Salary filter', 'Choose a currency before applying a salary range.');
    } else if (range) {
      filters['minSalary'] = String(range.value);
      filters['maxSalary'] = String(range.secondValue);
    }
    this.appliedFilters = filters;
    this.appliedSelections = selections;
    void this.load(0);
  }

  get hasFilters(): boolean {
    return Object.keys(this.appliedFilters).length > 0 || Object.keys(this.appliedSelections).length > 0;
  }

  goToPage(input: HTMLInputElement): void {
    if (this.loading || !this.page) return;
    const number = input.valueAsNumber;
    if (!Number.isInteger(number) || number < 1 || number > this.page.totalPages) {
      ToastService.addWarningMessage('Go to page', `Enter a whole page number from 1 to ${this.page.totalPages}.`);
      input.select();
      return;
    }
    if (number !== this.page.page + 1) void this.load(number - 1);
  }

  openNew(): void {
    this.clearEditor();
    this.mode = 'new';
    this.selected = null;
    this.employeeForm.reset();
    this.editor.nativeElement.showModal();
  }

  async openEmployee(employee: Employee, mode: 'view' | 'edit'): Promise<void> {
    this.clearEditor();
    this.mode = mode;
    this.selected = employee;
    if (!this.editor.nativeElement.open) this.editor.nativeElement.showModal();
    const request = ++this.detailRequest;
    this.detailsLoading = true;
    try {
      const latest = await this.api.employee(employee.id);
      if (request !== this.detailRequest) return;
      this.selected = latest;
      if (latest.status === 'INACTIVE') this.mode = 'view';
      this.employeeForm.reset(Object.fromEntries(this.fields.map(field => [
        field.name, latest[field.name as keyof EmployeeFields],
      ])));
    } catch (error) {
      if (request !== this.detailRequest) return;
      ToastService.addErrorMessage('Employee details', apiError(error, 'Employee details could not be loaded.').message);
      this.stale = true;
    } finally {
      if (request === this.detailRequest) {
        this.detailsLoading = false;
        this.view.markForCheck();
      }
    }
  }

  get salaryCurrency(): string {
    return countries.find(country => country.value === this.employeeForm.controls['countryCode']?.value)?.currencyCode ?? '';
  }

  countryChanged(): void {
    if (this.selected) this.employeeForm.controls['annualGrossBaseSalary'].reset('');
    delete this.fieldErrors['countryCode'];
    delete this.fieldErrors['currencyCode'];
  }

  fieldError(name: string): string {
    if (this.fieldErrors[name]) return this.fieldErrors[name];
    const field = this.employeeForm.controls[name];
    if (!field.touched || !field.errors) return '';
    if (field.hasError('required') || field.hasError('pattern')) return 'This field is required.';
    if (field.hasError('email')) return 'Enter a valid email address.';
    if (field.hasError('maxlength')) return 'Keep this to ' + field.errors['maxlength'].requiredLength + ' characters.';
    return 'Enter a valid value.';
  }

  async save(): Promise<void> {
    if (this.saving || this.detailsLoading || this.stale) return;
    this.fieldErrors = {};
    this.employeeForm.markAllAsTouched();
    const invalidField = this.fields.find(field => this.employeeForm.controls[field.name].invalid);
    if (invalidField) {
      ToastService.addWarningMessage(invalidField.label, this.fieldError(invalidField.name));
      return;
    }
    const fields = this.employeeForm.getRawValue() as Omit<EmployeeFields, 'currencyCode'>;
    const salary = fields.annualGrossBaseSalary.trim();
    if (!amountPattern.test(salary) || cents(salary) <= 0n) {
      this.fieldErrors['annualGrossBaseSalary'] = 'Enter a positive amount with up to two decimal places.';
      ToastService.addWarningMessage('Annual gross base salary', this.fieldErrors['annualGrossBaseSalary']);
      return;
    }
    this.saving = true;
    try {
      const created = this.mode === 'new';
      const result = await this.api.save({ ...fields, currencyCode: this.salaryCurrency, annualGrossBaseSalary: salary }, this.selected);
      this.editor.nativeElement.close();
      ToastService.addSuccessMessage('Employee', (created ? 'Added ' : 'Saved ') + result.employeeCode + '.');
      void this.load();
    } catch (error) {
      const failure = apiError(error, 'The employee could not be saved.');
      this.fieldErrors = failure.fieldErrors ?? {};
      ToastService.addErrorMessage(failure.message, Object.values(this.fieldErrors).join(' '));
      this.stale = this.selected != null && error instanceof HttpErrorResponse &&
        (error.status === 404 || (error.status === 409 && !Object.keys(this.fieldErrors).length));
    } finally {
      this.saving = false;
      this.view.markForCheck();
    }
  }

  closeEditor(): void {
    if (this.saving) return;
    this.detailRequest++;
    this.editor.nativeElement.close();
  }

  openConfirmation(employee: Employee, action: EmployeeAction = employee.status === 'INACTIVE' ? 'Reactivate' : 'Deactivate'): void {
    this.showConfirmation({ employee, action });
  }

  toggleEmployeeSelection(id: number): void {
    if (this.loading || this.saving) return;
    if (this.selectedEmployeeIds.has(id)) this.selectedEmployeeIds.delete(id);
    else this.selectedEmployeeIds.add(id);
  }

  openBulkDelete(): void {
    if (this.loading || !this.selectedEmployeeIds.size) return;
    const employees = this.rows.filter(employee => this.selectedEmployeeIds.has(employee.id));
    this.showConfirmation({ employees, action: 'Delete selected' });
  }

  get confirmationTitle(): string {
    const action = this.pendingConfirmation?.action;
    if (!action) return '';
    return action === 'Delete selected' ? 'Permanently delete selected employees' : `${action} employee`;
  }

  private showConfirmation(pending: EmployeeConfirmation): void {
    if (this.saving) return;
    this.pendingConfirmation = pending;
    this.confirmationFailed = false;
    this.sharedDialog.showDialog(pending.action);
    this.confirmation.nativeElement.showModal();
  }

  closeConfirmation(): void {
    this.confirmation.nativeElement.close();
    this.sharedDialog.hideDialog();
    this.pendingConfirmation = null;
  }

  async confirmEmployeeAction(): Promise<void> {
    if (this.saving || !this.pendingConfirmation || this.confirmationFailed) return;
    const pending = this.pendingConfirmation;
    const title = this.confirmationTitle;
    this.saving = true;
    try {
      let message: string;
      if (pending.action === 'Delete selected') {
        await this.api.deleteEmployees(pending.employees);
        const count = pending.employees.length;
        message = `Permanently deleted ${count} ${count === 1 ? 'employee' : 'employees'}.`;
      } else {
        const { employee, action } = pending;
        if (action === 'Permanently delete') await this.api.deleteEmployee(employee);
        else await this.api.changeStatus(employee, action === 'Reactivate' ? 'reactivate' : 'deactivate');
        message = `${action}d ${employee.employeeCode}.`;
      }
      this.closeConfirmation();
      ToastService.addSuccessMessage('Employees', message);
    } catch (error) {
      this.confirmationFailed = true;
      ToastService.addErrorMessage(title, apiError(error, 'The employee records could not be updated.').message);
    } finally {
      this.saving = false;
      void this.load();
      this.view.markForCheck();
    }
  }

  private clearEditor(): void {
    this.fieldErrors = {};
    this.stale = false;
    this.detailsLoading = false;
  }
}
