import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Helper: Ensure environment variables are loaded from local .env if not already loaded
function loadEnvFallback() {
  if (process.env.BOOTSTRAP_ADMIN_EMAIL && process.env.BOOTSTRAP_ADMIN_PASSWORD && process.env.DATABASE_URL) {
    return;
  }
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'api', '.env'),
    path.resolve(import.meta.dirname, '..', '.env'),
  ];
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx > 0) {
          const key = line.substring(0, eqIdx).trim();
          let val = line.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
      break;
    }
  }
}

loadEnvFallback();

const prisma = new PrismaClient();

async function seedAdmin(): Promise<void> {
  const rawEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const rawPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  // Step 1 — Validate Environment
  if (!rawEmail || !rawEmail.trim()) {
    console.error('[BOOTSTRAP_ERROR] Missing BOOTSTRAP_ADMIN_EMAIL in environment variables.');
    process.exit(1);
  }

  if (!rawPassword || !rawPassword.trim()) {
    console.error('[BOOTSTRAP_ERROR] Missing BOOTSTRAP_ADMIN_PASSWORD in environment variables.');
    process.exit(1);
  }

  // Step 2 — Normalize Email
  const adminEmail = rawEmail.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(adminEmail)) {
    console.error(`[BOOTSTRAP_ERROR] Invalid email format: "${adminEmail}". Aborting.`);
    process.exit(1);
  }

  if (rawPassword.length < 6) {
    console.error('[BOOTSTRAP_ERROR] BOOTSTRAP_ADMIN_PASSWORD must be at least 6 characters. Aborting.');
    process.exit(1);
  }

  try {
    // Step 3 — Find Existing User
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    // Step 4 — Handle Existing User (Idempotency & Conflict Check)
    if (existingUser) {
      if (existingUser.role === Role.SYSTEM_ADMIN) {
        console.log(`[BOOTSTRAP_ALREADY_EXISTS] System Admin account (${adminEmail}) already exists.`);
        console.log(`[BOOTSTRAP_INFO] User ID: ${existingUser.id} | Role: ${existingUser.role} | Active: ${existingUser.isActive}`);
        console.log('[BOOTSTRAP_SUCCESS] Idempotent run completed without changes.');
        return;
      } else {
        console.error(
          `[BOOTSTRAP_CONFLICT] Account with email (${adminEmail}) already exists with a different role (${existingUser.role}). Cannot overwrite or promote to SYSTEM_ADMIN.`
        );
        process.exit(1);
      }
    }

    // Step 5 — Create System Admin
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const createdAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        fullName: 'System Administrator',
        passwordHash,
        role: Role.SYSTEM_ADMIN,
        isVerified: true,
        isActive: true,
        avatarUrl: null,
        phone: null,
      },
    });

    // Step 6 — Verify Result
    console.log('[BOOTSTRAP_SUCCESS] Successfully created initial System Admin account:');
    console.log(`  - User ID:     ${createdAdmin.id}`);
    console.log(`  - Email:       ${createdAdmin.email}`);
    console.log(`  - Full Name:   ${createdAdmin.fullName}`);
    console.log(`  - Role:        ${createdAdmin.role}`);
    console.log(`  - isVerified:  ${createdAdmin.isVerified}`);
    console.log(`  - isActive:    ${createdAdmin.isActive}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BOOTSTRAP_ERROR] Failed to seed System Admin:', message);
    process.exit(1);
  } finally {
    // Step 7 — Cleanup Prisma connection
    await prisma.$disconnect();
  }
}

seedAdmin();
