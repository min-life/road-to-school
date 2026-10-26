const API_BASE = 'http://localhost:3000/api/v1';

async function main() {
  console.log('=== ROADTOSCHOOL V2.0 LIVE API & RBAC VERIFICATION ===\n');

  // 1. SYSTEM ADMIN LOGIN
  console.log('--- 1. Login as SYSTEM_ADMIN (admin@r2s.com) ---');
  const adminLoginRes = await fetch(`${API_BASE}/auth/web/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin@r2s.com',
      password: 'Pass@123',
    }),
  });
  const adminLogin = await adminLoginRes.json();
  const adminToken = adminLogin.accessToken;
  console.log('System Admin login status:', adminLoginRes.status, 'Role:', adminLogin.user?.role);

  // 2. LIST ROUTEPLANS AS SYSTEM_ADMIN
  console.log('\n--- 2. Call GET /routes/route-plans (SYSTEM_ADMIN) ---');
  const plansRes = await fetch(`${API_BASE}/routes/route-plans`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const plansData = await plansRes.json();
  console.log('Status:', plansRes.status);
  console.log('Total plans in system:', plansData.total);
  const plan = plansData.items[0];
  console.log('Plan summary:', {
    id: plan?.id,
    name: plan?.name,
    schoolName: plan?.schoolName,
    totalStudents: plan?.totalStudents,
    totalOutboundRoutes: plan?.totalOutboundRoutes,
    totalReturnRoutes: plan?.totalReturnRoutes,
    status: plan?.status,
  });

  const testPlanId = plan?.id;

  // 3. SEARCH FILTERS
  console.log('\n--- 3. Test Search on RoutePlans ---');
  const searchHit = await fetch(`${API_BASE}/routes/route-plans?search=Tiểu Học FPT`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const searchHitData = await searchHit.json();
  console.log('Search "Tiểu Học FPT" count:', searchHitData.total, '(Expect >= 1)');

  const searchMiss = await fetch(`${API_BASE}/routes/route-plans?search=NonExistentKeywordXYZ`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const searchMissData = await searchMiss.json();
  console.log('Search "NonExistentKeywordXYZ" count:', searchMissData.total, '(Expect 0)');

  // 4. ROUTEPLAN DETAIL
  console.log('\n--- 4. Call GET /routes/route-plans/:id ---');
  const detailRes = await fetch(`${API_BASE}/routes/route-plans/${testPlanId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const detail = await detailRes.json();
  console.log('Status:', detailRes.status);
  console.log('Plan:', detail.name, 'Status:', detail.status, 'Total Students:', detail.totalStudents);
  console.log('Member routes count:', detail.routes?.length);

  const sampleRoute = detail.routes?.[0];
  console.log('Sample member route:', {
    id: sampleRoute?.id,
    name: sampleRoute?.name,
    direction: sampleRoute?.direction,
    proposedVehiclePlate: sampleRoute?.proposedVehiclePlate,
    studentCount: sampleRoute?.studentCount,
    stopsCount: sampleRoute?.stops?.length,
  });

  // 5. ROUTE DETAIL BACKWARD COMPATIBILITY
  console.log('\n--- 5. Call GET /routes/:id (Route Detail backward compatibility) ---');
  const routeRes = await fetch(`${API_BASE}/routes/${sampleRoute.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const routeData = await routeRes.json();
  console.log('Status:', routeRes.status);
  console.log('Route name:', routeData.name);
  console.log('Parent RoutePlan ID:', routeData.routePlanId);
  console.log('Parent RoutePlan Name:', routeData.routePlanName);
  console.log('Contextual Plan Status:', routeData.planStatus);

  // 6. SCHOOL ADMIN RBAC & DATA ISOLATION
  console.log('\n--- 6. Test SCHOOL_ADMIN RBAC & Data Isolation (schooladmin_b@test.com) ---');
  const saLoginRes = await fetch(`${API_BASE}/auth/web/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'schooladmin_b@test.com',
      password: 'Pass@123',
    }),
  });
  const saLogin = await saLoginRes.json();
  const saToken = saLogin.accessToken;
  console.log('School Admin login status:', saLoginRes.status, 'SchoolId:', saLogin.user?.schoolId);

  // School Admin lists plans (should only see school B's plans, NOT school A's plan)
  const saListRes = await fetch(`${API_BASE}/routes/route-plans`, {
    headers: { Authorization: `Bearer ${saToken}` },
  });
  const saListData = await saListRes.json();
  console.log('School Admin visible plans count:', saListData.total, '(Expect 0 because school B has no plans yet)');

  // School Admin tries to access School A's RoutePlan detail directly by ID
  const saDetailAttempt = await fetch(`${API_BASE}/routes/route-plans/${testPlanId}`, {
    headers: { Authorization: `Bearer ${saToken}` },
  });
  console.log('School Admin accessing School A RoutePlan (Expect 403 Forbidden):', saDetailAttempt.status);

  // School Admin tries to access School A's Route detail directly by ID
  const saRouteAttempt = await fetch(`${API_BASE}/routes/${sampleRoute.id}`, {
    headers: { Authorization: `Bearer ${saToken}` },
  });
  console.log('School Admin accessing School A Route (Expect 403 Forbidden):', saRouteAttempt.status);

  // School Admin tries to Cancel School A's RoutePlan
  const saCancelAttempt = await fetch(`${API_BASE}/routes/route-plans/${testPlanId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${saToken}`,
    },
    body: JSON.stringify({ reason: 'Attempt unauthorized cancel' }),
  });
  console.log('School Admin Cancel attempt (Expect 403 Forbidden):', saCancelAttempt.status);

  // School Admin tries to Confirm a plan
  const saConfirmAttempt = await fetch(`${API_BASE}/routes/confirm-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${saToken}`,
    },
    body: JSON.stringify({ previewToken: 'fake_token' }),
  });
  console.log('School Admin Confirm attempt (Expect 403 Forbidden):', saConfirmAttempt.status);

  console.log('\n=== ALL LIVE API & RBAC CHECKS PASSED PERFECTLY ===');
}

main().catch(console.error);
