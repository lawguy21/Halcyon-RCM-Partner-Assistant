/**
 * Halcyon RCM Partner Assistant - Default Mapping Presets
 *
 * Pre-configured mapping presets for common vendor formats.
 */

import { MappingPreset } from '../types';

/**
 * Generic Self-Pay Export Preset
 * Common column names used across many systems
 */
export const GENERIC_SELF_PAY_PRESET: MappingPreset = {
  id: 'generic-self-pay',
  name: 'Generic Self-Pay Export',
  vendor: 'Generic',
  description: 'Common column names for self-pay accounts (Account, MRN, Patient Name, DOB, Charges, etc.)',
  dateFormat: 'MM/DD/YYYY',
  currencyFormat: 'decimal',
  skipHeaderRows: 0,
  delimiter: ',',
  mappings: [
    { sourceColumn: 'Account', targetField: 'accountNumber', required: true },
    { sourceColumn: 'Account Number', targetField: 'accountNumber', required: true },
    { sourceColumn: 'MRN', targetField: 'mrn', required: false },
    { sourceColumn: 'Medical Record Number', targetField: 'mrn', required: false },
    { sourceColumn: 'Patient Name', targetField: 'patientFullName', required: false },
    { sourceColumn: 'Patient First Name', targetField: 'patientFirstName', required: false },
    { sourceColumn: 'First Name', targetField: 'patientFirstName', required: false },
    { sourceColumn: 'Patient Last Name', targetField: 'patientLastName', required: false },
    { sourceColumn: 'Last Name', targetField: 'patientLastName', required: false },
    { sourceColumn: 'DOB', targetField: 'dateOfBirth', transform: 'date', required: false },
    { sourceColumn: 'Date of Birth', targetField: 'dateOfBirth', transform: 'date', required: false },
    { sourceColumn: 'DOS', targetField: 'dateOfService', transform: 'date', required: false },
    { sourceColumn: 'Date of Service', targetField: 'dateOfService', transform: 'date', required: false },
    { sourceColumn: 'Service Date', targetField: 'dateOfService', transform: 'date', required: false },
    { sourceColumn: 'Charges', targetField: 'totalCharges', transform: 'currency', required: false },
    { sourceColumn: 'Total Charges', targetField: 'totalCharges', transform: 'currency', required: false },
    { sourceColumn: 'Payments', targetField: 'totalPayments', transform: 'currency', required: false },
    { sourceColumn: 'Total Payments', targetField: 'totalPayments', transform: 'currency', required: false },
    { sourceColumn: 'Balance', targetField: 'balance', transform: 'currency', required: false },
    { sourceColumn: 'Account Balance', targetField: 'balance', transform: 'currency', required: false },
    { sourceColumn: 'Self Pay Balance', targetField: 'selfPayBalance', transform: 'currency', required: false },
    { sourceColumn: 'Patient Balance', targetField: 'selfPayBalance', transform: 'currency', required: false },
    { sourceColumn: 'Insurance Balance', targetField: 'insuranceBalance', transform: 'currency', required: false },
    { sourceColumn: 'Primary Insurance', targetField: 'primaryInsurance', required: false },
    { sourceColumn: 'Insurance', targetField: 'primaryInsurance', required: false },
    { sourceColumn: 'Financial Class', targetField: 'financialClass', required: false },
    { sourceColumn: 'Facility', targetField: 'facilityName', required: false },
    { sourceColumn: 'Facility Name', targetField: 'facilityName', required: false },
    { sourceColumn: 'Department', targetField: 'departmentName', required: false },
    { sourceColumn: 'Encounter Type', targetField: 'encounterType', transform: 'encounter_type', required: false },
    { sourceColumn: 'Patient Type', targetField: 'patientType', required: false },
    { sourceColumn: 'Address', targetField: 'addressLine1', required: false },
    { sourceColumn: 'Address 1', targetField: 'addressLine1', required: false },
    { sourceColumn: 'Address 2', targetField: 'addressLine2', required: false },
    { sourceColumn: 'City', targetField: 'city', required: false },
    { sourceColumn: 'State', targetField: 'state', transform: 'state_code', required: false },
    { sourceColumn: 'Zip', targetField: 'zipCode', required: false },
    { sourceColumn: 'Zip Code', targetField: 'zipCode', required: false },
    { sourceColumn: 'Phone', targetField: 'phone', required: false },
    { sourceColumn: 'Phone Number', targetField: 'phone', required: false },
    { sourceColumn: 'Email', targetField: 'email', required: false },
    { sourceColumn: 'Aging', targetField: 'agingBucket', required: false },
    { sourceColumn: 'Aging Bucket', targetField: 'agingBucket', required: false },
    { sourceColumn: 'Status', targetField: 'status', required: false },
    { sourceColumn: 'Notes', targetField: 'notes', required: false },
    { sourceColumn: 'Comments', targetField: 'notes', required: false },
  ],
};

