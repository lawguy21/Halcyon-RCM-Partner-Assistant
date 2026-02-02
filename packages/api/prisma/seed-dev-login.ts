/**
 * Development Login Seed Script
 * Creates a super admin user with all permissions for development/testing
 *
 * Run with: npx ts-node prisma/seed-dev-login.ts
 * Or: npm run db:seed:dev (after adding script to package.json)
 *
 * Login credentials:
 *   Email: dev@halcyon.health
 *   Password: devpassword123
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// All permissions in the system
const ALL_PERMISSIONS = [
  // Charges
  'CHARGES_VIEW',
  'CHARGES_CREATE',
  'CHARGES_EDIT',
  'CHARGES_DELETE',
  'CHARGES_AUDIT',
  // Claims
  'CLAIMS_VIEW',
  'CLAIMS_CREATE',
  'CLAIMS_SUBMIT',
  'CLAIMS_EDIT',
  'CLAIMS_VOID',
  // Payments
  'PAYMENTS_VIEW',
  'PAYMENTS_POST',
  'PAYMENTS_ADJUST',
  'PAYMENTS_WRITE_OFF',
  'PAYMENTS_RECONCILE',
  // Collections
  'COLLECTIONS_VIEW',
  'COLLECTIONS_MANAGE',
  'COLLECTIONS_AGENCY_ASSIGN',
  // Patients
  'PATIENTS_VIEW',
  'PATIENTS_CREATE',
  'PATIENTS_EDIT',
  'PATIENTS_PHI_ACCESS',
  // Payers
  'PAYERS_VIEW',
  'PAYERS_MANAGE',
  'PAYERS_CONTRACTS',
  // Reports
  'REPORTS_VIEW',
  'REPORTS_EXPORT',
  'REPORTS_ADMIN',
  // Compliance
  'COMPLIANCE_VIEW',
  'COMPLIANCE_MANAGE',
  // Admin
  'ADMIN_USERS',
  'ADMIN_ROLES',
  'ADMIN_SETTINGS',
  'ADMIN_AUDIT_LOGS',
];

async function main() {
  console.log('🚀 Creating development super admin login...\n');

  const DEV_EMAIL = 'dev@halcyon.health';
  const DEV_PASSWORD = 'devpassword123';
  const DEV_NAME = 'Dev Super Admin';

  // Hash the password with bcrypt (12 rounds, same as auth controller)
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  // Check if dev organization exists, create if not
  let devOrg = await prisma.organization.findFirst({
    where: { name: 'Development Organization' },
  });

  if (!devOrg) {
    console.log('📦 Creating development organization...');
    devOrg = await prisma.organization.create({
      data: {
        name: 'Development Organization',
        type: 'development',
        settings: {
          isDevelopment: true,
          allFeaturesEnabled: true,
        },
      },
    });
    console.log(`   ✓ Created organization: ${devOrg.name} (${devOrg.id})`);
  } else {
    console.log(`📦 Using existing organization: ${devOrg.name}`);
  }

  // Create white-label config for dev org if it doesn't exist
  const existingWhiteLabel = await prisma.whiteLabelConfig.findUnique({
    where: { organizationId: devOrg.id },
  });

  if (!existingWhiteLabel) {
    await prisma.whiteLabelConfig.create({
      data: {
        organizationId: devOrg.id,
        brandName: 'Halcyon RCM (Dev)',
        primaryColor: '#10b981', // Green to indicate dev mode
        secondaryColor: '#059669',
        supportEmail: 'dev@halcyon.health',
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
    console.log('   ✓ Created white-label config with all features enabled');
  }

  // Check if the SUPER_ADMIN role exists in the Role table
  let superAdminRole = await prisma.role.findUnique({
    where: { name: 'SUPER_ADMIN' },
  });

  if (!superAdminRole) {
    console.log('\n🔐 Creating SUPER_ADMIN role...');
    superAdminRole = await prisma.role.create({
      data: {
        name: 'SUPER_ADMIN',
        description: 'Full system access with all permissions including system configuration',
        permissions: ALL_PERMISSIONS,
        inheritsFrom: [],
        departmentRestricted: false,
        isSystem: true,
        isActive: true,
      },
    });
    console.log(`   ✓ Created role: SUPER_ADMIN with ${ALL_PERMISSIONS.length} permissions`);
  } else {
    // Update permissions if role exists
    superAdminRole = await prisma.role.update({
      where: { name: 'SUPER_ADMIN' },
      data: {
        permissions: ALL_PERMISSIONS,
        isActive: true,
      },
    });
    console.log(`\n🔐 Updated SUPER_ADMIN role with ${ALL_PERMISSIONS.length} permissions`);
  }

  // Create or update the dev user
  let devUser = await prisma.user.findUnique({
    where: { email: DEV_EMAIL },
  });

  if (!devUser) {
    console.log('\n👤 Creating dev super admin user...');
    devUser = await prisma.user.create({
      data: {
        email: DEV_EMAIL,
        name: DEV_NAME,
        passwordHash: passwordHash,
        role: 'ADMIN', // Legacy role field
        organizationId: devOrg.id,
      },
    });
    console.log(`   ✓ Created user: ${DEV_EMAIL}`);
  } else {
    console.log('\n👤 Updating existing dev user...');
    devUser = await prisma.user.update({
      where: { email: DEV_EMAIL },
      data: {
        name: DEV_NAME,
        passwordHash: passwordHash,
        role: 'ADMIN',
        organizationId: devOrg.id,
      },
    });
    console.log(`   ✓ Updated user: ${DEV_EMAIL}`);
  }

  // Assign SUPER_ADMIN role to dev user via UserRole junction table
  const existingUserRole = await prisma.userRole.findUnique({
    where: {
      userId_roleId: {
        userId: devUser.id,
        roleId: superAdminRole.id,
      },
    },
  });

  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: devUser.id,
        roleId: superAdminRole.id,
        assignedBy: 'system-seed',
      },
    });
    console.log('   ✓ Assigned SUPER_ADMIN role to dev user');
  } else {
    console.log('   ✓ SUPER_ADMIN role already assigned');
  }

  // Create all departments if they don't exist
  const departments = [
    { name: 'Billing', code: 'BILLING', description: 'Billing and charge entry department' },
    { name: 'Coding', code: 'CODING', description: 'Medical coding department' },
    { name: 'Collections', code: 'COLLECTIONS', description: 'Patient collections department' },
    { name: 'Financial Counseling', code: 'FINANCIAL_COUNSELING', description: 'Patient financial assistance' },
    { name: 'Compliance', code: 'COMPLIANCE', description: 'Regulatory compliance department' },
    { name: 'Administration', code: 'ADMIN', description: 'System administration' },
  ];

  console.log('\n🏢 Creating departments...');
  for (const dept of departments) {
    const existing = await prisma.department.findUnique({ where: { code: dept.code } });
    if (!existing) {
      await prisma.department.create({ data: dept });
      console.log(`   ✓ Created department: ${dept.name}`);
    }
  }

  // Assign dev user to all departments
  console.log('\n📋 Assigning dev user to all departments...');
  const allDepts = await prisma.department.findMany();
  for (const dept of allDepts) {
    const existingAssignment = await prisma.userDepartment.findUnique({
      where: {
        userId_departmentId: {
          userId: devUser.id,
          departmentId: dept.id,
        },
      },
    });
    if (!existingAssignment) {
      await prisma.userDepartment.create({
        data: {
          userId: devUser.id,
          departmentId: dept.id,
          isPrimary: dept.code === 'ADMIN',
        },
      });
    }
  }
  console.log(`   ✓ Assigned to ${allDepts.length} departments`);

  // Log the creation
  await prisma.auditLog.create({
    data: {
      action: 'DEV_SEED',
      entityType: 'User',
      entityId: devUser.id,
      userId: devUser.id,
      details: {
        message: 'Development super admin created via seed script',
        permissions: ALL_PERMISSIONS.length,
        departments: allDepts.length,
      },
    },
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ Development login created successfully!\n');
  console.log('📧 Email:    dev@halcyon.health');
  console.log('🔑 Password: devpassword123');
  console.log('👑 Role:     SUPER_ADMIN (all permissions)');
  console.log('🏢 Org:      Development Organization');
  console.log('🏷️  Features: All enabled');
  console.log('='.repeat(60));
  console.log('\n⚠️  WARNING: This is for development only!');
  console.log('   Do not use these credentials in production.\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
