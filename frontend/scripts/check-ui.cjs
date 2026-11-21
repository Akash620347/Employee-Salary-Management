const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const CDP = require('chrome-remote-interface');

const artifacts = resolve(__dirname, '../../.local');
mkdirSync(artifacts, { recursive: true });
const appUrl = process.env.DEMO_UI_URL ?? 'http://127.0.0.1:4200';
const port = 49222;
const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--disable-background-networking', '--no-first-run',
  '--no-default-browser-check', '--disable-extensions', '--remote-debugging-port=' + port,
  '--user-data-dir=' + resolve(artifacts, 'ui-browser'), 'about:blank',
], { windowsHide: true, stdio: 'ignore' });

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, message) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const result = await check();
      if (result) return result;
    } catch {}
    await pause(250);
  }
  throw new Error(message);
}

async function run() {
  const client = await until(() => CDP({ port }), 'Chrome was not available');
  const exceptions = [];
  const networkRequests = [];
  const bulkFixtures = [];
  try {
    const { Page, Runtime, Emulation, Network } = client;
    Network.requestWillBeSent(({ request }) => {
      if (request.url.includes('/api/')) networkRequests.push('request ' + request.url);
    });
    Network.responseReceived(({ response }) => {
      if (response.url.includes('/api/')) networkRequests.push(response.status + ' ' + response.url);
    });
    Runtime.exceptionThrown(({ exceptionDetails }) => {
      exceptions.push(exceptionDetails.exception?.description || exceptionDetails.text);
    });
    Runtime.consoleAPICalled(message => {
      if (message.type === 'error') exceptions.push(...message.args.map(arg => arg.description || arg.value));
    });
    async function evaluate(fn, ...args) {
      const expression = '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')';
      const response = await Runtime.evaluate({ expression, returnByValue: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception.description);
      return response.result.value;
    }
    const query = selector => evaluate(s => Boolean(document.querySelector(s)), selector);
    const waitFor = selector => until(() => query(selector), 'Missing UI element: ' + selector);
    const getText = selector => evaluate(s => document.querySelector(s)?.innerText, selector);
    const textContains = (selector, text) => until(async () => (await getText(selector))?.includes(text),
      'Expected ' + selector + ' to contain ' + text);
    const click = selector => evaluate(s => document.querySelector(s).click(), selector);
    const fill = (selector, value) => evaluate((s, value) => {
      const element = document.querySelector(s);
      element.value = value;
      element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      element.dispatchEvent(new Event('blur'));
    }, selector, value);
    const openColumnFilter = async (label) => {
      await evaluate(label => {
        const header = Array.from(document.querySelectorAll('salary-table th')).find(cell => cell.textContent.trim() === label);
        header.querySelector('.filter-icon').click();
      }, label);
      await waitFor('tui-column-filter .filter-tool');
    };
    const applyColumnFilter = () => click('tui-column-filter .filter-tool > :first-child');
    const selectColumnValue = async value => {
      await fill('tui-column-filter .filter-search input', value);
      await until(() => evaluate(value => {
        const option = Array.from(document.querySelectorAll('tui-column-filter .filter-result'))
          .find(option => option.innerText.trim() === value);
        if (!option) return false;
        option.querySelector('input').click();
        return true;
      }, value), 'Missing filter option: ' + value);
    };
    const searchColumn = async (label, value) => {
      await openColumnFilter(label);
      await fill('tui-column-filter .filter-search input', value);
      await pause(300); // The shared filter debounces search input before Apply.
      await applyColumnFilter();
    };
    const toast = text => textContains('tui-toast:popover-open .toast-container', text);
    const dismissToasts = async () => {
      await evaluate(() => document.querySelectorAll('tui-toast .close-icon').forEach(icon => {
        icon.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }));
      await until(async () => !(await query('tui-toast .toast-message-box')), 'Dismissed toasts are still visible');
    };

    await Runtime.enable();
    await Network.enable();
    await Page.enable();
    await Emulation.setDeviceMetricsOverride({ width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
    await Page.navigate({ url: appUrl + '/employees' });
    await waitFor('salary-table tbody tr');
    await textContains('.pagination', '1–20 of');
    const initial = await Page.captureScreenshot({ format: 'png' });
    writeFileSync(resolve(artifacts, 'employees.png'), Buffer.from(initial.data, 'base64'));
    await click('tbody .employee-selection');
    await textContains('.bulk-delete', 'Delete selected (1)');
    await click('.page-controls button:last-child');
    await textContains('.pagination', '21–40 of');
    assert.equal(await query('.bulk-delete'), false);
    await fill('input[aria-label="Page number"]', '5');
    await click('.page-controls button[type="submit"]');
    await textContains('.pagination', '81–100 of');
    await click('.page-controls button:first-child');
    await textContains('.pagination', '61–80 of');
    await fill('input[aria-label="Page number"]', '0');
    await click('.page-controls button[type="submit"]');
    await toast('Enter a whole page number');
    await textContains('.pagination', '61–80 of');
    await fill('input[aria-label="Page number"]', '30');
    await click('.page-controls button[type="submit"]');
    await textContains('.pagination', '581–600 of');
    const laterCodes = await evaluate(() => {
      const codeIndex = Array.from(document.querySelectorAll('salary-table th'))
        .findIndex(header => header.textContent.trim() === 'Employee code');
      return Array.from(document.querySelectorAll('salary-table tbody tr')).slice(0, 2)
        .map(row => row.cells[codeIndex].innerText.trim());
    });
    await fill('input[aria-label="Page number"]', '1');
    await click('.page-controls button[type="submit"]');
    await textContains('.pagination', '1–20 of');
    assert.equal(laterCodes.length, 2);
    assert.ok(!(await getText('tbody')).includes(laterCodes[0]));

    await openColumnFilter('Employee code');
    await waitFor('tui-column-filter .filter-result input[type="checkbox"]');
    assert.ok(await evaluate(() => document.querySelector('tui-column-filter .filter-container').offsetWidth <= 256));
    const filter = await Page.captureScreenshot({ format: 'png' });
    writeFileSync(resolve(artifacts, 'employee-column-filter.png'), Buffer.from(filter.data, 'base64'));
    await selectColumnValue(laterCodes[0]);
    await click('.page-heading h1');
    await until(async () => !(await query('tui-column-filter .filter-container')), 'Dismissed filter stayed open');

    await openColumnFilter('Employee code');
    await waitFor('tui-column-filter .filter-result input[type="checkbox"]');
    assert.equal(await query('tui-column-filter input:checked'), false);
    await selectColumnValue(laterCodes[0]);
    await selectColumnValue(laterCodes[1]);
    await textContains('.pagination', '1–20 of');
    assert.ok(!(await getText('tbody')).includes(laterCodes[0]));
    await applyColumnFilter();
    await textContains('.pagination', '1–2 of 2');
    for (const code of laterCodes) await textContains('tbody', code);
    await click('.page-summary button');
    await textContains('.pagination', '1–20 of');

    await openColumnFilter('Annual gross base salary');
    await applyColumnFilter();
    await toast('Please provide both From and To values.');
    await fill('tui-number-range [formcontrolname="from"] input', '100');
    await fill('tui-number-range [formcontrolname="to"] input', '500000');
    await applyColumnFilter();
    await toast('Choose a currency before applying a salary range.');
    await openColumnFilter('Currency');
    await click('tui-column-filter input[value="USD"]');
    await applyColumnFilter();
    await until(() => networkRequests.some(url => url.includes('/api/employees?page=0&currency=USD')), 'Currency filter was not sent');
    await until(() => evaluate(() => document.querySelector('.results').getAttribute('aria-busy') === 'false'), 'Currency filter is still loading');
    await openColumnFilter('Annual gross base salary');
    await fill('tui-number-range [formcontrolname="from"] input', '100');
    await fill('tui-number-range [formcontrolname="to"] input', '500000');
    await applyColumnFilter();
    await until(() => networkRequests.some(url => url.includes('minSalary=100&maxSalary=500000')), 'Salary range was not sent');
    await until(() => evaluate(() => !document.querySelector('.page-summary button')?.disabled), 'Salary filter is still loading');
    await click('.page-summary button');
    await dismissToasts();

    await click('.page-heading button');
    await waitFor('dialog[open] tui-input input');
    await click('dialog[open] [type="submit"]');
    await toast('This field is required.');
    await pause(250); // Capture the toast after its entrance animation.
    const editor = await Page.captureScreenshot({ format: 'png' });
    writeFileSync(resolve(artifacts, 'employee-dialog.png'), Buffer.from(editor.data, 'base64'));
    const stamp = Date.now().toString(36);
    const code = 'UI-' + stamp.toUpperCase();
    for (const [field, value] of Object.entries({
      employeeCode: code, firstName: 'UIcheck' + stamp, lastName: 'Example',
      email: 'ui-' + stamp + '@example.invalid', department: 'Engineering', jobTitle: 'Analyst',
    })) {
      await fill('tui-input[data-field="' + field + '"] input', value);
    }
    await fill('#employee-country', 'US');
    await fill('dialog[open] input[inputmode="decimal"]', '12345678.90');
    await click('dialog[open] [type="submit"]');
    await toast('Added ' + code);
    await searchColumn('Email', 'missing-' + stamp + '@example.invalid');
    await textContains('.results', 'No employees match these filters.');
    await click('.page-summary button');
    await textContains('.pagination', '1–20 of');
    await openColumnFilter('Employee code');
    await waitFor('tui-column-filter .filter-result input[type="checkbox"]');
    await selectColumnValue(code);
    await applyColumnFilter();
    await textContains('tbody', code);
    await textContains('tbody', 'ui-' + stamp + '@example.invalid');
    await textContains('tbody', 'Analyst');
    await textContains('tbody', 'USD');
    await textContains('tbody', '12,345,678.90');
    await click('tbody button[aria-label^="View "]');
    await textContains('dialog[open] .details', 'Analyst');
    await click('dialog[open] .dialog-heading button');
    await click('tbody button[aria-label^="Edit "]');
    await waitFor('dialog[open] input[inputmode="decimal"]');
    await fill('dialog[open] input[inputmode="decimal"]', '54321000.09');
    await click('dialog[open] [type="submit"]');
    await toast('Saved ' + code);
    await textContains('tbody', '54,321,000.09');

    const actionIcon = action => evaluate(action => document.querySelector(`tbody button[aria-label^="${action} "] svg`).innerHTML, action);
    assert.notEqual(await actionIcon('Deactivate'), await actionIcon('Permanently delete'));
    await click('tbody button[aria-label^="Deactivate "]');
    await textContains('dialog[open] tui-dialog', code);
    await click('dialog[open] .close-button');
    assert.ok(await query('tbody button[aria-label^="Deactivate "]'));
    await click('tbody button[aria-label^="Deactivate "]');
    await click('dialog[open] .submit-button');
    await toast('Deactivated ' + code);
    await textContains('tbody', 'Inactive');
    assert.equal(await query('tbody button[aria-label^="Edit "]'), false);

    await click('tbody button[aria-label^="Reactivate "]');
    await textContains('dialog[open] tui-dialog', 'Reactivate employee');
    await textContains('dialog[open] tui-dialog', code);
    await click('dialog[open] .submit-button');
    await toast('Reactivated ' + code);
    await textContains('tbody', 'Active');
    await waitFor('tbody button[aria-label^="Edit "]');
    assert.equal(await query('tbody button[aria-label^="Reactivate "]'), false);

    await click('tbody button[aria-label^="Deactivate "]');
    await click('dialog[open] .submit-button');
    await textContains('tbody', 'Inactive');

    await click('tbody button[aria-label^="Permanently delete "]');
    await textContains('dialog[open] tui-dialog', code);
    await textContains('dialog[open] tui-dialog', 'This action cannot be undone.');
    await click('dialog[open] .close-button');
    await textContains('tbody', code);
    await click('tbody button[aria-label^="Permanently delete "]');
    await click('dialog[open] .submit-button');
    await toast('Permanently deleted ' + code);
    await textContains('.results', 'No employees match these filters.');

    const bulkPrefix = 'UIB-' + stamp.toUpperCase();
    for (const suffix of ['1', '2']) {
      const employeeCode = bulkPrefix + '-' + suffix;
      const response = await fetch(appUrl + '/api/employees', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode, firstName: 'Bulk', lastName: 'Check ' + suffix,
          email: employeeCode.toLowerCase() + '@example.invalid', department: 'Engineering', jobTitle: 'Analyst',
          countryCode: 'US', currencyCode: 'USD', annualGrossBaseSalary: '1000.00' }),
      });
      assert.equal(response.status, 201);
      bulkFixtures.push(await response.json());
    }
    await click('.page-summary button');
    await textContains('.pagination', '1–20 of');
    await searchColumn('Employee code', bulkPrefix);
    await textContains('.pagination', '1–2 of 2');
    for (const { employeeCode } of bulkFixtures) await click(`tbody .employee-selection[aria-label$="${employeeCode}"]`);
    await textContains('.bulk-delete', 'Delete selected (2)');
    await click('.bulk-delete');
    for (const { employeeCode } of bulkFixtures) await textContains('dialog[open] .bulk-employee-list', employeeCode);
    await textContains('dialog[open] tui-dialog', 'This action cannot be undone.');
    await click('dialog[open] .close-button');
    await textContains('.pagination', '1–2 of 2');
    await textContains('.bulk-delete', 'Delete selected (2)');
    await click('.bulk-delete');
    await click('dialog[open] .submit-button');
    await toast('Permanently deleted 2 employees.');
    await textContains('.results', 'No employees match these filters.');
    assert.equal(networkRequests.filter(entry => entry.startsWith('request ') && entry.endsWith('/api/employees/bulk-delete')).length, 1);
    bulkFixtures.length = 0;

    await click('a[href="/insights"]');
    await textContains('h1', 'Salary insights');
    await textContains('section[aria-labelledby="earners-title"] tbody', 'USD');
    await fill('section[aria-labelledby="earners-title"] select', 'EUR');
    await textContains('section[aria-labelledby="earners-title"] tbody', 'EUR');
    await waitFor('section[aria-labelledby="department-title"] tbody tr');
    assert.ok(await evaluate(() => {
      const table = document.querySelector('[aria-labelledby="summary-title"] .table-section');
      return table.scrollWidth <= table.clientWidth;
    }), 'The currency summary should show all columns on a laptop');
    await dismissToasts();
    const insights = await Page.captureScreenshot({ format: 'png' });
    writeFileSync(resolve(artifacts, 'insights.png'), Buffer.from(insights.data, 'base64'));

    await Emulation.setDeviceMetricsOverride({ width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    for (const page of ['insights', 'employees']) {
      if (page === 'employees') await click('.app-sidebar nav a[href="/employees"]');
      await textContains('h1', page === 'employees' ? 'Employees' : 'Salary insights');
      await waitFor('salary-table tbody tr');
      assert.ok(await evaluate(() => document.documentElement.scrollWidth <= 390),
        page + ' layout should scroll tables inside the page on mobile');
      if (page === 'employees') assert.ok(await evaluate(() => {
        const table = document.querySelector('salary-table .table-section');
        return table.scrollWidth > table.clientWidth;
      }), 'Employee columns should scroll horizontally within the table');
      await evaluate(() => window.scrollTo(0, 0));
      const screenshot = await Page.captureScreenshot({ format: 'png' });
      writeFileSync(resolve(artifacts, page + '-mobile.png'), Buffer.from(screenshot.data, 'base64'));
    }
    assert.deepEqual(exceptions, []);
    console.log('Passed Angular filtering, pagination, add, view, edit, deactivate, reactivate, individual and bulk deletion, insights, and mobile layout.');
  } catch (error) {
    const state = await client.Runtime.evaluate({ expression: 'document.body.innerText.slice(0, 2000)', returnByValue: true });
    console.log('Browser text:', state.result.value);
    console.log('Browser errors:', exceptions);
    console.log('Browser API:', networkRequests);
    throw error;
  } finally {
    await client.close();
    for (const { id, version } of bulkFixtures) {
      const response = await fetch(`${appUrl}/api/employees/${id}?version=${version}`, { method: 'DELETE' });
      assert.ok(response.status === 204 || response.status === 404, 'Could not clean up the synthetic bulk-delete fixture');
    }
  }
}

chrome.on('error', error => console.error('Could not launch Chrome:', error.message));
run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => chrome.kill());