/**
 * R1 RCM Self-Pay Export Preset
 * R1 RCM (formerly Accretive Health) patient accounting format
 */
export const R1_RCM_SELF_PAY_PRESET: MappingPreset = {
  id: 'r1-rcm-self-pay',
  name: 'R1 RCM Self-Pay Export',
  vendor: 'R1 RCM',
  description: 'R1 RCM patient accounting export format for self-pay accounts',
  dateFormat: 'MM/DD/YYYY',
  currencyFormat: 'decimal',
  skipHeaderRows: 0,
  delimiter: ',',
  mappings: [
    { sourceColumn: 'ACCOUNT_NUMBER', targetField: 'accountNumber', required: true },
    { sourceColumn: 'MRN', targetField: 'mrn', required: false },
    { sourceColumn: 'PATIENT_LAST_NAME', targetField: 'patientLastName', required: false },
    { sourceColumn: 'PATIENT_FIRST_NAME', targetField: 'patientFirstName', required: false },
    { sourceColumn: 'PATIENT_MIDDLE_NAME', targetField: 'patientMiddleName', required: false },
    { sourceColumn: 'PATIENT_DOB', targetField: 'dateOfBirth', transform: 'date', required: false },
    { sourceColumn: 'SERVICE_DATE', targetField: 'dateOfService', transform: 'date', required: false },
    { sourceColumn: 'ADMIT_DATE', targetField: 'admitDate', transform: 'date', required: false },
    { sourceColumn: 'DISCHARGE_DATE', targetField: 'dischargeDate', transform: 'date', required: false },
    { sourceColumn: 'TOTAL_CHARGES', targetField: 'totalCharges', transform: 'currency', required: false },
    { sourceColumn: 'TOTAL_PAYMENTS', targetField: 'totalPayments', transform: 'currency', required: false },
    { sourceColumn: 'TOTAL_ADJUSTMENTS', targetField: 'totalAdjustments', transform: 'currency', required: false },
    { sourceColumn: 'CURRENT_BALANCE', targetField: 'balance', transform: 'currency', required: false },
    { sourceColumn: 'INSURANCE_BALANCE', targetField: 'insuranceBalance', transform: 'currency', required: false },
    { sourceColumn: 'PATIENT_BALANCE', targetField: 'selfPayBalance', transform: 'currency', required: false },
    { sourceColumn: 'PRIMARY_PAYER', targetField: 'primaryInsurance', required: false },
    { sourceColumn: 'SECONDARY_PAYER', targetField: 'secondaryInsurance', required: false },
    { sourceColumn: 'FINANCIAL_CLASS', targetField: 'financialClass', required: false },
    { sourceColumn: 'FACILITY_CODE', targetField: 'facilityCode', required: false },
    { sourceColumn: 'FACILITY_NAME', targetField: 'facilityName', required: false },
    { sourceColumn: 'DEPARTMENT_CODE', targetField: 'departmentCode', required: false },
    { sourceColumn: 'DEPARTMENT_NAME', targetField: 'departmentName', required: false },
    { sourceColumn: 'PATIENT_TYPE', targetField: 'patientType', required: false },
    { sourceColumn: 'ENCOUNTER_TYPE', targetField: 'encounterType', transform: 'encounter_type', required: false },
    { sourceColumn: 'ADDRESS_LINE_1', targetField: 'addressLine1', required: false },
    { sourceColumn: 'ADDRESS_LINE_2', targetField: 'addressLine2', required: false },
    { sourceColumn: 'CITY', targetField: 'city', required: false },
    { sourceColumn: 'STATE', targetField: 'state', transform: 'state_code', required: false },
    { sourceColumn: 'ZIP_CODE', targetField: 'zipCode', required: false },
    { sourceColumn: 'HOME_PHONE', targetField: 'phone', required: false },
    { sourceColumn: 'WORK_PHONE', targetField: 'workPhone', required: false },
    { sourceColumn: 'CELL_PHONE', targetField: 'cellPhone', required: false },
    { sourceColumn: 'EMAIL_ADDRESS', targetField: 'email', required: false },
    { sourceColumn: 'GUARANTOR_NAME', targetField: 'guarantorName', required: false },
    { sourceColumn: 'GUARANTOR_PHONE', targetField: 'guarantorPhone', required: false },
    { sourceColumn: 'ATTENDING_PHYSICIAN', targetField: 'attendingPhysician', required: false },
    { sourceColumn: 'REFERRING_PHYSICIAN', targetField: 'referringPhysician', required: false },
    { sourceColumn: 'AGING_BUCKET', targetField: 'agingBucket', required: false },
    { sourceColumn: 'DAYS_SINCE_DISCHARGE', targetField: 'daysSinceDischarge', required: false },
    { sourceColumn: 'LAST_ACTIVITY_DATE', targetField: 'lastActivityDate', transform: 'date', required: false },
    { sourceColumn: 'ACCOUNT_STATUS', targetField: 'status', required: false },
    { sourceColumn: 'ACCOUNT_NOTES', targetField: 'notes', required: false },
  ],
};

