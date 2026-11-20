import { Component, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { RouterModule } from '@angular/router';
import { CommonUiModule, DefaultStoreService, Environment, RoleAuthorizationService,
  StoreService } from '@taomish-ui/common-ui-v2';
import { ConfiguredTable } from './app/configured-table';
import { EmployeesComponent } from './app/employees';
import { InsightsComponent } from './app/insights';

@Component({
  standalone: false,
  selector: 'salary-app',
  template: `
    <header class="app-header">
      <div class="header-inner">
        <a class="app-name" routerLink="/employees">Salary Management</a>
        <nav aria-label="Main navigation">
          <a routerLink="/employees" routerLinkActive="selected" ariaCurrentWhenActive="page">Employees</a>
          <a routerLink="/insights" routerLinkActive="selected" ariaCurrentWhenActive="page">Salary insights</a>
        </nav>
      </div>
    </header>
    <main><router-outlet></router-outlet></main>
  `,
})
export class AppComponent {}

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
