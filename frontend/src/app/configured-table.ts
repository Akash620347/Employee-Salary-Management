import { HttpBackend, HttpClient } from '@angular/common/http';
import { Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, ViewChild, inject } from '@angular/core';
import { ApiService, Environment, Page, SearchCriteria, TableComponent, TableEntity } from '@taomish-ui/common-ui-v2';
import { Employee, formatSalary } from './salary-api';

@Component({
  standalone: false,
  selector: 'salary-table',
  providers: [{
    provide: ApiService,
    // The shared column popup uses the same local API as the salary pages.
    useFactory: () => new ApiService(new HttpClient(inject(HttpBackend)), inject(Environment)),
  }],
  template: `
    <tui-table>
      <ng-template let-pipe="pipe" let-value="value" let-row="rowData" let-rowIndex="rowIndex">
        @switch (pipe) {
          @case ('salary') { <span class="money">{{ formatSalary(value, row.currencyCode) }}</span> }
          @case ('salaryAmount') { <span class="money">{{ formatSalary(value, row.currencyCode, false) }}</span> }
          @case ('employeeIdentity') {
            <button type="button" class="employee-identity" (click)="viewEmployee.emit(row)"
                    [attr.aria-label]="'View ' + row.fullName + ', ' + row.employeeCode">
              <strong>{{ value }}</strong>
            </button>
          }
          @case ('earnerIdentity') {
            <div class="earner-identity">
              <span class="rank" [attr.aria-label]="'Rank ' + (rowIndex + 1)">{{ rowIndex + 1 }}</span>
              <span><strong>{{ value }}</strong><span>{{ row.department }}</span></span>
            </div>
          }
          @case ('headcount') {
            <div class="headcount">
              <strong>{{ value | number }}</strong>
              <div class="headcount-bar" aria-hidden="true"><i [style.width.%]="row.employeeShare"></i></div>
            </div>
          }
          @case ('status') {
            <tui-badges [cssClass]="value === 'ACTIVE' ? 'active' : 'inactive'"
                        [viewText]="value === 'ACTIVE' ? 'Active' : 'Inactive'"></tui-badges>
          }
          @case ('actions') {
            <div class="row-actions">
              @if (selectedEmployeeIds) {
                <input type="checkbox" class="employee-selection" [checked]="selectedEmployeeIds.has(row.id)"
                       [disabled]="selectionDisabled" [attr.aria-label]="'Select ' + row.fullName + ', ' + row.employeeCode"
                       (change)="toggleEmployeeSelection.emit(row.id)">
              }
              @if (row.status === 'ACTIVE') {
                <button type="button" class="row-action" title="Edit employee" (click)="editEmployee.emit(row)"
                        [attr.aria-label]="'Edit ' + row.fullName">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
                       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <path d="m15 5 4 4M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"/>
                  </svg>
                </button>
                <button type="button" class="row-action" title="Deactivate employee"
                        (click)="changeEmployeeStatus.emit(row)" [attr.aria-label]="'Deactivate ' + row.fullName">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
                       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M10 9v6m4-6v6"/>
                  </svg>
                </button>
              }
              @else {
                <button type="button" class="row-reactivate" (click)="changeEmployeeStatus.emit(row)"
                        [attr.aria-label]="'Reactivate ' + row.fullName">Reactivate</button>
              }
              <button type="button" class="row-action row-action-danger" title="Permanently delete employee"
                      (click)="deleteEmployee.emit(row)" [attr.aria-label]="'Permanently delete ' + row.fullName">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                  <path d="M3 6h18M9 6V3h6v3M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7m4-7v7"/>
                </svg>
              </button>
            </div>
          }
        }
      </ng-template>
    </tui-table>
  `,
})
export class ConfiguredTable implements OnInit, OnChanges {
  @Input({ required: true }) config!: Pick<Page, 'title' | 'store' | 'getAllDataInColumnFilterApi'> & { tableList: TableEntity[] };
  @Input({ required: true }) rows!: object[];
  @Input() selectedEmployeeIds?: ReadonlySet<number>;
  @Input() selectionDisabled = false;
  @Output() readonly viewEmployee = new EventEmitter<Employee>();
  @Output() readonly editEmployee = new EventEmitter<Employee>();
  @Output() readonly changeEmployeeStatus = new EventEmitter<Employee>();
  @Output() readonly deleteEmployee = new EventEmitter<Employee>();
  @Output() readonly toggleEmployeeSelection = new EventEmitter<number>();
  @Output() readonly columnFilters = new EventEmitter<SearchCriteria[]>();
  @ViewChild(TableComponent, { static: true }) private table!: TableComponent;
  readonly formatSalary = formatSalary;

  ngOnInit(): void {
    if (this.config.tableList.some(column => column.columnFilter)) {
      const filters = this.table.getColumnFilterService();
      // Keep directory filters in the current view instead of restoring the shared grid's stored criteria.
      filters.removeFromClumnFilter();
      filters.clearAdvanceFilter();
      filters.makeQueryParam = () => {};
      let applied: SearchCriteria[] = [];
      filters.processors['salaryDirectory'] = (_url: string, criteria: SearchCriteria[]) => {
        this.columnFilters.emit(criteria);
        applied = structuredClone(filters.getList().filter(filter => filter.fieldName !== 'tenantId' &&
          (!Array.isArray(filter.value) || filter.value.length > 0)));
        this.table.setLoaderStatus(true);
      };
      // The shared popup stages selections in the filter service before Apply.
      const discardDraft = () => {
        filters.removeFromClumnFilter();
        for (const filter of structuredClone(applied)) {
          filters.addOtherCriteriaFilter(filter.fieldName, filter.value, filter.condition, filter.secondValue);
        }
      };
      const closeFilter = this.table.columnFilterResponse.bind(this.table);
      this.table.columnFilterResponse = (event, index) => {
        closeFilter(event, index);
        discardDraft();
      };
      const toggleFilter = this.table.toggle.bind(this.table);
      this.table.toggle = (trigger, column, index) => {
        if (column.columnFilter) discardDraft();
        toggleFilter(trigger, column, index);
      };
    }
    this.render();
  }

  ngOnChanges(): void {
    if (this.table) this.render();
  }

  @HostListener('document:click', ['$event'])
  closeFilterOnOutsideClick(event: MouseEvent): void {
    const trigger = this.table.overlayObj.triggerOrigin?.elementRef.nativeElement;
    if (this.table.isOpen && event.target instanceof Element &&
        !trigger?.contains(event.target) && !event.target.closest('tui-column-filter')) {
      this.table.columnFilterResponse(event, this.table.overlayObj.i);
    }
  }

  clearColumnFilters(): void {
    this.table.getColumnFilterService().clearFilter();
  }

  clearColumnFilter(column: string): void {
    this.table.getColumnFilterService().clearSingleFilter(column, false);
  }

  private render(): void {
    const columns = this.config.tableList.map(column => ({ ...column, isResizable: false }));
    const page = { ...this.config, isViewPagination: false, tableHeight: 'auto',
      columnFilterBy: columns.some(column => column.columnFilter) ? 'salaryDirectory' : undefined } as Page;
    this.table.page = page;
    this.table.getColumnFilterService().setPage(page);
    this.table.fontSize = 13;
    this.table.showRegularTable(columns, this.rows, false);
    this.table.setLoaderStatus(true);
  }
}