/**
 * Epic Resolute Patient Accounting Preset
 * Epic's Resolute Hospital Billing / Professional Billing export
 */
export const EPIC_RESOLUTE_PRESET: MappingPreset = {
  id: 'epic-resolute',
  name: 'Epic Resolute Patient Accounting',
  vendor: 'Epic',
  description: 'Epic Resolute Hospital Billing and Professional Billing export format',
  dateFormat: 'MM/DD/YYYY',
  currencyFormat: 'decimal',
  skipHeaderRows: 0,
  delimiter: ',',
  mappings: [
    { sourceColumn: 'HAR', targetField: 'accountNumber', required: true },
    { sourceColumn: 'Hospital Account ID', targetField: 'accountNumber', required: true },
    { sourceColumn: 'MRN', targetField: 'mrn', required: false },
    { sourceColumn: 'Patient MRN', targetField: 'mrn', required: false },
    { sourceColumn: 'Patient Last Name', targetField: 'patientLastName', required: false },
    { sourceColumn: 'Patient First Name', targetField: 'patientFirstName', required: false },
    { sourceColumn: 'Birth Date', targetField: 'dateOfBirth', transform: 'date', required: false },
    { sourceColumn: 'Patient DOB', targetField: 'dateOfBirth', transform: 'date', required: false },
    { sourceColumn: 'Service Area ID', targetField: 'facilityCode', required: false },
    { sourceColumn: 'Service Area', targetField: 'facilityName', required: false },
    { sourceColumn: 'Department ID', targetField: 'departmentCode', required: false },
    { sourceColumn: 'Department', targetField: 'departmentName', required: false },
    { sourceColumn: 'Admit Date/Time', targetField: 'admitDate', transform: 'date', required: false },
    { sourceColumn: 'Discharge Date/Time', targetField: 'dischargeDate', transform: 'date', required: false },
    { sourceColumn: 'Patient Class', targetField: 'patientType', required: false },
    { sourceColumn: 'Base Patient Class', targetField: 'encounterType', transform: 'encounter_type', required: false },
    { sourceColumn: 'Financial Class', targetField: 'financialClass', required: false },
    { sourceColumn: 'Primary Payor', targetField: 'primaryInsurance', required: false },
    { sourceColumn: 'Primary Plan', targetField: 'primaryInsurance', required: false },
    { sourceColumn: 'Secondary Payor', targetField: 'secondaryInsurance', required: false },
    { sourceColumn: 'Total Charges', targetField: 'totalCharges', transform: 'currency', required: false },
    { sourceColumn: 'Total Payments', targetField: 'totalPayments', transform: 'currency', required: false },
    { sourceColumn: 'Total Adjustments', targetField: 'totalAdjustments', transform: 'currency', required: false },
    { sourceColumn: 'Account Balance', targetField: 'balance', transform: 'currency', required: false },
    { sourceColumn: 'Insurance Balance', targetField: 'insuranceBalance', transform: 'currency', required: false },
    { sourceColumn: 'Patient Balance', targetField: 'selfPayBalance', transform: 'currency', required: false },
    { sourceColumn: 'Self-Pay Balance', targetField: 'selfPayBalance', transform: 'currency', required: false },
    { sourceColumn: 'Address - Line 1', targetField: 'addressLine1', required: false },
    { sourceColumn: 'Address - Line 2', targetField: 'addressLine2', required: false },
    { sourceColumn: 'Address - City', targetField: 'city', required: false },
    { sourceColumn: 'Address - State', targetField: 'state', transform: 'state_code', required: false },
    { sourceColumn: 'Address - ZIP', targetField: 'zipCode', required: false },
    { sourceColumn: 'Home Phone', targetField: 'phone', required: false },
    { sourceColumn: 'MyChart Email', targetField: 'email', required: false },
    { sourceColumn: 'Guarantor Account Name', targetField: 'guarantorName', required: false },
    { sourceColumn: 'Guarantor Phone', targetField: 'guarantorPhone', required: false },
    { sourceColumn: 'Attending Provider', targetField: 'attendingPhysician', required: false },
    { sourceColumn: 'Referring Provider', targetField: 'referringPhysician', required: false },
    { sourceColumn: 'Account Aging Bucket', targetField: 'agingBucket', required: false },
    { sourceColumn: 'Last Txn Date', targetField: 'lastActivityDate', transform: 'date', required: false },
    { sourceColumn: 'Account Status', targetField: 'status', required: false },
    { sourceColumn: 'Account Notes', targetField: 'notes', required: false },
  ],
};

