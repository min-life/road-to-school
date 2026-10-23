import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api/v1';

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

async function loginUser(identifier: string, password = 'Pass@123', isMobile = false) {
  const endpoint = isMobile ? '/auth/mobile/login' : '/auth/web/login';
  const res = await request(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${identifier}: ${JSON.stringify(res.data)}`);
  }
  return {
    token: res.data.accessToken as string,
    user: res.data.user,
    headers: {
      Authorization: `Bearer ${res.data.accessToken}`,
      'Content-Type': 'application/json',
    },
  };
}

function resolveOtpFromHash(otpHash: string): string | null {
  for (let i = 100000; i <= 999999; i++) {
    const candidate = String(i);
    const hash = crypto.createHash('sha256').update(candidate).digest('hex');
    if (hash === otpHash) {
      return candidate;
    }
  }
  return null;
}

async function runAllFlows() {
  console.log('================================================================');
  console.log('   ROADTOSCHOOL ROUND 3 — COMPLETE E2E VERIFICATION (FLOWS A-I) ');
  console.log('================================================================\n');

  const matrix: Record<string, 'PASS' | 'FAIL'> = {};

  // 1. Setup Auth contexts
  console.log('>>> [AUTH] Authenticating test personas...');
  const sysAdmin = await loginUser('admin@r2s.com', 'Pass@123', false);
  const schoolAdminA = await loginUser('schooladmin_a@test.com', 'Pass@123', false);
  const schoolAdminB = await loginUser('schooladmin_b@test.com', 'Pass@123', false);
  const parent = await loginUser('parent_test@test.com', 'Pass@123', true);

  console.log('✓ SYSTEM_ADMIN:', sysAdmin.user.email);
  console.log('✓ SCHOOL_ADMIN A (School:', schoolAdminA.user.schoolId, '):', schoolAdminA.user.email);
  console.log('✓ SCHOOL_ADMIN B (School:', schoolAdminB.user.schoolId, '):', schoolAdminB.user.email);
  console.log('✓ PARENT:', parent.user.email);

  const schoolAId = schoolAdminA.user.schoolId!;
  const schoolBId = schoolAdminB.user.schoolId!;

  // ----------------------------------------------------------------
  // FLOW A — SCHOOL ADMIN CREATES STUDENT & VIEWS DETAILS
  // ----------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('>>> FLOW A: SCHOOL ADMIN CREATES STUDENT & VIEWS DETAILS');
  console.log('----------------------------------------------------------------');

  // Student 1: Without address
  const fd1 = new FormData();
  fd1.append('fullName', 'Nguyễn Văn An');
  fd1.append('guardianPhone', '0912345678');
  const createS1Res = await fetch(`${BASE_URL}/schools/${schoolAId}/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${schoolAdminA.token}` },
    body: fd1,
  });
  const s1Data = await createS1Res.json();
  console.log('Create Student 1 (without address) Status:', createS1Res.status);
  console.log('Student 1 Code:', s1Data.code, '| Status:', s1Data.status, '| hasAddress:', s1Data.hasAddress);

  if (
    createS1Res.status === 201 &&
    s1Data.status === 'AVAILABLE' &&
    s1Data.hasAddress === false &&
    /^STU[A-Z0-9]{8}$/.test(s1Data.code)
  ) {
    console.log('✓ Student 1 created successfully with code format STU + 8 chars');
  } else {
    throw new Error('Flow A: Failed to create student 1 with valid attributes');
  }

  // Student 2: With VietMap address
  const fd2 = new FormData();
  fd2.append('fullName', 'Trần Thị Bình');
  fd2.append('guardianPhone', '0987654321');
  fd2.append('addressText', 'Số 25 Liễu Giai, Ba Đình, Hà Nội');
  fd2.append('latitude', '21.0345');
  fd2.append('longitude', '105.8152');
  const createS2Res = await fetch(`${BASE_URL}/schools/${schoolAId}/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${schoolAdminA.token}` },
    body: fd2,
  });
  const s2Data = await createS2Res.json();
  console.log('Create Student 2 (with address) Status:', createS2Res.status);
  console.log('Student 2 Code:', s2Data.code, '| hasAddress:', s2Data.hasAddress);

  if (createS2Res.status === 201 && s2Data.hasAddress === true) {
    console.log('✓ Student 2 created successfully with hasAddress = true');
  } else {
    throw new Error('Flow A: Failed to create student 2 with address');
  }

  // View Student 1 Detail
  const s1DetailRes = await request(`/schools/${schoolAId}/students/${s1Data.id}`, {
    headers: schoolAdminA.headers,
  });
  console.log('Get Student 1 Detail Status:', s1DetailRes.status, '| QR Data:', s1DetailRes.data.qrData);
  if (s1DetailRes.data.qrData === s1Data.code) {
    console.log('✓ Verified: QR Code Payload strictly equals Student.code');
  } else {
    throw new Error('Flow A: QR Payload mismatch');
  }

  // Test Independent Filters
  const filterHasAddressRes = await request(`/schools/${schoolAId}/students?hasAddress=true`, {
    headers: schoolAdminA.headers,
  });
  const filterNoAddressRes = await request(`/schools/${schoolAId}/students?hasAddress=false`, {
    headers: schoolAdminA.headers,
  });
  console.log('Filter hasAddress=true count:', filterHasAddressRes.data.items.length);
  console.log('Filter hasAddress=false count:', filterNoAddressRes.data.items.length);

  matrix['FLOW_A_SCHOOL_ADMIN_STUDENT'] = 'PASS';
  console.log('✓ FLOW A: PASS');

  // ----------------------------------------------------------------
  // FLOW B — SYSTEM ADMIN STUDENT READ-ONLY & MUTATION BLOCKS
  // ----------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('>>> FLOW B: SYSTEM ADMIN READ-ONLY VERIFICATION');
  console.log('----------------------------------------------------------------');
  const sysAdminListRes = await request(`/schools/${schoolAId}/students`, {
    headers: sysAdmin.headers,
  });
  console.log('SYSTEM_ADMIN list students status:', sysAdminListRes.status, '(Items:', sysAdminListRes.data.items.length, ')');

  // SYSTEM_ADMIN attempt to create student (MUST 403)
  const fdForbidden = new FormData();
  fdForbidden.append('fullName', 'Hacker Student');
  fdForbidden.append('guardianPhone', '0911111111');
  const sysAdminCreateRes = await fetch(`${BASE_URL}/schools/${schoolAId}/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sysAdmin.token}` },
    body: fdForbidden,
  });
  console.log('SYSTEM_ADMIN POST /students status:', sysAdminCreateRes.status, '(expected 403)');

  // SYSTEM_ADMIN attempt to update status (MUST 403)
  const sysAdminPatchRes = await request(`/schools/${schoolAId}/students/${s1Data.id}/status`, {
    method: 'PATCH',
    headers: sysAdmin.headers,
    body: JSON.stringify({ status: 'DISABLED' }),
  });
  console.log('SYSTEM_ADMIN PATCH /status status:', sysAdminPatchRes.status, '(expected 403)');

  if (sysAdminListRes.status === 200 && sysAdminCreateRes.status === 403 && sysAdminPatchRes.status === 403) {
    matrix['FLOW_B_SYSTEM_ADMIN_READ_ONLY'] = 'PASS';
    console.log('✓ FLOW B: PASS (SYSTEM_ADMIN read-only enforced)');
  } else {
    matrix['FLOW_B_SYSTEM_ADMIN_READ_ONLY'] = 'FAIL';
  }

  // ----------------------------------------------------------------
  // FLOW C — TEACHER / BUS_ATTENDANT MANAGEMENT
  // ----------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('>>> FLOW C: SCHOOL ADMIN CREATES GIÁO VIÊN (BUS_ATTENDANT)');
  console.log('----------------------------------------------------------------');
  const teacherEmail = `teacher_${Date.now().toString().slice(-4)}@school.edu.vn`;
  const teacherPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;

  const createTeacherRes = await request(`/schools/${schoolAId}/employees`, {
    method: 'POST',
    headers: schoolAdminA.headers,
    body: JSON.stringify({
      fullName: 'Cô Giáo Mai',
      email: teacherEmail,
      phone: teacherPhone,
    }),
  });
  console.log('Create Teacher Status:', createTeacherRes.status);
  console.log('Teacher Role:', createTeacherRes.data.role, '| School ID:', createTeacherRes.data.schoolId);

  if (createTeacherRes.status === 201 && createTeacherRes.data.role === 'BUS_ATTENDANT') {
    console.log('✓ Backend automatically assigned role BUS_ATTENDANT to teacher');

    // List employees
    const listTeachersRes = await request(`/schools/${schoolAId}/employees`, {
      headers: schoolAdminA.headers,
    });
    console.log('List Teachers count:', listTeachersRes.data.items.length);

    // Get Teacher detail
    const teacherDetailRes = await request(`/schools/${schoolAId}/employees/${createTeacherRes.data.id}`, {
      headers: schoolAdminA.headers,
    });
    console.log('Teacher Detail Role:', teacherDetailRes.data.role, '| FullName:', teacherDetailRes.data.fullName);

    matrix['FLOW_C_TEACHER_MANAGEMENT'] = 'PASS';
    console.log('✓ FLOW C: PASS');
  } else {
    matrix['FLOW_C_TEACHER_MANAGEMENT'] = 'FAIL';
  }

  // ----------------------------------------------------------------
  // FLOW D — DRIVER MANAGEMENT (SYSTEM_ADMIN)
  // ----------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('>>> FLOW D: SYSTEM ADMIN DRIVER MANAGEMENT');
  console.log('----------------------------------------------------------------');
  const driverEmail = `driver_${Date.now().toString().slice(-4)}@r2s.com`;
  const createDriverRes = await request('/drivers', {
    method: 'POST',
    headers: sysAdmin.headers,
    body: JSON.stringify({
      fullName: 'Bác Tài Xế Hùng',
      email: driverEmail,
    }),
  });
  console.log('Create Driver Status:', createDriverRes.status, '| Role:', createDriverRes.data.role);

  if (createDriverRes.status === 201 && createDriverRes.data.role === 'DRIVER') {
    const driverDetailRes = await request(`/drivers/${createDriverRes.data.id}`, {
      headers: sysAdmin.headers,
    });
    console.log('Driver Detail Name:', driverDetailRes.data.fullName);
    matrix['FLOW_D_DRIVER_MANAGEMENT'] = 'PASS';
    console.log('✓ FLOW D: PASS');
  } else {
    matrix['FLOW_D_DRIVER_MANAGEMENT'] = 'FAIL';
  }

  // ----------------------------------------------------------------
  // FLOW E — PARENT LINKING VIA STUDENT CODE & OTP
  // ----------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('>>> FLOW E: PARENT LINK VIA CODE & OTP');
  console.log('----------------------------------------------------------------');
  const linkReqRes = await request('/parents/link-requests', {
    method: 'POST',
    headers: parent.headers,
    body: JSON.stringify({ studentCode: s1Data.code }),
  });
  console.log('Request Link OTP Status:', linkReqRes.status);
  console.log('Challenge ID:', linkReqRes.data.challengeId, '| Masked Phone:', linkReqRes.data.maskedPhone);

  if (linkReqRes.ok || linkReqRes.status === 201) {
    // Resolve OTP from DB
    const challenge = await prisma.otpChallenge.findUnique({
      where: { id: linkReqRes.data.challengeId },
    });
    const otp = resolveOtpFromHash(challenge!.otpHash);
    console.log('✓ Recovered OTP for test verification:', otp);

    // Verify OTP
    const verifyRes = await request('/parents/verify-link', {
      method: 'POST',
      headers: parent.headers,
      body: JSON.stringify({
        challengeId: linkReqRes.data.challengeId,
        otp: otp!,
      }),
    });
    console.log('Verify Link Status:', verifyRes.status, '| Message:', verifyRes.data.message);

    // Verify student appears in Parent Tracking list
    const linkedListRes = await request('/parents/students', {
      headers: parent.headers,
    });
    console.log('Parent Linked Students Count:', linkedListRes.data.length);
    const found = linkedListRes.data.find((s: any) => s.id === s1Data.id);
    console.log('Student 1 Found in Parent Tracking list:', !!found);

    // Parent views Student 1 Detail
    const pStudentDetailRes = await request(`/parents/students/${s1Data.id}`, {
      headers: parent.headers,
    });
    console.log('Parent Student Detail Section 1: FullName:', pStudentDetailRes.data.fullName, '| School:', pStudentDetailRes.data.schoolName);

    if (verifyRes.status === 201 && found && pStudentDetailRes.status === 200) {
      matrix['FLOW_E_PARENT_LINK_CODE'] = 'PASS';
      console.log('✓ FLOW E: PASS');
    } else {
      matrix['FLOW_E_PARENT_LINK_CODE'] = 'FAIL';
    }
  } else {
    matrix['FLOW_E_PARENT_LINK_CODE'] = 'FAIL';
  }

  // ----------------------------------------------------------------
  // FLOW F — PARENT LINKING VIA QR CODE PAYLOAD
  // ----------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('>>> FLOW F: PARENT LINK VIA QR CODE PAYLOAD');
  console.log('----------------------------------------------------------------');
  // QR payload is s2Data.code
  const qrPayload = s2Data.code;
  console.log('Scanned QR Payload:', qrPayload);

  const qrLinkReqRes = await request('/parents/link-requests', {
    method: 'POST',
    headers: parent.headers,
    body: JSON.stringify({ studentCode: qrPayload }),
  });
  console.log('QR Link Request Status:', qrLinkReqRes.status);

  if (qrLinkReqRes.ok || qrLinkReqRes.status === 201) {
    const challenge2 = await prisma.otpChallenge.findUnique({
      where: { id: qrLinkReqRes.data.challengeId },
    });
    const otp2 = resolveOtpFromHash(challenge2!.otpHash);
    const qrVerifyRes = await request('/parents/verify-link', {
      method: 'POST',
      headers: parent.headers,
      body: JSON.stringify({
        challengeId: qrLinkReqRes.data.challengeId,
        otp: otp2!,
      }),
    });
    console.log('QR Verify Status:', qrVerifyRes.status);

    const linkedList2 = await request('/parents/students', {
      headers: parent.headers,
    });
    console.log('Linked Students Count after QR link:', linkedList2.data.length);

    if (qrVerifyRes.status === 201 && linkedList2.data.length === 2) {
      matrix['FLOW_F_PARENT_LINK_QR'] = 'PASS';
      console.log('✓ FLOW F: PASS');
    } else {
      matrix['FLOW_F_PARENT_LINK_QR'] = 'FAIL';
    }
  } else {
    matrix['FLOW_F_PARENT_LINK_QR'] = 'FAIL';
  }

  // ----------------------------------------------------------------
  // FLOW G — UNLINK STUDENT
  // ----------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('>>> FLOW G: UNLINK STUDENT (SWIPE OR DETAIL)');
  console.log('----------------------------------------------------------------');
  const unlinkRes = await request(`/parents/students/${s2Data.id}`, {
    method: 'DELETE',
    headers: parent.headers,
  });
  console.log('Unlink Student 2 Status:', unlinkRes.status);

  // Verify removed from parent list
  const linkedListAfterUnlink = await request('/parents/students', {
    headers: parent.headers,
  });
  const s2StillLinked = linkedListAfterUnlink.data.some((s: any) => s.id === s2Data.id);
  console.log('Student 2 Still in Parent list:', s2StillLinked, '(expected false)');

  // Verify Student 2 record STILL exists in School A
  const s2InSchool = await request(`/schools/${schoolAId}/students/${s2Data.id}`, {
    headers: schoolAdminA.headers,
  });
  console.log('Student 2 Still in School A:', s2InSchool.status === 200, '(expected true)');

  if (unlinkRes.status === 200 && !s2StillLinked && s2InSchool.status === 200) {
    matrix['FLOW_G_UNLINK'] = 'PASS';
    console.log('✓ FLOW G: PASS');
  } else {
    matrix['FLOW_G_UNLINK'] = 'FAIL';
  }

  // ----------------------------------------------------------------
  // FLOW H — DISABLED STUDENT STATUS TOGGLE & PARENT VISIBILITY
  // ----------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('>>> FLOW H: DISABLED STUDENT STATUS TOGGLE & SECURITY');
  console.log('----------------------------------------------------------------');
  // School Admin disables Student 1
  const disableRes = await request(`/schools/${schoolAId}/students/${s1Data.id}/status`, {
    method: 'PATCH',
    headers: schoolAdminA.headers,
    body: JSON.stringify({ status: 'DISABLED' }),
  });
  console.log('Disable Student 1 Status:', disableRes.status, '| New Status:', disableRes.data.status);

  // Existing linked Parent still sees student, but with status DISABLED
  const parentCheckRes = await request('/parents/students', {
    headers: parent.headers,
  });
  const linkedS1 = parentCheckRes.data.find((s: any) => s.id === s1Data.id);
  console.log('Parent views Student 1 status:', linkedS1?.status, '(expected DISABLED)');

  // Attempt to link a DISABLED student must be rejected with 400
  const linkDisabledRes = await request('/parents/link-requests', {
    method: 'POST',
    headers: parent.headers,
    body: JSON.stringify({ studentCode: s1Data.code }),
  });
  console.log('Link DISABLED student request status:', linkDisabledRes.status, '(expected 400)');

  // Re-enable student 1
  const reEnableRes = await request(`/schools/${schoolAId}/students/${s1Data.id}/status`, {
    method: 'PATCH',
    headers: schoolAdminA.headers,
    body: JSON.stringify({ status: 'AVAILABLE' }),
  });
  console.log('Re-enable Student 1 Status:', reEnableRes.status, '| Status:', reEnableRes.data.status);

  if (disableRes.status === 200 && linkedS1?.status === 'DISABLED' && linkDisabledRes.status === 400 && reEnableRes.status === 200) {
    matrix['FLOW_H_DISABLED_STUDENT'] = 'PASS';
    console.log('✓ FLOW H: PASS');
  } else {
    matrix['FLOW_H_DISABLED_STUDENT'] = 'FAIL';
  }

  // ----------------------------------------------------------------
  // FLOW I — CROSS-SCHOOL & ROLE SECURITY ISOLATION
  // ----------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('>>> FLOW I: CROSS-SCHOOL & ROLE SECURITY ISOLATION');
  console.log('----------------------------------------------------------------');
  // School Admin A attempts to read School B students (MUST 403)
  const crossReadRes = await request(`/schools/${schoolBId}/students`, {
    headers: schoolAdminA.headers,
  });
  console.log('School Admin A reads School B students status:', crossReadRes.status, '(expected 403)');

  // School Admin A attempts to create School B student (MUST 403)
  const fdCross = new FormData();
  fdCross.append('fullName', 'Cross School Student');
  fdCross.append('guardianPhone', '0912345678');
  const crossCreateRes = await fetch(`${BASE_URL}/schools/${schoolBId}/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${schoolAdminA.token}` },
    body: fdCross,
  });
  console.log('School Admin A creates School B student status:', crossCreateRes.status, '(expected 403)');

  // Parent attempts to call School Admin API (MUST 403)
  const parentAdminApiRes = await request(`/schools/${schoolAId}/students`, {
    headers: parent.headers,
  });
  console.log('Parent calls /schools/:id/students status:', parentAdminApiRes.status, '(expected 403)');

  if (crossReadRes.status === 403 && crossCreateRes.status === 403 && parentAdminApiRes.status === 403) {
    matrix['FLOW_I_SECURITY_ISOLATION'] = 'PASS';
    console.log('✓ FLOW I: PASS');
  } else {
    matrix['FLOW_I_SECURITY_ISOLATION'] = 'FAIL';
  }

  // Final Summary
  console.log('\n================================================================');
  console.log('               FINAL E2E VERIFICATION MATRIX:                  ');
  console.log('================================================================');
  console.table(matrix);
  console.log('================================================================\n');

  const allPassed = Object.values(matrix).every((v) => v === 'PASS');
  if (allPassed) {
    console.log('🎉 ALL END-TO-END FLOWS A-I PASSED WITH 100% ACCURACY!');
  } else {
    console.error('❌ SOME FLOWS FAILED');
    process.exit(1);
  }
}

runAllFlows()
  .catch((err) => {
    console.error('E2E Execution Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
