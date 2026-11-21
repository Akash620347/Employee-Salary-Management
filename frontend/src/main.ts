import { Component, DestroyRef, ElementRef, NgModule, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { RouterModule } from '@angular/router';
import { CommonUiModule, DefaultStoreService, Environment, RoleAuthorizationService,
  StoreService, ToastService } from '@taomish-ui/common-ui-v2';
import { ConfiguredTable } from './app/configured-table';
import { EmployeesComponent } from './app/employees';
import { InsightsComponent } from './app/insights';

@Component({
  standalone: false,
  selector: 'salary-app',
  template: `
    <div class="app-shell">
      <a class="skip-link" href="#main-content">Skip to content</a>
      <aside class="app-sidebar">
        <a class="app-name" routerLink="/employees">
          <span class="brand-mark" aria-hidden="true"></span>
          <span>Salary Management</span>
        </a>
        <nav aria-label="Main navigation">
          <a routerLink="/employees" routerLinkActive="selected" ariaCurrentWhenActive="page">
            <span class="nav-icon people-icon" aria-hidden="true"></span>Employees
          </a>
          <a routerLink="/insights" routerLinkActive="selected" ariaCurrentWhenActive="page">
            <span class="nav-icon bars-icon" aria-hidden="true"></span>Salary insights
          </a>
        </nav>
        <p class="workspace-status">Synthetic employee data</p>
      </aside>
      <main id="main-content" tabindex="-1"><router-outlet></router-outlet></main>
    </div>
    <tui-toast #notifications popover="manual" aria-live="polite" width="min(23rem, calc(100vw - 40px))"></tui-toast>
  `,
})
export class AppComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('notifications', { read: ElementRef, static: true }) private notifications!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    ToastService.registerType('success', 'assets/icon/tick-in-square-box.svg', '#08756c');
    ToastService.registerType('warn', 'assets/icon/alert.svg', '#d29425');
    ToastService.registerType('error', 'assets/icon/crossIcon.svg', '#a3313c');
    ToastService.getUpdater().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      // Bring notifications above any open native modal dialog.
      const host = this.notifications.nativeElement;
      if (host.matches(':popover-open')) host.hidePopover();
      host.showPopover();
    });
  }
}

@NgModule({
  imports: [
    BrowserModule,
    CommonUiModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot([
      { path: 'employees', component: EmployeesComponent, title: 'Employees · Salary Management' },
      { path: 'insights', component: InsightsComponent, title: 'Salary Insights · Salary Management' },
      { path: '', redirectTo: 'employees', pathMatch: 'full' },
      { path: '**', redirectTo: 'employees' },
    ]),
  ],
  declarations: [AppComponent, ConfiguredTable, EmployeesComponent, InsightsComponent],
  providers: [
    { provide: Environment, useValue: { apiEndpoint: '', bmContextPath: '', baseUrl: '/', projectName: 'Salary Management' } },
    { provide: Map, useValue: new Map() },
    { provide: StoreService, useClass: DefaultStoreService },
    // The demo owns its row actions. Disable the shared grid's role-gated tools.
    { provide: RoleAuthorizationService, useValue: {
      canAccessByRoute: () => false, canAccessWithCurrentRoute: () => false,
    } },
    { provide: 'WebFunctionProvider', useValue: {} },
  ],
  bootstrap: [AppComponent],
})
class AppModule {}

platformBrowserDynamic().bootstrapModule(AppModule).catch(console.error);
