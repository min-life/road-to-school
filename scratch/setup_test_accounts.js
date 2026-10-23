const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setup() {
  console.log('Ensuring test users exist for E2E verification...');

  // Get admin password hash
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@r2s.com' },
  });

  if (!admin) {
    throw new Error('Admin user not found');
  }

  const hash = admin.passwordHash;

  // Get School A
  let schoolA = await prisma.school.findFirst({
    where: { isActive: true },
  });

  if (!schoolA) {
    schoolA = await prisma.school.create({
      data: {
        name: 'Trường Tiểu Học Chu Văn An',
        addressText: '115 Thụy Khuê, Tây Hồ, Hà Nội',
        latitude: 21.0428,
        longitude: 105.8267,
        contractStartDate: new Date('2025-01-01'),
        contractEndDate: new Date('2028-01-01'),
        weeklySchedule: {},
        isActive: true,
      },
    });
  }

  // Get or create School B (for cross-school isolation test)
  let schoolB = await prisma.school.findFirst({
    where: {
      id: { not: schoolA.id },
      isActive: true,
    },
  });

  if (!schoolB) {
    schoolB = await prisma.school.create({
      data: {
        name: 'Trường THCS Lê Quý Đôn',
        addressText: '50 Lê Quý Đôn, Cầu Giấy, Hà Nội',
        latitude: 21.0333,
        longitude: 105.7899,
        contractStartDate: new Date('2025-01-01'),
        contractEndDate: new Date('2028-01-01'),
        weeklySchedule: {},
        isActive: true,
      },
    });
  }

  // 1. School Admin A
  const schoolAdminA = await prisma.user.upsert({
    where: { email: 'schooladmin_a@test.com' },
    update: { schoolId: schoolA.id, role: 'SCHOOL_ADMIN', isActive: true },
    create: {
      email: 'schooladmin_a@test.com',
      fullName: 'Quản Trị Viên Trường A',
      phone: '0901111222',
      passwordHash: hash,
      role: 'SCHOOL_ADMIN',
      schoolId: schoolA.id,
      isActive: true,
      isVerified: true,
    },
  });

  // 2. School Admin B
  const schoolAdminB = await prisma.user.upsert({
    where: { email: 'schooladmin_b@test.com' },
    update: { schoolId: schoolB.id, role: 'SCHOOL_ADMIN', isActive: true },
    create: {
      email: 'schooladmin_b@test.com',
      fullName: 'Quản Trị Viên Trường B',
      phone: '0903333444',
      passwordHash: hash,
      role: 'SCHOOL_ADMIN',
      schoolId: schoolB.id,
      isActive: true,
      isVerified: true,
    },
  });

  // 3. Parent User
  const parent = await prisma.user.upsert({
    where: { email: 'parent_test@test.com' },
    update: { role: 'PARENT', isActive: true },
    create: {
      email: 'parent_test@test.com',
      fullName: 'Phụ Huynh Nguyễn Thị Hoa',
      phone: '0912999888',
      passwordHash: hash,
      role: 'PARENT',
      isActive: true,
      isVerified: true,
    },
  });

  console.log('✓ School A:', schoolA.name, `(${schoolA.id})`);
  console.log('✓ School B:', schoolB.name, `(${schoolB.id})`);
  console.log('✓ School Admin A:', schoolAdminA.email);
  console.log('✓ School Admin B:', schoolAdminB.email);
  console.log('✓ Parent User:', parent.email);
}

setup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
