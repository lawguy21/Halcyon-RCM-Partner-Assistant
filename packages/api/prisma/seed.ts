/**
 * Prisma Seed File
 * Populates the database with initial sample data for development/testing
 *
 * Run with: npm run db:seed
 */

import { PrismaClient, UserRole, AssessmentStatus, ImportStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clean up existing data (optional - comment out in production)
  console.log('Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.importHistory.deleteMany();
  await prisma.customPreset.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Create Organizations
  console.log('Creating organizations...');
  const hospital1 = await prisma.organization.create({
    data: {
      name: 'Memorial General Hospital',
      type: 'hospital',
      settings: {
        defaultFacilityState: 'CA',
        defaultFacilityType: 'acute_care',
        enableDSHTracking: true,
      },
    },
  });

  const hospital2 = await prisma.organization.create({
    data: {
      name: 'Community Health Center',
      type: 'hospital',
      settings: {
        defaultFacilityState: 'TX',
        defaultFacilityType: 'community',
        enableDSHTracking: true,
      },
    },
  });

  const rcmVendor = await prisma.organization.create({
    data: {
      name: 'RCM Solutions Inc',
      type: 'rcm_vendor',
      settings: {
        multiTenant: true,
        clientLimit: 50,
      },
    },
  });

  // Create Users
  console.log('Creating users...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@halcyon.health',
      name: 'System Administrator',
      role: UserRole.ADMIN,
      organizationId: rcmVendor.id,
    },
  });

  const hospitalUser1 = await prisma.user.create({
    data: {
      email: 'billing@memorialgeneral.org',
      name: 'Jane Smith',
      role: UserRole.USER,
      organizationId: hospital1.id,
    },
  });

  const hospitalUser2 = await prisma.user.create({
    data: {
      email: 'finance@communityhealth.org',
      name: 'John Doe',
      role: UserRole.USER,
      organizationId: hospital2.id,
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@memorialgeneral.org',
      name: 'Sarah Johnson',
      role: UserRole.VIEWER,
      organizationId: hospital1.id,
    },
  });

  // Create Custom Presets
  console.log('Creating custom presets...');
  const epicPreset = await prisma.customPreset.create({
    data: {
      name: 'Epic EHR Export',
      vendor: 'Epic',
      description: 'Standard Epic EHR patient financial export format',
      organizationId: hospital1.id,
      mappings: [
        { sourceColumn: 'PAT_MRN', targetField: 'mrn', required: true },
        { sourceColumn: 'ACCOUNT_NUM', targetField: 'accountNumber', required: true },
        { sourceColumn: 'PAT_FIRST_NAME', targetField: 'patientFirstName', required: false },
        { sourceColumn: 'PAT_LAST_NAME', targetField: 'patientLastName', required: false },
        { sourceColumn: 'DOB', targetField: 'patientDob', required: false },
        { sourceColumn: 'ADMIT_DATE', targetField: 'admissionDate', required: false },
        { sourceColumn: 'DISCHARGE_DATE', targetField: 'dischargeDate', required: false },
        { sourceColumn: 'TOTAL_CHARGES', targetField: 'totalCharges', required: true },
        { sourceColumn: 'PAT_TYPE', targetField: 'encounterType', required: true },
        { sourceColumn: 'INS_STATUS', targetField: 'insuranceStatusOnDos', required: true },
        { sourceColumn: 'STATE', targetField: 'facilityState', required: true },
      ],
      dateFormat: 'YYYY-MM-DD',
      currencyFormat: 'decimal',
      delimiter: ',',
      skipHeaderRows: 1,
      usageCount: 15,
      lastUsedAt: new Date(),
    },
  });

  const cernerPreset = await prisma.customPreset.create({
    data: {
      name: 'Cerner Export',
      vendor: 'Cerner',
      description: 'Standard Cerner patient financial data export',
      organizationId: hospital2.id,
      mappings: [
        { sourceColumn: 'MRN', targetField: 'mrn', required: true },
        { sourceColumn: 'Acct', targetField: 'accountNumber', required: true },
        { sourceColumn: 'FirstName', targetField: 'patientFirstName', required: false },
        { sourceColumn: 'LastName', targetField: 'patientLastName', required: false },
        { sourceColumn: 'DateOfBirth', targetField: 'patientDob', required: false },
        { sourceColumn: 'AdmitDt', targetField: 'admissionDate', required: false },
        { sourceColumn: 'DischargeDt', targetField: 'dischargeDate', required: false },
        { sourceColumn: 'TotalChg', targetField: 'totalCharges', required: true },
        { sourceColumn: 'EncType', targetField: 'encounterType', required: true },
        { sourceColumn: 'Coverage', targetField: 'insuranceStatusOnDos', required: true },
        { sourceColumn: 'FacState', targetField: 'facilityState', required: true },
      ],
      dateFormat: 'MM/DD/YYYY',
      currencyFormat: 'decimal',
      delimiter: ',',
      skipHeaderRows: 1,
      usageCount: 8,
      lastUsedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    },
  });

  // Create Import History
  console.log('Creating import history...');
  const import1 = await prisma.importHistory.create({
    data: {
      filename: 'memorial_batch_20240115.csv',
      originalName: 'Q4_2023_Uncompensated_Care.csv',
      fileSize: 245678,
      mimeType: 'text/csv',
      presetUsed: epicPreset.id,
      presetName: epicPreset.name,
      totalRows: 150,
      processedRows: 150,
      successfulRows: 145,
      failedRows: 3,
      skippedRows: 2,
      errors: [
        { row: 45, field: 'totalCharges', message: 'Invalid currency format' },
        { row: 89, field: 'encounterType', message: 'Unknown encounter type: UNKNOWN' },
        { row: 134, field: 'admissionDate', message: 'Date parsing failed' },
      ],
      warnings: [
        { row: 12, message: 'Missing optional field: patientDob' },
        { row: 67, message: 'Missing optional field: dischargeDate' },
      ],
      status: ImportStatus.COMPLETED,
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45000),
      userId: hospitalUser1.id,
      organizationId: hospital1.id,
    },
  });

  // Create Sample Assessments
  console.log('Creating sample assessments...');
  const assessments = [
    {
      accountNumber: 'ACC-2024-001234',
      mrn: 'MRN-789456',
      patientFirstName: 'Robert',
      patientLastName: 'Williams',
      patientDob: new Date('1965-03-15'),
      patientState: 'CA',
      encounterType: 'inpatient',
      admissionDate: new Date('2024-01-05'),
      dischargeDate: new Date('2024-01-12'),
      lengthOfStay: 7,
      totalCharges: 45678.50,
      facilityState: 'CA',
      facilityType: 'acute_care',
      insuranceStatusOnDos: 'uninsured',
      medicaidStatus: 'not_enrolled',
      disabilityLikelihood: 'high',
      ssiEligibilityLikely: true,
      primaryRecoveryPath: 'medicaid_retroactive',
      overallConfidence: 85,
      estimatedTotalRecovery: 38000.00,
      medicaidResultStatus: 'likely_eligible',
      medicaidResultConfidence: 88,
      medicaidResultPathway: 'magi_based',
      medicaidResultActions: ['Submit application', 'Gather income documentation', 'Verify identity'],
      medicaidEstimatedRecovery: 38000.00,
      dshRelevance: 'high',
      dshScore: 92,
      dshAuditReadiness: 'ready',
      dshFactors: { uncompensated: true, lowIncome: true, documentationComplete: true },
      priorityActions: ['Complete Medicaid application', 'Collect disability documentation'],
      immediateActions: ['Verify patient contact information', 'Schedule financial counseling'],
      status: AssessmentStatus.COMPLETED,
      userId: hospitalUser1.id,
      organizationId: hospital1.id,
      importId: import1.id,
      tags: ['high-priority', 'medicaid-eligible', 'dsh-relevant'],
    },
    {
      accountNumber: 'ACC-2024-001235',
      mrn: 'MRN-789457',
      patientFirstName: 'Maria',
      patientLastName: 'Garcia',
      patientDob: new Date('1978-08-22'),
      patientState: 'CA',
      encounterType: 'outpatient',
      admissionDate: new Date('2024-01-08'),
      dischargeDate: new Date('2024-01-08'),
      lengthOfStay: 0,
      totalCharges: 12450.00,
      facilityState: 'CA',
      facilityType: 'acute_care',
      insuranceStatusOnDos: 'underinsured',
      medicaidStatus: 'pending',
      householdIncome: '25000-35000',
      householdSize: 4,
      primaryRecoveryPath: 'medicaid_expansion',
      overallConfidence: 72,
      estimatedTotalRecovery: 10500.00,
      medicaidResultStatus: 'likely_eligible',
      medicaidResultConfidence: 75,
      medicaidResultPathway: 'expansion',
      medicaidEstimatedRecovery: 10500.00,
      stateProgramArchetype: 'expansion_state',
      stateProgramName: 'Medi-Cal',
      stateProgramConfidence: 80,
      stateProgramEligible: true,
      dshRelevance: 'medium',
      dshScore: 68,
      status: AssessmentStatus.IN_PROGRESS,
      userId: hospitalUser1.id,
      organizationId: hospital1.id,
      importId: import1.id,
      tags: ['medicaid-pending', 'state-program'],
    },
    {
      accountNumber: 'ACC-2024-001236',
      mrn: 'MRN-789458',
      patientFirstName: 'James',
      patientLastName: 'Thompson',
      patientDob: new Date('1948-12-03'),
      patientState: 'TX',
      encounterType: 'ed',
      admissionDate: new Date('2024-01-10'),
      dischargeDate: new Date('2024-01-10'),
      lengthOfStay: 0,
      totalCharges: 8900.00,
      facilityState: 'TX',
      facilityType: 'community',
      insuranceStatusOnDos: 'medicare',
      medicareStatus: 'enrolled',
      primaryRecoveryPath: 'medicare_secondary',
      overallConfidence: 95,
      estimatedTotalRecovery: 7500.00,
      medicareResultStatus: 'covered',
      medicareResultConfidence: 95,
      dshRelevance: 'low',
      dshScore: 25,
      status: AssessmentStatus.COMPLETED,
      userId: hospitalUser2.id,
      organizationId: hospital2.id,
      tags: ['medicare', 'ed-visit'],
    },
    {
      accountNumber: 'ACC-2024-001237',
      mrn: 'MRN-789459',
      patientFirstName: 'Lisa',
      patientLastName: 'Anderson',
      patientDob: new Date('1985-05-18'),
      patientState: 'TX',
      encounterType: 'inpatient',
      admissionDate: new Date('2024-01-02'),
      dischargeDate: new Date('2024-01-15'),
      lengthOfStay: 13,
      totalCharges: 125000.00,
      facilityState: 'TX',
      facilityType: 'community',
      insuranceStatusOnDos: 'uninsured',
      disabilityLikelihood: 'medium',
      ssdiEligibilityLikely: true,
      primaryRecoveryPath: 'disability_pathway',
      overallConfidence: 65,
      estimatedTotalRecovery: 85000.00,
      medicaidResultStatus: 'requires_review',
      medicaidResultConfidence: 55,
      dshRelevance: 'high',
      dshScore: 88,
      dshAuditReadiness: 'needs_documentation',
      dshFactors: { uncompensated: true, highCharges: true, extendedStay: true },
      priorityActions: ['Disability assessment', 'Financial screening', 'Contact patient'],
      documentationNeeded: ['Income verification', 'Disability documentation', 'Residency proof'],
      status: AssessmentStatus.PENDING,
      userId: hospitalUser2.id,
      organizationId: hospital2.id,
      tags: ['high-value', 'disability-review', 'urgent'],
    },
  ];

  for (const assessmentData of assessments) {
    await prisma.assessment.create({
      data: assessmentData,
    });
  }

  // Create Audit Log entries
  console.log('Creating audit log entries...');
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'CREATE',
        entityType: 'Organization',
        entityId: hospital1.id,
        userId: adminUser.id,
        details: { name: hospital1.name, type: hospital1.type },
      },
      {
        action: 'CREATE',
        entityType: 'User',
        entityId: hospitalUser1.id,
        userId: adminUser.id,
        details: { email: hospitalUser1.email, role: hospitalUser1.role },
      },
      {
        action: 'IMPORT',
        entityType: 'ImportHistory',
        entityId: import1.id,
        userId: hospitalUser1.id,
        details: { filename: import1.filename, totalRows: import1.totalRows },
      },
      {
        action: 'CREATE',
        entityType: 'CustomPreset',
        entityId: epicPreset.id,
        userId: hospitalUser1.id,
        details: { name: epicPreset.name, vendor: epicPreset.vendor },
      },
    ],
  });

  console.log('Seed completed successfully!');
  console.log({
    organizations: 3,
    users: 4,
    presets: 2,
    imports: 1,
    assessments: assessments.length,
    auditLogs: 4,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
