#!/usr/bin/env node
/**
 * Grant Super Admin Access Script
 *
 * Usage: node scripts/grant-super-admin.js <email>
 * Example: node scripts/grant-super-admin.js freddie@effingerlaw.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// All permissions in the system
const ALL_PERMISSIONS = [
  // Charges
  'CHARGES_VIEW', 'CHARGES_CREATE', 'CHARGES_EDIT', 'CHARGES_DELETE', 'CHARGES_AUDIT',
  // Claims
  'CLAIMS_VIEW', 'CLAIMS_CREATE', 'CLAIMS_SUBMIT', 'CLAIMS_EDIT', 'CLAIMS_VOID',
  // Payments
  'PAYMENTS_VIEW', 'PAYMENTS_POST', 'PAYMENTS_ADJUST', 'PAYMENTS_WRITE_OFF', 'PAYMENTS_RECONCILE',
  // Collections
  'COLLECTIONS_VIEW', 'COLLECTIONS_MANAGE', 'COLLECTIONS_AGENCY_ASSIGN',
  // Patients
  'PATIENTS_VIEW', 'PATIENTS_CREATE', 'PATIENTS_EDIT', 'PATIENTS_PHI_ACCESS',
  // Payers
  'PAYERS_VIEW', 'PAYERS_MANAGE', 'PAYERS_CONTRACTS',
  // Reports
  'REPORTS_VIEW', 'REPORTS_EXPORT', 'REPORTS_ADMIN',
  // Compliance
  'COMPLIANCE_VIEW', 'COMPLIANCE_MANAGE',
  // Admin
  'ADMIN_USERS', 'ADMIN_ROLES', 'ADMIN_SETTINGS', 'ADMIN_AUDIT_LOGS',
];

async function grantSuperAdmin(email) {
  console.log(`\n🔐 Granting SUPER_ADMIN access to: ${email}\n`);

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true },
  });

  if (!user) {
    console.error(`❌ User not found: ${email}`);
    console.log('\nAvailable users:');
    const users = await prisma.user.findMany({ select: { email: true, name: true } });
    users.forEach(u => console.log(`   - ${u.email} (${u.name || 'no name'})`));
    process.exit(1);
  }

  console.log(`✓ Found user: ${user.name || user.email}`);
  console.log(`  Organization: ${user.organization?.name || 'None'}`);

  // Update user's legacy role to ADMIN
  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'ADMIN',
      showDemoData: true, // Enable demo data view
    },
  });
  console.log('✓ Set legacy role to ADMIN');

  // Ensure SUPER_ADMIN role exists
  let superAdminRole = await prisma.role.findUnique({
    where: { name: 'SUPER_ADMIN' },
  });

  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        name: 'SUPER_ADMIN',
        description: 'Full system access with all permissions',
        permissions: ALL_PERMISSIONS,
        inheritsFrom: [],
        departmentRestricted: false,
        isSystem: true,
        isActive: true,
      },
    });
    console.log('✓ Created SUPER_ADMIN role');
  } else {
    // Update to ensure all permissions
    await prisma.role.update({
      where: { name: 'SUPER_ADMIN' },
      data: { permissions: ALL_PERMISSIONS },
    });
    console.log('✓ Updated SUPER_ADMIN role permissions');
  }

  // Assign role to user
  const existingUserRole = await prisma.userRole.findUnique({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    },
  });

  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: superAdminRole.id,
        assignedBy: 'grant-super-admin-script',
      },
    });
    console.log('✓ Assigned SUPER_ADMIN role to user');
  } else {
    console.log('✓ User already has SUPER_ADMIN role');
  }

  // Ensure user has access to all departments
  const departments = await prisma.department.findMany();
  if (departments.length > 0) {
    for (const dept of departments) {
      const existing = await prisma.userDepartment.findUnique({
        where: {
          userId_departmentId: {
            userId: user.id,
            departmentId: dept.id,
          },
        },
      });
      if (!existing) {
        await prisma.userDepartment.create({
          data: {
            userId: user.id,
            departmentId: dept.id,
            isPrimary: dept.code === 'ADMIN',
          },
        });
      }
    }
    console.log(`✓ Assigned to ${departments.length} departments`);
  }

  // Enable all features for user's organization if they have one
  if (user.organizationId) {
    const whiteLabelConfig = await prisma.whiteLabelConfig.findUnique({
      where: { organizationId: user.organizationId },
    });

    if (whiteLabelConfig) {
      await prisma.whiteLabelConfig.update({
        where: { organizationId: user.organizationId },
        data: {
          features: {
            assessments: true,
            batchImport: true,
            sftpIntegration: true,
            aiAssessment: true,
            eligibilityChecks: true,
            claimSubmission: true,
            eraProcessing: true,
            collections: true,
            patientPortal: true,
            analytics: true,
            compliance501r: true,
            workflowRules: true,
            productivity: true,
            priceTransparency: true,
          },
        },
      });
      console.log('✓ Enabled all features for organization');
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ SUPER_ADMIN access granted successfully!');
  console.log('='.repeat(50));
  console.log(`\n👑 ${email} now has:`);
  console.log(`   - ${ALL_PERMISSIONS.length} permissions`);
  console.log('   - Access to all departments');
  console.log('   - All features enabled');
  console.log('\n');
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/grant-super-admin.js <email>');
  console.log('Example: node scripts/grant-super-admin.js freddie@effingerlaw.com');
  process.exit(1);
}

grantSuperAdmin(email)
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
