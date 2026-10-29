import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backLabel, safeAdminReturnTo, schoolTabFromQuery, withReturnTo } from './back-navigation.ts';

test('school route creation returns to the same school and routes tab', () => {
  const source = '/admin/schools/school-1?tab=routes&returnTo=%2Fadmin%2Fschools';
  const create = withReturnTo('/admin/routes/create?schoolId=school-1', source);
  const url = new URL(create, 'https://example.test');
  assert.equal(url.searchParams.get('schoolId'), 'school-1');
  assert.equal(safeAdminReturnTo(url.searchParams.get('returnTo'), url.pathname), source);
  assert.equal(backLabel(source), 'Quay lại phương án của trường');
});

test('plan to route to plan retains the plan own school return destination', () => {
  const school = '/admin/schools/school-1?tab=routes';
  const plan = withReturnTo('/admin/routes/plans/plan-1', school);
  const route = withReturnTo('/admin/routes/route-1', plan);
  const routeUrl = new URL(route, 'https://example.test');
  assert.equal(routeUrl.searchParams.get('returnTo'), plan);
  assert.equal(new URL(plan, 'https://example.test').searchParams.get('returnTo'), school);
  assert.equal(backLabel(plan), 'Quay lại phương án tuyến');
});

test('trip and student links preserve their school tabs and existing destination query', () => {
  for (const [destination, tab] of [['/admin/trips/trip-1?date=2026-10-28', 'trips'], ['/admin/schools/school-1/students/student-1', 'students']]) {
    const source = `/admin/schools/school-1?tab=${tab}`;
    const url = new URL(withReturnTo(destination, source), 'https://example.test');
    assert.equal(url.searchParams.get('returnTo'), source);
    if (tab === 'trips') assert.equal(url.searchParams.get('date'), '2026-10-28');
  }
});

test('overview and list filters in the source URL survive the detail round trip', () => {
  for (const source of ['/admin', '/admin/trips?fromDate=2026-10-28&status=SCHEDULED', '/admin/notifications']) {
    const url = new URL(withReturnTo('/admin/trips/trip-1', source), 'https://example.test');
    assert.equal(url.searchParams.get('returnTo'), source);
  }
});

test('return targets reject external, malformed, oversized and self links', () => {
  for (const value of [null, '', 'https://evil.test/admin', '//evil.test/admin', '/administrator', '/admin/../login', '/admin\\evil', '/admin\n/trips', '/login', '/admin/' + 'x'.repeat(4096)]) {
    assert.equal(safeAdminReturnTo(value), null, String(value));
  }
  assert.equal(safeAdminReturnTo('/admin/trips/trip-1?returnTo=anything', '/admin/trips/trip-1'), null);
  assert.equal(safeAdminReturnTo('/admin/trips'), '/admin/trips');
});

test('forward links avoid self return targets and leave non-admin destinations unchanged', () => {
  assert.equal(withReturnTo('/admin/routes', '/admin/routes?status=ACTIVE'), '/admin/routes');
  assert.equal(withReturnTo('/login', '/admin'), '/login');
  assert.equal(withReturnTo('/admin/routes', 'https://evil.test'), '/admin/routes');
});

test('school tab has an explicit safe default and labels describe the destination', () => {
  for (const tab of ['students', 'routes', 'trips'] as const) assert.equal(schoolTabFromQuery(tab), tab);
  for (const tab of [null, '', 'unknown', 'employees']) assert.equal(schoolTabFromQuery(tab), 'employees');
  assert.equal(backLabel('/admin/schools/school-1?tab=students'), 'Quay lại học sinh của trường');
  assert.equal(backLabel('/admin/schools/school-1?tab=trips'), 'Quay lại chuyến xe của trường');
  assert.equal(backLabel('/admin/routes'), 'Quay lại danh sách phương án');
});