/**
 * Ensemble Health Partners Standard Export Preset
 * Ensemble Health Partners revenue cycle management format
 */
export const ENSEMBLE_STANDARD_PRESET: MappingPreset = {
  id: 'ensemble-standard',
  name: 'Ensemble Health Partners Standard',
  vendor: 'Ensemble Health Partners',
  description: 'Ensemble Health Partners standard revenue cycle management export format',
  dateFormat: 'YYYY-MM-DD',
  currencyFormat: 'decimal',
  skipHeaderRows: 0,
  delimiter: ',',
  mappings: [
    { sourceColumn: 'AccountNo', targetField: 'accountNumber', required: true },
    { sourceColumn: 'PatientMRN', targetField: 'mrn', required: false },
    { sourceColumn: 'LastName', targetField: 'patientLastName', required: false },
    { sourceColumn: 'FirstName', targetField: 'patientFirstName', required: false },
    { sourceColumn: 'MiddleName', targetField: 'patientMiddleName', required: false },
    { sourceColumn: 'DateOfBirth', targetField: 'dateOfBirth', transform: 'date', required: false },
    { sourceColumn: 'SSN', targetField: 'ssn', required: false },
    { sourceColumn: 'ServiceFromDate', targetField: 'dateOfService', transform: 'date', required: false },
    { sourceColumn: 'ServiceToDate', targetField: 'serviceToDate', transform: 'date', required: false },
    { sourceColumn: 'AdmitDate', targetField: 'admitDate', transform: 'date', required: false },
    { sourceColumn: 'DischargeDate', targetField: 'dischargeDate', transform: 'date', required: false },
    { sourceColumn: 'TotalCharges', targetField: 'totalCharges', transform: 'currency', required: false },
    { sourceColumn: 'TotalPayments', targetField: 'totalPayments', transform: 'currency', required: false },
    { sourceColumn: 'TotalAdjustments', targetField: 'totalAdjustments', transform: 'currency', required: false },
    { sourceColumn: 'AccountBalance', targetField: 'balance', transform: 'currency', required: false },
    { sourceColumn: 'InsuranceBalance', targetField: 'insuranceBalance', transform: 'currency', required: false },
    { sourceColumn: 'PatientBalance', targetField: 'selfPayBalance', transform: 'currency', required: false },
    { sourceColumn: 'PrimaryPayerName', targetField: 'primaryInsurance', required: false },
    { sourceColumn: 'PrimaryPayerCode', targetField: 'primaryInsuranceCode', required: false },
    { sourceColumn: 'SecondaryPayerName', targetField: 'secondaryInsurance', required: false },
    { sourceColumn: 'FinancialClass', targetField: 'financialClass', required: false },
    { sourceColumn: 'FacilityCode', targetField: 'facilityCode', required: false },
    { sourceColumn: 'FacilityName', targetField: 'facilityName', required: false },
    { sourceColumn: 'DepartmentCode', targetField: 'departmentCode', required: false },
    { sourceColumn: 'DepartmentName', targetField: 'departmentName', required: false },
    { sourceColumn: 'PatientType', targetField: 'patientType', required: false },
    { sourceColumn: 'EncounterType', targetField: 'encounterType', transform: 'encounter_type', required: false },
    { sourceColumn: 'Address1', targetField: 'addressLine1', required: false },
    { sourceColumn: 'Address2', targetField: 'addressLine2', required: false },
    { sourceColumn: 'City', targetField: 'city', required: false },
    { sourceColumn: 'State', targetField: 'state', transform: 'state_code', required: false },
    { sourceColumn: 'ZipCode', targetField: 'zipCode', required: false },
    { sourceColumn: 'HomePhone', targetField: 'phone', required: false },
    { sourceColumn: 'CellPhone', targetField: 'cellPhone', required: false },
    { sourceColumn: 'WorkPhone', targetField: 'workPhone', required: false },
    { sourceColumn: 'Email', targetField: 'email', required: false },
    { sourceColumn: 'GuarantorName', targetField: 'guarantorName', required: false },
    { sourceColumn: 'GuarantorPhone', targetField: 'guarantorPhone', required: false },
    { sourceColumn: 'AttendingPhysician', targetField: 'attendingPhysician', required: false },
    { sourceColumn: 'ReferringPhysician', targetField: 'referringPhysician', required: false },
    { sourceColumn: 'AgingBucket', targetField: 'agingBucket', required: false },
    { sourceColumn: 'DaysSinceLastPayment', targetField: 'daysSinceLastPayment', required: false },
    { sourceColumn: 'LastActivityDate', targetField: 'lastActivityDate', transform: 'date', required: false },
    { sourceColumn: 'AccountStatus', targetField: 'status', required: false },
    { sourceColumn: 'WorklistCode', targetField: 'worklistCode', required: false },
    { sourceColumn: 'Notes', targetField: 'notes', required: false },
  ],
};

