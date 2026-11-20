import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormControl, FormRecord, Validators } from '@angular/forms';
import { DialogComponent } from '@taomish-ui/common-ui-v2';
import pageConfig from '../assets/application/pages/employees.json';
import { Employee, EmployeeFields, EmployeePage, SalaryApi, amountPattern, apiError,
  cents, countries, currencies, formatSalary } from './salary-api';

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

  readonly config = pageConfig;
  readonly countries = countries;
  readonly currencies = currencies;
  readonly fields = pageConfig.steps[0].fields;
  readonly formatSalary = formatSalary;
  readonly filters = this.formBuilder.group({
    name: '', department: '', country: '', status: '', currency: '', minSalary: '', maxSalary: '',
  });
  readonly employeeForm = new FormRecord<FormControl<string>>({});
  private appliedFilters = this.filters.getRawValue();
  private listRequest = 0;
  private detailRequest = 0;

  page: EmployeePage | null = null;
  rows: Array<Employee & { fullName: string }> = [];
  loading = false;
  listError = '';
  rangeErrors: Record<string, string> = {};
  notice = '';

  mode: 'new' | 'edit' | 'view' = 'new';
  selected: Employee | null = null;
  pendingDeactivation: Employee | null = null;
  detailsLoading = false;
  saving = false;
  stale = false;
  editorError = '';
  deactivationError = '';
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
    this.loading = true;
    this.listError = '';
    try {
      let page = await this.api.employees(this.appliedFilters, index);
      if (request !== this.listRequest) return;
      const lastPage = Math.max(0, page.totalPages - 1);
      if (index > lastPage) page = await this.api.employees(this.appliedFilters, lastPage);
      if (request !== this.listRequest) return;
      this.page = page;
      this.rows = page.content.map(employee => ({
        ...employee,
        fullName: employee.firstName + ' ' + employee.lastName,
      }));
    } catch (error) {
      if (request !== this.listRequest) return;
      this.listError = apiError(error, 'Employees could not be loaded.').message;
    } finally {
      if (request === this.listRequest) {
        this.loading = false;
        this.view.markForCheck();
      }
    }
  }

  applyFilters(): void {
    this.rangeErrors = {};
    const filters = this.filters.getRawValue();
    const minimum = filters.minSalary.trim();
    const maximum = filters.maxSalary.trim();
    if (minimum && !amountPattern.test(minimum)) this.rangeErrors['minSalary'] = 'Enter a valid amount.';
    if (maximum && !amountPattern.test(maximum)) this.rangeErrors['maxSalary'] = 'Enter a valid amount.';
    if ((minimum || maximum) && !filters.currency) this.rangeErrors['currency'] = 'Choose a currency.';
    if (Object.keys(this.rangeErrors).length) return;
    if (minimum && maximum && cents(maximum) < cents(minimum)) {
      this.rangeErrors['maxSalary'] = 'Maximum must be at least the minimum.';
      return;
    }
    this.appliedFilters = filters;
    void this.load(0);
  }

  clearFilters(): void {
    this.filters.reset();
    this.applyFilters();
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
      this.editorError = apiError(error, 'Employee details could not be loaded.').message;
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
    this.editorError = '';
    this.fieldErrors = {};
    this.employeeForm.markAllAsTouched();
    if (this.employeeForm.invalid) return;
    const fields = this.employeeForm.getRawValue() as Omit<EmployeeFields, 'currencyCode'>;
    const salary = fields.annualGrossBaseSalary.trim();
    if (!amountPattern.test(salary) || cents(salary) <= 0n) {
      this.fieldErrors['annualGrossBaseSalary'] = 'Enter a positive amount with up to two decimal places.';
      return;
    }
    this.saving = true;
    try {
      const created = this.mode === 'new';
      const result = await this.api.save({ ...fields, currencyCode: this.salaryCurrency, annualGrossBaseSalary: salary }, this.selected);
      this.notice = (created ? 'Added ' : 'Saved ') + result.employeeCode + '.';
      this.editor.nativeElement.close();
      void this.load();
    } catch (error) {
      const failure = apiError(error, 'The employee could not be saved.');
      this.editorError = failure.message;
      this.fieldErrors = failure.fieldErrors ?? {};
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

  openDeactivation(employee: Employee): void {
    this.pendingDeactivation = employee;
    this.deactivationError = '';
    this.sharedDialog.showDialog('Deactivate');
    this.confirmation.nativeElement.showModal();
  }

  closeDeactivation(): void {
    this.confirmation.nativeElement.close();
    this.sharedDialog.hideDialog();
    this.pendingDeactivation = null;
  }

  async deactivate(): Promise<void> {
    if (this.saving || !this.pendingDeactivation || this.deactivationError) return;
    const employee = this.pendingDeactivation;
    this.saving = true;
    try {
      await this.api.deactivate(employee);
      this.notice = 'Deactivated ' + employee.employeeCode + '.';
      this.closeDeactivation();
    } catch (error) {
      this.deactivationError = apiError(error, 'Deactivation could not be completed.').message;
    } finally {
      this.saving = false;
      void this.load();
      this.view.markForCheck();
    }
  }

  private clearEditor(): void {
    this.fieldErrors = {};
    this.editorError = '';
    this.stale = false;
    this.detailsLoading = false;
  }
}
