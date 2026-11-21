import assert from 'node:assert/strict';

const origin = process.env.DEMO_URL ?? 'http://127.0.0.1:8080';

async function request(path, status = 200, method = 'GET', body) {
  const response = await fetch(origin + '/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = response.status === 204 ? undefined : await response.json();
  assert.equal(response.status, status, method + ' ' + path + ': ' + JSON.stringify(result));
  return result;
}

const firstPage = await request('/employees');
assert.equal(firstPage.content.length, 20);
assert.ok(firstPage.totalElements >= 10000, 'Run the employee seed before checking the demo.');
const secondPage = await request('/employees?page=1');
assert.equal(secondPage.page, 1);
assert.notEqual(secondPage.content[0].id, firstPage.content[0].id);
const laterEmployees = (await request('/employees?page=29')).content.slice(0, 2);
const codeOptions = await request('/employees/filter-options?fieldName=employeeCode', 200, 'POST', []);
const nameOptions = await request('/employees/filter-options?fieldName=fullName', 200, 'POST', []);
assert.equal(codeOptions.length, new Set(codeOptions).size);
assert.ok(laterEmployees.every(employee => codeOptions.includes(employee.employeeCode) &&
  nameOptions.includes(employee.firstName + ' ' + employee.lastName)));
const matches = await request('/employees/search', 200, 'POST', {
  filters: {}, selections: { employeeCode: laterEmployees.map(employee => employee.employeeCode) },
});
assert.deepEqual(matches.content.map(employee => employee.id), laterEmployees.map(employee => employee.id));
await request('/employees/filter-options?fieldName=version', 400, 'POST', []);
assert.equal((await request('/employees?page=9999')).content.length, 0);
await request('/employees?minSalary=10', 400);
await request('/employees?currency=USD&minSalary=20&maxSalary=10', 400);
await request('/employees?status=ARCHIVED', 400);
await request('/employees/999999999', 404);
await request('/insights/top-earners?currency=EUR&limit=0', 400);

const run = Date.now().toString(36);
const department = 'Test ' + run;
const drafts = [
  { employeeCode: 'QA-' + run + '-1', firstName: 'Case%Check', lastName: 'Test',
    email: 'qa-' + run + '-1@example.invalid', department, jobTitle: 'Analyst',
    countryCode: 'FR', currencyCode: 'EUR', annualGrossBaseSalary: '9000000000000000.01' },
  { employeeCode: 'QA-' + run + '-2', firstName: 'CaseCheck', lastName: 'Test',
    email: 'qa-' + run + '-2@example.invalid', department, jobTitle: 'Analyst',
    countryCode: 'DE', currencyCode: 'EUR', annualGrossBaseSalary: '10.01' },
  { employeeCode: 'QA-' + run + '-3', firstName: 'CaseCheck', lastName: 'Test',
    email: 'qa-' + run + '-3@example.invalid', department, jobTitle: 'Analyst',
    countryCode: 'US', currencyCode: 'USD', annualGrossBaseSalary: '20.02' },
];

const created = [];
try {
  for (const draft of drafts) created.push(await request('/employees', 201, 'POST', draft));
  let [first] = created;
  assert.equal(first.annualGrossBaseSalary, drafts[0].annualGrossBaseSalary);
  const duplicate = await request('/employees', 409, 'POST', {
    ...drafts[0], employeeCode: 'OTHER-' + run, email: drafts[0].email.toUpperCase(),
  });
  assert.ok(duplicate.fieldErrors.email);
  await request('/employees', 400, 'POST', { ...drafts[0], firstName: ' ', annualGrossBaseSalary: '1.111' });

  const name = new URLSearchParams({ department, name: 'case%check', status: 'ACTIVE', country: 'FR',
    currency: 'EUR', minSalary: first.annualGrossBaseSalary, maxSalary: first.annualGrossBaseSalary });
  const filtered = await request('/employees?' + name);
  assert.deepEqual(filtered.content.map(employee => employee.id), [first.id]);
  const groups = (await request('/insights/departments')).filter(group => group.department === department);
  assert.deepEqual(groups.map(group => [group.currencyCode, group.employeeCount, group.total]),
    [['EUR', 2, '9000000000000010.02'], ['USD', 1, '20.02']]);
  assert.equal(groups[0].average, '4500000000000005.01');
  assert.equal(groups[0].minimum, '10.01');
  assert.equal(groups[0].maximum, first.annualGrossBaseSalary);
  assert.equal((await request('/insights/top-earners?currency=EUR'))[0].id, first.id);

  const path = '/employees/' + first.id;
  await request(path, 400, 'PUT', { ...drafts[0], version: first.version, countryCode: 'US' });
  assert.equal((await request(path)).countryCode, 'FR');
  const updated = await request(path, 200, 'PUT', { ...drafts[0], version: first.version,
    annualGrossBaseSalary: '9100000000000000.02' });
  created[0] = updated;
  assert.equal(updated.annualGrossBaseSalary, '9100000000000000.02');
  await request(path, 409, 'PUT', { ...drafts[0], version: first.version });
  await request(path + '/deactivate', 409, 'PATCH', { version: first.version });
  first = await request(path + '/deactivate', 200, 'PATCH', { version: updated.version });
  created[0] = first;
  assert.equal(first.status, 'INACTIVE');
  assert.equal((await request(path + '/deactivate', 200, 'PATCH', { version: first.version })).version, first.version);
  await request(path, 409, 'PUT', { ...drafts[0], version: first.version });
  assert.ok((await request('/insights/top-earners?currency=EUR')).every(employee => employee.id !== first.id));
  assert.equal((await request('/employees?' + new URLSearchParams({ status: 'INACTIVE', department }))).content[0].id, first.id);

  await request(path + '/reactivate', 400, 'PATCH', {});
  await request(path + '/reactivate', 409, 'PATCH', { version: updated.version });
  const reactivated = await request(path + '/reactivate', 200, 'PATCH', { version: first.version });
  created[0] = reactivated;
  assert.deepEqual(reactivated, { ...first, status: 'ACTIVE', version: first.version + 1 });
  assert.deepEqual(await request(path + '/reactivate', 200, 'PATCH', { version: reactivated.version }), reactivated);
  assert.equal((await request('/employees?' + new URLSearchParams({ status: 'INACTIVE', department }))).totalElements, 0);
  assert.ok((await request('/insights/top-earners?currency=EUR')).some(employee => employee.id === first.id));

  const summary = await request('/insights/summary');
  assert.equal(summary.activeEmployeeCount, summary.byCurrency.reduce((count, group) => count + group.employeeCount, 0));

  await request(path, 400, 'DELETE');
  await request(path + '?version=' + first.version, 409, 'DELETE');
  assert.deepEqual(await request(path), reactivated);
  await request(path + '?version=' + reactivated.version, 204, 'DELETE');
  created.shift();
  await request(path, 404);
  await request(path + '/reactivate', 404, 'PATCH', { version: reactivated.version });
  assert.equal((await request('/employees?' + new URLSearchParams({ department }))).totalElements, 2);
  assert.ok((await request('/insights/top-earners?currency=EUR')).every(employee => employee.id !== first.id));

  const active = created[0];
  const inactive = await request(`/employees/${created[1].id}/deactivate`, 200, 'PATCH', { version: created[1].version });
  created[1] = inactive;
  const targets = created.map(({ id, version }) => ({ id, version }));
  const bulkPath = '/employees/bulk-delete';
  await request(bulkPath, 400, 'POST', { employees: [] });
  await request(bulkPath, 400, 'POST', { employees: [targets[0], targets[0]] });
  await request(bulkPath, 409, 'POST', { employees: [targets[0], { ...targets[1], version: inactive.version - 1 }] });
  assert.deepEqual(await request(`/employees/${active.id}`), active);
  assert.deepEqual(await request(`/employees/${inactive.id}`), inactive);
  await request(bulkPath, 204, 'POST', { employees: targets });
  created.length = 0;
  for (const { id } of targets) await request(`/employees/${id}`, 404);
  assert.equal((await request('/employees?' + new URLSearchParams({ department }))).totalElements, 0);
  console.log('Passed employee lifecycle, individual and bulk deletion, validation, pagination, decimals and insights.');
} finally {
  for (const employee of created) {
    await request(`/employees/${employee.id}?version=${employee.version}`, 204, 'DELETE');
  }
}
