#!/usr/bin/env node
/**
 * Clear all data from the database
 * Run with: node scripts/clear-data.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllData() {
  console.log('=== Clearing all data from database ===\n');

  // Order matters due to foreign key constraints
  // Delete child tables first, then parent tables
  const tables = [
    // Audit and logs
    'auditLog',
    'accessAudit',
    'sftpSyncLog',
    'ruleExecution',
    'predictionLog',
    'kpiSnapshot',

    // Work items and activities
    'workQueueItem',
    'timeEntry',
    'workActivity',

    // Claims and payments
    'writeOff',
    'payment',
    'claimPayment',
    'paymentRemittance',
    'depositReconciliation',
    'claimStatusHistory',
    'claimSubmission',
    'chargeAudit',
    'charge',
    'appeal',
    'denial',
    'claim',

    // Collections
    'collectionAction',
    'promiseToPay',
    'collectionAccount',
    'collectionPatient',
    'collectionAgency',

    // Compliance
    'complianceNotice',
    'communication',

    // Recovery and assessments
    'recoveryAccount',
    'assessment',
    'importHistory',

    // Transparency
    'priceEstimate',
    'machineReadableFile',

    // SSI
    'ssiAssessment',

    // Payers and contracts
    'authRequirement',
    'contractCarveOut',
    'feeScheduleEntry',
    'contract',
    'payer',

    // Workflow
    'workflowRule',

    // Productivity
    'productivityGoal',

    // Presets
    'customPreset',

    // SFTP
    'sftpConnection',

    // RBAC (be careful with these)
    'userDepartment',
    'userRole',
    // Keep roles and departments for system function
    // 'role',
    // 'department',

    // White label and domains
    'whiteLabelConfig',
    'organizationDomain',

    // Don't delete users and organizations to keep login working
    // 'user',
    // 'organization',
  ];

  for (const table of tables) {
    try {
      const result = await prisma[table].deleteMany({});
      console.log(`✓ Cleared ${table}: ${result.count} records deleted`);
    } catch (error) {
      if (error.code === 'P2021') {
        console.log(`- Skipped ${table}: table does not exist`);
      } else {
        console.log(`✗ Error clearing ${table}: ${error.message}`);
      }
    }
  }

  console.log('\n=== Data cleared successfully ===');
  console.log('Note: Users and Organizations were preserved to keep logins working.');
  console.log('To also clear users, run: npx prisma db push --force-reset');
}

clearAllData()
  .catch((e) => {
    console.error('Failed to clear data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
