#!/usr/bin/env node
/**
 * Setup Admin User Script
 * This script runs during deployment to ensure the admin user exists
 * with the correct password and permissions.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Configuration - Admin users to set up
const ADMIN_USERS = [
  {
    email: 'freddie@effingerlaw.com',
    password: 'Sephir0t2021!',
    name: 'Freddie Effinger',
  },
  {
    email: 'naomi@effingerlaw.com',
    password: 'NaomiRocks2026!',
    name: 'Naomi Effinger',
  },
];

// All permissions in the system
const ALL_PERMISSIONS = [
  'CHARGES_VIEW', 'CHARGES_CREATE', 'CHARGES_EDIT', 'CHARGES_DELETE', 'CHARGES_AUDIT',
  'CLAIMS_VIEW', 'CLAIMS_CREATE', 'CLAIMS_SUBMIT', 'CLAIMS_EDIT', 'CLAIMS_VOID',
  'PAYMENTS_VIEW', 'PAYMENTS_POST', 'PAYMENTS_ADJUST', 'PAYMENTS_WRITE_OFF', 'PAYMENTS_RECONCILE',
  'COLLECTIONS_VIEW', 'COLLECTIONS_MANAGE', 'COLLECTIONS_AGENCY_ASSIGN',
  'PATIENTS_VIEW', 'PATIENTS_CREATE', 'PATIENTS_EDIT', 'PATIENTS_PHI_ACCESS',
  'PAYERS_VIEW', 'PAYERS_MANAGE', 'PAYERS_CONTRACTS',
  'REPORTS_VIEW', 'REPORTS_EXPORT', 'REPORTS_ADMIN',
  'COMPLIANCE_VIEW', 'COMPLIANCE_MANAGE',
  'ADMIN_USERS', 'ADMIN_ROLES', 'ADMIN_SETTINGS', 'ADMIN_AUDIT_LOGS',
];

async function setupAdminUsers() {
  console.log('🔧 Setting up admin users...\n');

  try {
    // Check if organization exists, create if not
    let org = await prisma.organization.findFirst({
      where: { name: 'Effinger Law' },
    });

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'Effinger Law',
          type: 'law_firm',
          settings: { allFeaturesEnabled: true },
        },
      });
      console.log('✓ Created organization: Effinger Law');
    }

    // Create white-label config if not exists
    const existingWhiteLabel = await prisma.whiteLabelConfig.findUnique({
      where: { organizationId: org.id },
    });

    if (!existingWhiteLabel) {
      await prisma.whiteLabelConfig.create({
        data: {
          organizationId: org.id,
          brandName: 'Halcyon RCM',
          primaryColor: '#2563eb',
          secondaryColor: '#1e40af',
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
      console.log('✓ Created white-label config with all features');
    }

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
      await prisma.role.update({
        where: { name: 'SUPER_ADMIN' },
        data: { permissions: ALL_PERMISSIONS },
      });
      console.log('✓ Updated SUPER_ADMIN role permissions');
    }

    // Create departments if needed
    const departments = [
      { name: 'Billing', code: 'BILLING', description: 'Billing department' },
      { name: 'Administration', code: 'ADMIN', description: 'System administration' },
    ];

    for (const dept of departments) {
      const existing = await prisma.department.findUnique({ where: { code: dept.code } });
      if (!existing) {
        await prisma.department.create({ data: dept });
      }
    }

    const adminDept = await prisma.department.findUnique({ where: { code: 'ADMIN' } });

    // Set up each admin user
    for (const adminConfig of ADMIN_USERS) {
      console.log(`\n👤 Setting up: ${adminConfig.email}`);

      // Hash the password
      const passwordHash = await bcrypt.hash(adminConfig.password, 12);

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email: adminConfig.email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: adminConfig.email,
            name: adminConfig.name,
            passwordHash: passwordHash,
            role: 'ADMIN',
            organizationId: org.id,
            showDemoData: true,
          },
        });
        console.log(`   ✓ Created user: ${adminConfig.email}`);
      } else {
        user = await prisma.user.update({
          where: { email: adminConfig.email },
          data: {
            name: adminConfig.name,
            passwordHash: passwordHash,
            role: 'ADMIN',
            organizationId: org.id,
            showDemoData: true,
          },
        });
        console.log(`   ✓ Updated user: ${adminConfig.email}`);
      }

      // Assign SUPER_ADMIN role
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
            assignedBy: 'setup-script',
          },
        });
        console.log('   ✓ Assigned SUPER_ADMIN role');
      }

      // Assign to admin department
      if (adminDept) {
        const existingAssignment = await prisma.userDepartment.findUnique({
          where: {
            userId_departmentId: {
              userId: user.id,
              departmentId: adminDept.id,
            },
          },
        });
        if (!existingAssignment) {
          await prisma.userDepartment.create({
            data: {
              userId: user.id,
              departmentId: adminDept.id,
              isPrimary: true,
            },
          });
        }
      }
    }

    console.log('\n✅ All admin users setup complete!');
    console.log('   Users configured:');
    ADMIN_USERS.forEach(u => console.log(`   - ${u.email}`));
    console.log('   Role: SUPER_ADMIN (all permissions)');

  } catch (error) {
    console.error('Setup error:', error.message);
    // Don't exit with error - let the app continue starting
  } finally {
    await prisma.$disconnect();
  }
}

setupAdminUsers();
