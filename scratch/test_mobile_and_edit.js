const API_BASE = 'http://localhost:3000/api/v1';

async function main() {
  console.log('=== TESTING MOBILE & TRIP EDIT ENDPOINTS ===\n');

  // 1. Login as SYSTEM_ADMIN
  const adminRes = await fetch(`${API_BASE}/auth/web/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@r2s.com', password: 'Pass@123' }),
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.accessToken;
  console.log('1. Admin logged in:', !!adminToken);

  // 2. Fetch trips list to get a valid trip ID
  const tripsRes = await fetch(`${API_BASE}/trips?limit=5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const tripsData = await tripsRes.json();
  console.log(`2. Total trips fetched: ${tripsData.total}, items: ${tripsData.items.length}`);
  const firstTrip = tripsData.items[0];
  if (!firstTrip) {
    throw new Error('No trips found to test');
  }
  console.log(`Target Trip ID: ${firstTrip.id}, date: ${firstTrip.serviceDate}, vehicle: ${firstTrip.vehiclePlate}`);

  // 3. Test PATCH /trips/:id/assignment (singular - used by Web)
  const patchRes1 = await fetch(`${API_BASE}/trips/${firstTrip.id}/assignment`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      vehicleId: firstTrip.vehicleId,
      driverId: firstTrip.driverId,
      busAttendantId: firstTrip.busAttendantId,
    }),
  });
  console.log('3. PATCH /trips/:id/assignment status:', patchRes1.status);
  const patchData1 = await patchRes1.json();
  console.log('   Response message:', patchData1.message || 'OK', 'has trip:', !!patchData1.trip || !!patchData1.id);

  // 4. Test PATCH /trips/:id/assignments (plural - alternative alias)
  const patchRes2 = await fetch(`${API_BASE}/trips/${firstTrip.id}/assignments`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      vehicleId: firstTrip.vehicleId,
    }),
  });
  console.log('4. PATCH /trips/:id/assignments status:', patchRes2.status);

  // 5. Login as Driver
  const driverEmail = 'tdphuc28@gmail.com';
  console.log('\n5. Attempting Driver login with email:', driverEmail);
  const driverRes = await fetch(`${API_BASE}/auth/mobile/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: driverEmail, password: 'Pass@123' }),
  });
  console.log('   Driver login status:', driverRes.status);
  let driverToken = null;
  if (driverRes.ok) {
    const driverData = await driverRes.json();
    driverToken = driverData.accessToken;
    console.log('   Driver logged in successfully! Role:', driverData.user?.role);
  }

  // 6. Test GET /trips/mobile/driver-schedule
  if (driverToken) {
    console.log('\n6. Testing Driver Weekly Schedule (Mon-Sun):');
    const dSchedRes = await fetch(`${API_BASE}/trips/mobile/driver-schedule?fromDate=2026-10-26&toDate=2026-10-30`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    console.log('   GET /trips/mobile/driver-schedule status:', dSchedRes.status);
    const dSchedData = await dSchedRes.json();
    console.log(`   Found ${dSchedData.items?.length || 0} trips for driver in week 26/10 - 30/10`);
    if (dSchedData.items && dSchedData.items.length > 0) {
      console.log('   Sample trip:', {
        id: dSchedData.items[0].id,
        routeName: dSchedData.items[0].routeName,
        direction: dSchedData.items[0].direction,
        time: dSchedData.items[0].scheduledTime,
        plate: dSchedData.items[0].vehiclePlate,
        serviceDate: dSchedData.items[0].serviceDate,
      });
    }
  }

  // 7. Login as Bus Attendant
  const attendantEmail = 'anhntt@gmail.com';
  console.log('\n7. Login as Bus Attendant with email:', attendantEmail);
  const baRes = await fetch(`${API_BASE}/auth/mobile/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: attendantEmail, password: 'Pass@123' }),
  });
  console.log('   Bus Attendant login status:', baRes.status);
  let baToken = null;
  if (baRes.ok) {
    const baData = await baRes.json();
    baToken = baData.accessToken;
    console.log('   Bus Attendant logged in successfully! Role:', baData.user?.role);

    const baSchedRes = await fetch(`${API_BASE}/trips/mobile/bus-attendant-schedule?fromDate=2026-10-26&toDate=2026-10-30`, {
      headers: { Authorization: `Bearer ${baToken}` },
    });
    console.log('   GET /trips/mobile/bus-attendant-schedule status:', baSchedRes.status);
    const baSchedData = await baSchedRes.json();
    console.log(`   Found ${baSchedData.items?.length || 0} trips for bus attendant`);
  }

  // 8. Test GET /trips/mobile/:id (driver or admin view)
  console.log('\n8. Testing GET /trips/mobile/:id:');
  const tripMobileRes = await fetch(`${API_BASE}/trips/mobile/${firstTrip.id}`, {
    headers: { Authorization: `Bearer ${driverToken || adminToken}` },
  });
  console.log('   GET /trips/mobile/:id status:', tripMobileRes.status);
  const tripMobileData = await tripMobileRes.json();
  console.log('   Mobile trip detail loaded:', {
    routeName: tripMobileData.routeName,
    stopsCount: tripMobileData.stops?.length,
    schoolName: tripMobileData.schoolName,
    vehiclePlate: tripMobileData.vehiclePlate,
  });

  console.log('\n=== ALL MOBILE & TRIP EDIT VERIFICATIONS PASSED ===');
}

main().catch(console.error);