/**
 * Cerner Revenue Cycle Export Preset
 */
export const CERNER_REVENUE_CYCLE_PRESET: MappingPreset = {
  id: 'cerner-revenue-cycle',
  name: 'Cerner Revenue Cycle',
  vendor: 'Cerner',
  description: 'Cerner (Oracle Health) Revenue Cycle Management export format',
  dateFormat: 'MM/DD/YYYY',
  currencyFormat: 'decimal',
  skipHeaderRows: 0,
  delimiter: ',',
  mappings: [
    { sourceColumn: 'ENCOUNTER_ID', targetField: 'accountNumber', required: true },
    { sourceColumn: 'FIN_NBR', targetField: 'accountNumber', required: true },
    { sourceColumn: 'PERSON_ID', targetField: 'mrn', required: false },
    { sourceColumn: 'NAME_LAST', targetField: 'patientLastName', required: false },
    { sourceColumn: 'NAME_FIRST', targetField: 'patientFirstName', required: false },
    { sourceColumn: 'BIRTH_DT_TM', targetField: 'dateOfBirth', transform: 'date', required: false },
    { sourceColumn: 'REG_DT_TM', targetField: 'dateOfService', transform: 'date', required: false },
    { sourceColumn: 'ADMIT_DT_TM', targetField: 'admitDate', transform: 'date', required: false },
    { sourceColumn: 'DISCH_DT_TM', targetField: 'dischargeDate', transform: 'date', required: false },
    { sourceColumn: 'TOT_CHARGE', targetField: 'totalCharges', transform: 'currency', required: false },
    { sourceColumn: 'TOT_PAYMENT', targetField: 'totalPayments', transform: 'currency', required: false },
    { sourceColumn: 'TOT_ADJ', targetField: 'totalAdjustments', transform: 'currency', required: false },
    { sourceColumn: 'BALANCE', targetField: 'balance', transform: 'currency', required: false },
    { sourceColumn: 'INS_BAL', targetField: 'insuranceBalance', transform: 'currency', required: false },
    { sourceColumn: 'PAT_BAL', targetField: 'selfPayBalance', transform: 'currency', required: false },
    { sourceColumn: 'HEALTH_PLAN_NAME', targetField: 'primaryInsurance', required: false },
    { sourceColumn: 'FIN_CLASS_CD', targetField: 'financialClass', required: false },
    { sourceColumn: 'FACILITY_CD', targetField: 'facilityCode', required: false },
    { sourceColumn: 'FACILITY', targetField: 'facilityName', required: false },
    { sourceColumn: 'NURSE_UNIT', targetField: 'departmentName', required: false },
    { sourceColumn: 'ENCNTR_TYPE_CD', targetField: 'encounterType', transform: 'encounter_type', required: false },
    { sourceColumn: 'STREET_ADDR', targetField: 'addressLine1', required: false },
    { sourceColumn: 'STREET_ADDR2', targetField: 'addressLine2', required: false },
    { sourceColumn: 'CITY', targetField: 'city', required: false },
    { sourceColumn: 'STATE_CD', targetField: 'state', transform: 'state_code', required: false },
    { sourceColumn: 'ZIPCODE', targetField: 'zipCode', required: false },
    { sourceColumn: 'HOME_PHONE', targetField: 'phone', required: false },
    { sourceColumn: 'EMAIL', targetField: 'email', required: false },
    { sourceColumn: 'ATTEND_DR_NAME', targetField: 'attendingPhysician', required: false },
    { sourceColumn: 'REFER_DR_NAME', targetField: 'referringPhysician', required: false },
    { sourceColumn: 'ACCT_AGING', targetField: 'agingBucket', required: false },
    { sourceColumn: 'LAST_ACCT_ACTIVITY', targetField: 'lastActivityDate', transform: 'date', required: false },
    { sourceColumn: 'ACCT_STATUS', targetField: 'status', required: false },
  ],
};

