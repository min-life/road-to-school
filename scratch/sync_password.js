const { PrismaClient } = require('./api/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: 'admin@r2s.com' } });
  if (admin) {
    await prisma.user.updateMany({
      where: { email: { in: ['tdphuc28@gmail.com', 'anhntt@gmail.com', 'parent1@test.com'] } },
      data: { passwordHash: admin.passwordHash, isVerified: true, isActive: true },
    });
    console.log('Successfully set driver, attendant, parent passwords to Pass@123');
  }
}

main().finally(() => prisma.$disconnect());
