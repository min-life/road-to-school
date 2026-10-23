import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Round 3 Test Users for E2E verification...');

  // Password hash for 'Pass@123'
  const passwordHash = await bcrypt.hash('Pass@123', 10);

  // 1. Ensure at least two active schools exist
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

  // 2. School Admin A
  const adminA = await prisma.user.upsert({
    where: { email: 'schooladmin_a@test.com' },
    update: { schoolId: schoolA.id, role: Role.SCHOOL_ADMIN, passwordHash, isActive: true },
    create: {
      email: 'schooladmin_a@test.com',
      fullName: 'Quản Trị Viên Trường A',
      phone: '0901111222',
      passwordHash,
      role: Role.SCHOOL_ADMIN,
      schoolId: schoolA.id,
      isActive: true,
      isVerified: true,
    },
  });

  // 3. School Admin B
  const adminB = await prisma.user.upsert({
    where: { email: 'schooladmin_b@test.com' },
    update: { schoolId: schoolB.id, role: Role.SCHOOL_ADMIN, passwordHash, isActive: true },
    create: {
      email: 'schooladmin_b@test.com',
      fullName: 'Quản Trị Viên Trường B',
      phone: '0903333444',
      passwordHash,
      role: Role.SCHOOL_ADMIN,
      schoolId: schoolB.id,
      isActive: true,
      isVerified: true,
    },
  });

  // 4. Parent User
  const parent = await prisma.user.upsert({
    where: { email: 'parent_test@test.com' },
    update: { role: Role.PARENT, passwordHash, isActive: true },
    create: {
      email: 'parent_test@test.com',
      fullName: 'Phụ Huynh Nguyễn Thị Hoa',
      phone: '0912999888',
      passwordHash,
      role: Role.PARENT,
      isActive: true,
      isVerified: true,
    },
  });

  console.log('✓ School A:', schoolA.name, `(${schoolA.id})`);
  console.log('✓ School B:', schoolB.name, `(${schoolB.id})`);
  console.log('✓ School Admin A:', adminA.email);
  console.log('✓ School Admin B:', adminB.email);
  console.log('✓ Parent User:', parent.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