/**
 * Meditech Expanse Export Preset
 */
export const MEDITECH_EXPANSE_PRESET: MappingPreset = {
  id: 'meditech-expanse',
  name: 'Meditech Expanse',
  vendor: 'Meditech',
  description: 'Meditech Expanse revenue cycle export format',
  dateFormat: 'MM/DD/YYYY',
  currencyFormat: 'decimal',
  skipHeaderRows: 0,
  delimiter: ',',
  mappings: [
    { sourceColumn: 'Account.Number', targetField: 'accountNumber', required: true },
    { sourceColumn: 'Patient.MRN', targetField: 'mrn', required: false },
    { sourceColumn: 'Patient.Name.Last', targetField: 'patientLastName', required: false },
    { sourceColumn: 'Patient.Name.First', targetField: 'patientFirstName', required: false },
    { sourceColumn: 'Patient.DOB', targetField: 'dateOfBirth', transform: 'date', required: false },
    { sourceColumn: 'Visit.AdmitDateTime', targetField: 'admitDate', transform: 'date', required: false },
    { sourceColumn: 'Visit.DischargeDateTime', targetField: 'dischargeDate', transform: 'date', required: false },
    { sourceColumn: 'Account.TotalCharges', targetField: 'totalCharges', transform: 'currency', required: false },
    { sourceColumn: 'Account.TotalPayments', targetField: 'totalPayments', transform: 'currency', required: false },
    { sourceColumn: 'Account.Balance', targetField: 'balance', transform: 'currency', required: false },
    { sourceColumn: 'Account.InsuranceBalance', targetField: 'insuranceBalance', transform: 'currency', required: false },
    { sourceColumn: 'Account.PatientBalance', targetField: 'selfPayBalance', transform: 'currency', required: false },
    { sourceColumn: 'Insurance.Primary.Name', targetField: 'primaryInsurance', required: false },
    { sourceColumn: 'Insurance.Secondary.Name', targetField: 'secondaryInsurance', required: false },
    { sourceColumn: 'Account.FinancialClass', targetField: 'financialClass', required: false },
    { sourceColumn: 'Visit.Facility', targetField: 'facilityName', required: false },
    { sourceColumn: 'Visit.Department', targetField: 'departmentName', required: false },
    { sourceColumn: 'Visit.PatientType', targetField: 'patientType', required: false },
    { sourceColumn: 'Patient.Address.Street1', targetField: 'addressLine1', required: false },
    { sourceColumn: 'Patient.Address.Street2', targetField: 'addressLine2', required: false },
    { sourceColumn: 'Patient.Address.City', targetField: 'city', required: false },
    { sourceColumn: 'Patient.Address.State', targetField: 'state', transform: 'state_code', required: false },
    { sourceColumn: 'Patient.Address.Zip', targetField: 'zipCode', required: false },
    { sourceColumn: 'Patient.Phone.Home', targetField: 'phone', required: false },
    { sourceColumn: 'Patient.Email', targetField: 'email', required: false },
    { sourceColumn: 'Guarantor.Name', targetField: 'guarantorName', required: false },
    { sourceColumn: 'Visit.AttendingPhysician', targetField: 'attendingPhysician', required: false },
    { sourceColumn: 'Account.AgingBucket', targetField: 'agingBucket', required: false },
    { sourceColumn: 'Account.Status', targetField: 'status', required: false },
  ],
};

