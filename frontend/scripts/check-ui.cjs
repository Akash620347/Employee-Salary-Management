const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const CDP = require('chrome-remote-interface');

const artifacts = resolve(__dirname, '../../.local');
mkdirSync(artifacts, { recursive: true });
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

    await Runtime.enable();
    await Network.enable();
    await Page.enable();
    await Emulation.setDeviceMetricsOverride({ width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
    await Page.navigate({ url: 'http://127.0.0.1:4200/employees' });
    await waitFor('salary-table tbody tr');
    await textContains('.pagination', '1–20 of');
    const initial = await Page.captureScreenshot({ format: 'png' });
    writeFileSync(resolve(artifacts, 'employees.png'), Buffer.from(initial.data, 'base64'));
    await click('.pagination button:last-child');
    await textContains('.pagination', '21–40 of');

    await fill('input[formcontrolname="minSalary"]', '100');
    await click('.filters [type="submit"]');
    await textContains('.filters', 'Choose a currency.');
    await click('.filter-actions button:last-child');
    await textContains('.pagination', '1–20 of');

    await click('.page-heading button');
    await waitFor('dialog[open] tui-input input');
    await click('dialog[open] [type="submit"]');
    await textContains('dialog[open]', 'This field is required.');
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
    await textContains('.notice', 'Added ' + code);
    await fill('input[formcontrolname="name"]', 'UIcheck' + stamp);
    await click('.filters [type="submit"]');
    await textContains('tbody', 'USD');
    await textContains('tbody', '12,345,678.90');
    await click('tbody button[aria-label^="View "]');
    await textContains('dialog[open] .details', 'Analyst');
    await click('dialog[open] .dialog-heading button');
    await click('tbody button[aria-label^="Edit "]');
    await waitFor('dialog[open] input[inputmode="decimal"]');
    await fill('dialog[open] input[inputmode="decimal"]', '54321000.09');
    await click('dialog[open] [type="submit"]');
    await textContains('tbody', '54,321,000.09');

    await click('tbody button[aria-label^="Deactivate "]');
    await textContains('dialog[open] tui-dialog', code);
    await click('dialog[open] .close-button');
    assert.ok(await query('tbody button[aria-label^="Deactivate "]'));
    await click('tbody button[aria-label^="Deactivate "]');
    await click('dialog[open] .submit-button');
    await textContains('tbody', 'Inactive');
    assert.equal(await query('tbody button[aria-label^="Edit "]'), false);

    await click('a[href="/insights"]');
    await textContains('h1', 'Salary insights');
    await textContains('section[aria-labelledby="earners-title"] tbody', 'USD');
    await fill('section[aria-labelledby="earners-title"] select', 'EUR');
    await textContains('section[aria-labelledby="earners-title"] tbody', 'EUR');
    await waitFor('section[aria-labelledby="department-title"] tbody tr');
    const insights = await Page.captureScreenshot({ format: 'png' });
    writeFileSync(resolve(artifacts, 'insights.png'), Buffer.from(insights.data, 'base64'));
    assert.deepEqual(exceptions, []);
    console.log('Passed Angular filtering, pagination, validation, add, view, edit, deactivate, and insights.');
  } catch (error) {
    const state = await client.Runtime.evaluate({ expression: 'document.body.innerText.slice(0, 2000)', returnByValue: true });
    console.log('Browser text:', state.result.value);
    console.log('Browser errors:', exceptions);
    console.log('Browser API:', networkRequests);
    throw error;
  } finally {
    await client.close();
  }
}

chrome.on('error', error => console.error('Could not launch Chrome:', error.message));
run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => chrome.kill());
