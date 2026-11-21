import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { Page, TableComponent, TableEntity } from '@taomish-ui/common-ui-v2';
import { Employee, formatSalary } from './salary-api';

@Component({
  standalone: false,
  selector: 'salary-table',
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
              <span>{{ row.employeeCode }}</span>
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
              @if (row.status === 'ACTIVE') {
                <button type="button" class="row-edit" (click)="editEmployee.emit(row)"
                        [attr.aria-label]="'Edit ' + row.fullName">Edit</button>
                <button type="button" class="text-button danger-text" (click)="deactivateEmployee.emit(row)"
                        [attr.aria-label]="'Deactivate ' + row.fullName">Deactivate</button>
              }
              @else { <span class="quiet">View only</span> }
            </div>
          }
        }
      </ng-template>
    </tui-table>
  `,
})
export class ConfiguredTable implements OnInit, OnChanges {
  @Input({ required: true }) config!: { title: string; store: string; tableList: TableEntity[] };
  @Input({ required: true }) rows!: object[];
  @Output() readonly viewEmployee = new EventEmitter<Employee>();
  @Output() readonly editEmployee = new EventEmitter<Employee>();
  @Output() readonly deactivateEmployee = new EventEmitter<Employee>();
  @ViewChild(TableComponent, { static: true }) private table!: TableComponent;
  readonly formatSalary = formatSalary;

  ngOnInit(): void {
    this.render();
  }

  ngOnChanges(): void {
    if (this.table) this.render();
  }

  private render(): void {
    const columns = this.config.tableList.map(column => ({ ...column, isResizable: false }));
    // Angular renders the page returned by the API in the library's local table mode.
    this.table.page = { ...this.config, isViewPagination: false, tableHeight: 'auto' } as Page;
    this.table.fontSize = 13;
    this.table.showRegularTable(columns, this.rows, false);
    this.table.setLoaderStatus(true);
  }
}