/**
 * Athenahealth Export Preset
 */
export const ATHENA_HEALTH_PRESET: MappingPreset = {
  id: 'athena-health',
  name: 'athenahealth',
  vendor: 'athenahealth',
  description: 'athenahealth revenue cycle and practice management export format',
  dateFormat: 'MM/DD/YYYY',
  currencyFormat: 'decimal',
  skipHeaderRows: 0,
  delimiter: ',',
  mappings: [
    { sourceColumn: 'claimid', targetField: 'accountNumber', required: true },
    { sourceColumn: 'patientid', targetField: 'mrn', required: false },
    { sourceColumn: 'patientlastname', targetField: 'patientLastName', required: false },
    { sourceColumn: 'patientfirstname', targetField: 'patientFirstName', required: false },
    { sourceColumn: 'dob', targetField: 'dateOfBirth', transform: 'date', required: false },
    { sourceColumn: 'servicedate', targetField: 'dateOfService', transform: 'date', required: false },
    { sourceColumn: 'totalcharges', targetField: 'totalCharges', transform: 'currency', required: false },
    { sourceColumn: 'totalpayments', targetField: 'totalPayments', transform: 'currency', required: false },
    { sourceColumn: 'patientbalance', targetField: 'selfPayBalance', transform: 'currency', required: false },
    { sourceColumn: 'insurancebalance', targetField: 'insuranceBalance', transform: 'currency', required: false },
    { sourceColumn: 'balance', targetField: 'balance', transform: 'currency', required: false },
    { sourceColumn: 'primaryinsurancename', targetField: 'primaryInsurance', required: false },
    { sourceColumn: 'secondaryinsurancename', targetField: 'secondaryInsurance', required: false },
    { sourceColumn: 'financialclass', targetField: 'financialClass', required: false },
    { sourceColumn: 'departmentname', targetField: 'departmentName', required: false },
    { sourceColumn: 'facilityname', targetField: 'facilityName', required: false },
    { sourceColumn: 'patientaddress1', targetField: 'addressLine1', required: false },
    { sourceColumn: 'patientaddress2', targetField: 'addressLine2', required: false },
    { sourceColumn: 'patientcity', targetField: 'city', required: false },
    { sourceColumn: 'patientstate', targetField: 'state', transform: 'state_code', required: false },
    { sourceColumn: 'patientzip', targetField: 'zipCode', required: false },
    { sourceColumn: 'homephone', targetField: 'phone', required: false },
    { sourceColumn: 'mobilephone', targetField: 'cellPhone', required: false },
    { sourceColumn: 'email', targetField: 'email', required: false },
    { sourceColumn: 'guarantorname', targetField: 'guarantorName', required: false },
    { sourceColumn: 'supervisingprovider', targetField: 'attendingPhysician', required: false },
    { sourceColumn: 'referringprovider', targetField: 'referringPhysician', required: false },
    { sourceColumn: 'agingbucket', targetField: 'agingBucket', required: false },
    { sourceColumn: 'claimstatus', targetField: 'status', required: false },
    { sourceColumn: 'notes', targetField: 'notes', required: false },
  ],
};

