#!/usr/bin/env node
/**
 * Set User Password Script
 *
 * Usage: node scripts/set-password.js <email> <password>
 * Example: node scripts/set-password.js freddie@effingerlaw.com MyNewPassword123!
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setPassword(email, password) {
  console.log(`\n🔐 Setting password for: ${email}\n`);

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`❌ User not found: ${email}`);
    console.log('\nAvailable users:');
    const users = await prisma.user.findMany({ select: { email: true, name: true } });
    users.forEach(u => console.log(`   - ${u.email} (${u.name || 'no name'})`));
    process.exit(1);
  }

  // Hash the password (12 rounds, same as auth controller)
  const passwordHash = await bcrypt.hash(password, 12);

  // Update the user's password
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log('✅ Password updated successfully!');
  console.log(`\n📧 Email: ${email}`);
  console.log('🔑 Password: [set to your specified password]');
  console.log('\nYou can now log in with these credentials.\n');
}

// Get arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node scripts/set-password.js <email> <password>');
  console.log('Example: node scripts/set-password.js user@example.com MyPassword123!');
  process.exit(1);
}

setPassword(email, password)
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