/**
 * Tab-Delimited Generic Preset
 * For systems that export tab-separated files
 */
export const TAB_DELIMITED_PRESET: MappingPreset = {
  id: 'tab-delimited-generic',
  name: 'Tab-Delimited Generic',
  vendor: 'Generic',
  description: 'Generic tab-delimited export format',
  dateFormat: 'MM/DD/YYYY',
  currencyFormat: 'decimal',
  skipHeaderRows: 0,
  delimiter: '\t',
  mappings: [
    { sourceColumn: 'Account', targetField: 'accountNumber', required: true },
    { sourceColumn: 'MRN', targetField: 'mrn', required: false },
    { sourceColumn: 'Patient Name', targetField: 'patientFullName', required: false },
    { sourceColumn: 'DOB', targetField: 'dateOfBirth', transform: 'date', required: false },
    { sourceColumn: 'DOS', targetField: 'dateOfService', transform: 'date', required: false },
    { sourceColumn: 'Charges', targetField: 'totalCharges', transform: 'currency', required: false },
    { sourceColumn: 'Payments', targetField: 'totalPayments', transform: 'currency', required: false },
    { sourceColumn: 'Balance', targetField: 'balance', transform: 'currency', required: false },
    { sourceColumn: 'Insurance', targetField: 'primaryInsurance', required: false },
    { sourceColumn: 'Status', targetField: 'status', required: false },
  ],
};

/**
 * All default presets
 */
export const DEFAULT_PRESETS: MappingPreset[] = [
  GENERIC_SELF_PAY_PRESET,
  R1_RCM_SELF_PAY_PRESET,
  EPIC_RESOLUTE_PRESET,
  ENSEMBLE_STANDARD_PRESET,
  CERNER_REVENUE_CYCLE_PRESET,
  MEDITECH_EXPANSE_PRESET,
  ATHENA_HEALTH_PRESET,
  TAB_DELIMITED_PRESET,
];

/**
 * Get a default preset by ID
 */
export function getDefaultPreset(id: string): MappingPreset | undefined {
  return DEFAULT_PRESETS.find((p) => p.id === id);
}

/**
 * Get all presets for a specific vendor
 */
export function getDefaultPresetsByVendor(vendor: string): MappingPreset[] {
  return DEFAULT_PRESETS.filter(
    (p) => p.vendor.toLowerCase() === vendor.toLowerCase()
  );
}
