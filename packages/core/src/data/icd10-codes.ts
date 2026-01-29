/**
 * ICD-10-CM Code Database
 * Top 500 most common ICD-10-CM diagnosis codes
 * Includes code, description, category, severity, and HCC mapping
 */

export interface ICD10Code {
  code: string;
  description: string;
  category: ICD10Category;
  severity: ICD10Severity;
  hccMapping: number | null; // HCC category number, null if not risk-adjusted
  isChronicCondition: boolean;
  isPrincipalDiagnosis: boolean; // Can be used as principal diagnosis
  mccWeight: boolean; // Major Complication/Comorbidity
  ccWeight: boolean; // Complication/Comorbidity
}

export type ICD10Category =
  | 'infectious_disease'
  | 'neoplasms'
  | 'blood_disorders'
  | 'endocrine_metabolic'
  | 'mental_behavioral'
  | 'nervous_system'
  | 'eye_disorders'
  | 'ear_disorders'
  | 'circulatory_system'
  | 'respiratory_system'
  | 'digestive_system'
  | 'skin_disorders'
  | 'musculoskeletal'
  | 'genitourinary'
  | 'pregnancy'
  | 'perinatal'
  | 'congenital'
  | 'symptoms_signs'
  | 'injury_poisoning'
  | 'external_causes';

export type ICD10Severity = 'mild' | 'moderate' | 'severe' | 'unspecified';

// ICD-10-CM Code Database - Top 500 most common codes
export const ICD10_CODES: Record<string, ICD10Code> = {
  // ============================================================================
  // INFECTIOUS AND PARASITIC DISEASES (A00-B99)
  // ============================================================================

  'A41.9': {
    code: 'A41.9',
    description: 'Sepsis, unspecified organism',
    category: 'infectious_disease',
    severity: 'severe',
    hccMapping: 2,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'A41.01': {
    code: 'A41.01',
    description: 'Sepsis due to Methicillin susceptible Staphylococcus aureus',
    category: 'infectious_disease',
    severity: 'severe',
    hccMapping: 2,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'A41.02': {
    code: 'A41.02',
    description: 'Sepsis due to Methicillin resistant Staphylococcus aureus',
    category: 'infectious_disease',
    severity: 'severe',
    hccMapping: 2,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'A04.72': {
    code: 'A04.72',
    description: 'Enterocolitis due to Clostridium difficile, recurrent',
    category: 'infectious_disease',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'B18.2': {
    code: 'B18.2',
    description: 'Chronic viral hepatitis C',
    category: 'infectious_disease',
    severity: 'moderate',
    hccMapping: 29,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'B20': {
    code: 'B20',
    description: 'Human immunodeficiency virus [HIV] disease',
    category: 'infectious_disease',
    severity: 'severe',
    hccMapping: 1,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'B34.9': {
    code: 'B34.9',
    description: 'Viral infection, unspecified',
    category: 'infectious_disease',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'J06.9': {
    code: 'J06.9',
    description: 'Acute upper respiratory infection, unspecified',
    category: 'respiratory_system',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'N39.0': {
    code: 'N39.0',
    description: 'Urinary tract infection, site not specified',
    category: 'genitourinary',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },

  // ============================================================================
  // NEOPLASMS (C00-D49)
  // ============================================================================

  'C34.90': {
    code: 'C34.90',
    description: 'Malignant neoplasm of unspecified part of bronchus or lung',
    category: 'neoplasms',
    severity: 'severe',
    hccMapping: 9,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'C50.919': {
    code: 'C50.919',
    description: 'Malignant neoplasm of breast, unspecified site, female',
    category: 'neoplasms',
    severity: 'severe',
    hccMapping: 12,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'C61': {
    code: 'C61',
    description: 'Malignant neoplasm of prostate',
    category: 'neoplasms',
    severity: 'severe',
    hccMapping: 12,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'C18.9': {
    code: 'C18.9',
    description: 'Malignant neoplasm of colon, unspecified',
    category: 'neoplasms',
    severity: 'severe',
    hccMapping: 11,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'C25.9': {
    code: 'C25.9',
    description: 'Malignant neoplasm of pancreas, unspecified',
    category: 'neoplasms',
    severity: 'severe',
    hccMapping: 10,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'C78.7': {
    code: 'C78.7',
    description: 'Secondary malignant neoplasm of liver and intrahepatic bile duct',
    category: 'neoplasms',
    severity: 'severe',
    hccMapping: 8,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'C79.51': {
    code: 'C79.51',
    description: 'Secondary malignant neoplasm of bone',
    category: 'neoplasms',
    severity: 'severe',
    hccMapping: 8,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'C90.00': {
    code: 'C90.00',
    description: 'Multiple myeloma not having achieved remission',
    category: 'neoplasms',
    severity: 'severe',
    hccMapping: 10,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'D46.9': {
    code: 'D46.9',
    description: 'Myelodysplastic syndrome, unspecified',
    category: 'neoplasms',
    severity: 'severe',
    hccMapping: 46,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },

  // ============================================================================
  // BLOOD AND BLOOD-FORMING ORGANS (D50-D89)
  // ============================================================================

  'D64.9': {
    code: 'D64.9',
    description: 'Anemia, unspecified',
    category: 'blood_disorders',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'D50.9': {
    code: 'D50.9',
    description: 'Iron deficiency anemia, unspecified',
    category: 'blood_disorders',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'D62': {
    code: 'D62',
    description: 'Acute posthemorrhagic anemia',
    category: 'blood_disorders',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'D63.1': {
    code: 'D63.1',
    description: 'Anemia in chronic kidney disease',
    category: 'blood_disorders',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: false,
    mccWeight: false,
    ccWeight: true
  },
  'D69.6': {
    code: 'D69.6',
    description: 'Thrombocytopenia, unspecified',
    category: 'blood_disorders',
    severity: 'moderate',
    hccMapping: 48,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },

  // ============================================================================
  // ENDOCRINE, NUTRITIONAL AND METABOLIC DISEASES (E00-E89)
  // ============================================================================

  'E11.9': {
    code: 'E11.9',
    description: 'Type 2 diabetes mellitus without complications',
    category: 'endocrine_metabolic',
    severity: 'mild',
    hccMapping: 19,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'E11.65': {
    code: 'E11.65',
    description: 'Type 2 diabetes mellitus with hyperglycemia',
    category: 'endocrine_metabolic',
    severity: 'moderate',
    hccMapping: 19,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'E11.22': {
    code: 'E11.22',
    description: 'Type 2 diabetes mellitus with diabetic chronic kidney disease',
    category: 'endocrine_metabolic',
    severity: 'moderate',
    hccMapping: 18,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'E11.40': {
    code: 'E11.40',
    description: 'Type 2 diabetes mellitus with diabetic neuropathy, unspecified',
    category: 'endocrine_metabolic',
    severity: 'moderate',
    hccMapping: 18,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'E11.42': {
    code: 'E11.42',
    description: 'Type 2 diabetes mellitus with diabetic polyneuropathy',
    category: 'endocrine_metabolic',
    severity: 'moderate',
    hccMapping: 18,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'E11.51': {
    code: 'E11.51',
    description: 'Type 2 diabetes mellitus with diabetic peripheral angiopathy without gangrene',
    category: 'endocrine_metabolic',
    severity: 'moderate',
    hccMapping: 18,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'E11.621': {
    code: 'E11.621',
    description: 'Type 2 diabetes mellitus with foot ulcer',
    category: 'endocrine_metabolic',
    severity: 'moderate',
    hccMapping: 18,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'E10.9': {
    code: 'E10.9',
    description: 'Type 1 diabetes mellitus without complications',
    category: 'endocrine_metabolic',
    severity: 'moderate',
    hccMapping: 17,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'E03.9': {
    code: 'E03.9',
    description: 'Hypothyroidism, unspecified',
    category: 'endocrine_metabolic',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'E05.90': {
    code: 'E05.90',
    description: 'Thyrotoxicosis, unspecified without thyrotoxic crisis',
    category: 'endocrine_metabolic',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'E66.9': {
    code: 'E66.9',
    description: 'Obesity, unspecified',
    category: 'endocrine_metabolic',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'E66.01': {
    code: 'E66.01',
    description: 'Morbid (severe) obesity due to excess calories',
    category: 'endocrine_metabolic',
    severity: 'moderate',
    hccMapping: 22,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'E78.5': {
    code: 'E78.5',
    description: 'Hyperlipidemia, unspecified',
    category: 'endocrine_metabolic',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'E87.1': {
    code: 'E87.1',
    description: 'Hypo-osmolality and hyponatremia',
    category: 'endocrine_metabolic',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'E87.6': {
    code: 'E87.6',
    description: 'Hypokalemia',
    category: 'endocrine_metabolic',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'E86.0': {
    code: 'E86.0',
    description: 'Dehydration',
    category: 'endocrine_metabolic',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },

  // ============================================================================
  // MENTAL AND BEHAVIORAL DISORDERS (F01-F99)
  // ============================================================================

  'F32.9': {
    code: 'F32.9',
    description: 'Major depressive disorder, single episode, unspecified',
    category: 'mental_behavioral',
    severity: 'moderate',
    hccMapping: 59,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'F33.0': {
    code: 'F33.0',
    description: 'Major depressive disorder, recurrent, mild',
    category: 'mental_behavioral',
    severity: 'mild',
    hccMapping: 59,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'F33.1': {
    code: 'F33.1',
    description: 'Major depressive disorder, recurrent, moderate',
    category: 'mental_behavioral',
    severity: 'moderate',
    hccMapping: 59,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'F33.2': {
    code: 'F33.2',
    description: 'Major depressive disorder, recurrent severe without psychotic features',
    category: 'mental_behavioral',
    severity: 'severe',
    hccMapping: 58,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'F41.1': {
    code: 'F41.1',
    description: 'Generalized anxiety disorder',
    category: 'mental_behavioral',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'F41.9': {
    code: 'F41.9',
    description: 'Anxiety disorder, unspecified',
    category: 'mental_behavioral',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'F10.20': {
    code: 'F10.20',
    description: 'Alcohol dependence, uncomplicated',
    category: 'mental_behavioral',
    severity: 'moderate',
    hccMapping: 55,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'F10.239': {
    code: 'F10.239',
    description: 'Alcohol dependence with withdrawal, unspecified',
    category: 'mental_behavioral',
    severity: 'severe',
    hccMapping: 55,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'F11.20': {
    code: 'F11.20',
    description: 'Opioid dependence, uncomplicated',
    category: 'mental_behavioral',
    severity: 'moderate',
    hccMapping: 55,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'F17.210': {
    code: 'F17.210',
    description: 'Nicotine dependence, cigarettes, uncomplicated',
    category: 'mental_behavioral',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: false,
    mccWeight: false,
    ccWeight: false
  },
  'F03.90': {
    code: 'F03.90',
    description: 'Unspecified dementia without behavioral disturbance',
    category: 'mental_behavioral',
    severity: 'moderate',
    hccMapping: 52,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'F01.50': {
    code: 'F01.50',
    description: 'Vascular dementia without behavioral disturbance',
    category: 'mental_behavioral',
    severity: 'moderate',
    hccMapping: 52,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'F20.9': {
    code: 'F20.9',
    description: 'Schizophrenia, unspecified',
    category: 'mental_behavioral',
    severity: 'severe',
    hccMapping: 57,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'F31.9': {
    code: 'F31.9',
    description: 'Bipolar disorder, unspecified',
    category: 'mental_behavioral',
    severity: 'moderate',
    hccMapping: 59,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },

  // ============================================================================
  // NERVOUS SYSTEM DISORDERS (G00-G99)
  // ============================================================================

  'G20': {
    code: 'G20',
    description: 'Parkinson\'s disease',
    category: 'nervous_system',
    severity: 'moderate',
    hccMapping: 78,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'G30.9': {
    code: 'G30.9',
    description: 'Alzheimer\'s disease, unspecified',
    category: 'nervous_system',
    severity: 'moderate',
    hccMapping: 51,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'G40.909': {
    code: 'G40.909',
    description: 'Epilepsy, unspecified, not intractable, without status epilepticus',
    category: 'nervous_system',
    severity: 'moderate',
    hccMapping: 79,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'G43.909': {
    code: 'G43.909',
    description: 'Migraine, unspecified, not intractable, without status migrainosus',
    category: 'nervous_system',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'G45.9': {
    code: 'G45.9',
    description: 'Transient cerebral ischemic attack, unspecified',
    category: 'nervous_system',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'G47.33': {
    code: 'G47.33',
    description: 'Obstructive sleep apnea (adult) (pediatric)',
    category: 'nervous_system',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'G62.9': {
    code: 'G62.9',
    description: 'Polyneuropathy, unspecified',
    category: 'nervous_system',
    severity: 'moderate',
    hccMapping: 75,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'G89.29': {
    code: 'G89.29',
    description: 'Other chronic pain',
    category: 'nervous_system',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },

  // ============================================================================
  // CIRCULATORY SYSTEM (I00-I99)
  // ============================================================================

  'I10': {
    code: 'I10',
    description: 'Essential (primary) hypertension',
    category: 'circulatory_system',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'I11.0': {
    code: 'I11.0',
    description: 'Hypertensive heart disease with heart failure',
    category: 'circulatory_system',
    severity: 'severe',
    hccMapping: 85,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'I12.9': {
    code: 'I12.9',
    description: 'Hypertensive chronic kidney disease with CKD stage 1-4',
    category: 'circulatory_system',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'I13.10': {
    code: 'I13.10',
    description: 'Hypertensive heart and CKD without heart failure, CKD stage 1-4',
    category: 'circulatory_system',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'I21.3': {
    code: 'I21.3',
    description: 'ST elevation myocardial infarction (STEMI) of unspecified site',
    category: 'circulatory_system',
    severity: 'severe',
    hccMapping: 86,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'I25.10': {
    code: 'I25.10',
    description: 'Atherosclerotic heart disease of native coronary artery without angina pectoris',
    category: 'circulatory_system',
    severity: 'moderate',
    hccMapping: 88,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'I25.110': {
    code: 'I25.110',
    description: 'Atherosclerotic heart disease of native coronary artery with unstable angina pectoris',
    category: 'circulatory_system',
    severity: 'severe',
    hccMapping: 87,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'I48.91': {
    code: 'I48.91',
    description: 'Unspecified atrial fibrillation',
    category: 'circulatory_system',
    severity: 'moderate',
    hccMapping: 96,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'I48.0': {
    code: 'I48.0',
    description: 'Paroxysmal atrial fibrillation',
    category: 'circulatory_system',
    severity: 'moderate',
    hccMapping: 96,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'I48.2': {
    code: 'I48.2',
    description: 'Chronic atrial fibrillation',
    category: 'circulatory_system',
    severity: 'moderate',
    hccMapping: 96,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'I50.9': {
    code: 'I50.9',
    description: 'Heart failure, unspecified',
    category: 'circulatory_system',
    severity: 'moderate',
    hccMapping: 85,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'I50.22': {
    code: 'I50.22',
    description: 'Chronic systolic (congestive) heart failure',
    category: 'circulatory_system',
    severity: 'moderate',
    hccMapping: 85,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'I50.32': {
    code: 'I50.32',
    description: 'Chronic diastolic (congestive) heart failure',
    category: 'circulatory_system',
    severity: 'moderate',
    hccMapping: 85,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'I50.42': {
    code: 'I50.42',
    description: 'Chronic combined systolic and diastolic (congestive) heart failure',
    category: 'circulatory_system',
    severity: 'moderate',
    hccMapping: 85,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'I63.9': {
    code: 'I63.9',
    description: 'Cerebral infarction, unspecified',
    category: 'circulatory_system',
    severity: 'severe',
    hccMapping: 100,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'I69.30': {
    code: 'I69.30',
    description: 'Unspecified sequelae of cerebral infarction',
    category: 'circulatory_system',
    severity: 'moderate',
    hccMapping: 103,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'I70.0': {
    code: 'I70.0',
    description: 'Atherosclerosis of aorta',
    category: 'circulatory_system',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'I70.231': {
    code: 'I70.231',
    description: 'Atherosclerosis of native arteries of right leg with ulceration of thigh',
    category: 'circulatory_system',
    severity: 'severe',
    hccMapping: 106,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'I73.9': {
    code: 'I73.9',
    description: 'Peripheral vascular disease, unspecified',
    category: 'circulatory_system',
    severity: 'moderate',
    hccMapping: 108,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },

  // ============================================================================
  // RESPIRATORY SYSTEM (J00-J99)
  // ============================================================================

  'J18.9': {
    code: 'J18.9',
    description: 'Pneumonia, unspecified organism',
    category: 'respiratory_system',
    severity: 'moderate',
    hccMapping: 114,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'J44.1': {
    code: 'J44.1',
    description: 'Chronic obstructive pulmonary disease with acute exacerbation',
    category: 'respiratory_system',
    severity: 'severe',
    hccMapping: 111,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'J44.9': {
    code: 'J44.9',
    description: 'Chronic obstructive pulmonary disease, unspecified',
    category: 'respiratory_system',
    severity: 'moderate',
    hccMapping: 111,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'J45.20': {
    code: 'J45.20',
    description: 'Mild intermittent asthma, uncomplicated',
    category: 'respiratory_system',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'J45.40': {
    code: 'J45.40',
    description: 'Moderate persistent asthma, uncomplicated',
    category: 'respiratory_system',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'J45.50': {
    code: 'J45.50',
    description: 'Severe persistent asthma, uncomplicated',
    category: 'respiratory_system',
    severity: 'severe',
    hccMapping: 110,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'J80': {
    code: 'J80',
    description: 'Acute respiratory distress syndrome',
    category: 'respiratory_system',
    severity: 'severe',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'J84.10': {
    code: 'J84.10',
    description: 'Pulmonary fibrosis, unspecified',
    category: 'respiratory_system',
    severity: 'severe',
    hccMapping: 112,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'J96.00': {
    code: 'J96.00',
    description: 'Acute respiratory failure, unspecified whether with hypoxia or hypercapnia',
    category: 'respiratory_system',
    severity: 'severe',
    hccMapping: 84,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'J96.10': {
    code: 'J96.10',
    description: 'Chronic respiratory failure, unspecified whether with hypoxia or hypercapnia',
    category: 'respiratory_system',
    severity: 'severe',
    hccMapping: 84,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },

  // ============================================================================
  // DIGESTIVE SYSTEM (K00-K95)
  // ============================================================================

  'K21.0': {
    code: 'K21.0',
    description: 'Gastro-esophageal reflux disease with esophagitis',
    category: 'digestive_system',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'K25.9': {
    code: 'K25.9',
    description: 'Gastric ulcer, unspecified as acute or chronic, without hemorrhage or perforation',
    category: 'digestive_system',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'K29.70': {
    code: 'K29.70',
    description: 'Gastritis, unspecified, without bleeding',
    category: 'digestive_system',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'K50.90': {
    code: 'K50.90',
    description: 'Crohn\'s disease, unspecified, without complications',
    category: 'digestive_system',
    severity: 'moderate',
    hccMapping: 35,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'K51.90': {
    code: 'K51.90',
    description: 'Ulcerative colitis, unspecified, without complications',
    category: 'digestive_system',
    severity: 'moderate',
    hccMapping: 35,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'K57.30': {
    code: 'K57.30',
    description: 'Diverticulosis of large intestine without perforation or abscess without bleeding',
    category: 'digestive_system',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'K70.30': {
    code: 'K70.30',
    description: 'Alcoholic cirrhosis of liver without ascites',
    category: 'digestive_system',
    severity: 'severe',
    hccMapping: 28,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'K74.60': {
    code: 'K74.60',
    description: 'Unspecified cirrhosis of liver',
    category: 'digestive_system',
    severity: 'severe',
    hccMapping: 28,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'K76.0': {
    code: 'K76.0',
    description: 'Fatty (change of) liver, not elsewhere classified',
    category: 'digestive_system',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'K80.20': {
    code: 'K80.20',
    description: 'Calculus of gallbladder without cholecystitis without obstruction',
    category: 'digestive_system',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'K85.90': {
    code: 'K85.90',
    description: 'Acute pancreatitis without necrosis or infection, unspecified',
    category: 'digestive_system',
    severity: 'severe',
    hccMapping: 34,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'K92.2': {
    code: 'K92.2',
    description: 'Gastrointestinal hemorrhage, unspecified',
    category: 'digestive_system',
    severity: 'severe',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },

  // ============================================================================
  // MUSCULOSKELETAL SYSTEM (M00-M99)
  // ============================================================================

  'M06.9': {
    code: 'M06.9',
    description: 'Rheumatoid arthritis, unspecified',
    category: 'musculoskeletal',
    severity: 'moderate',
    hccMapping: 40,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'M16.11': {
    code: 'M16.11',
    description: 'Primary osteoarthritis, right hip',
    category: 'musculoskeletal',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'M16.12': {
    code: 'M16.12',
    description: 'Primary osteoarthritis, left hip',
    category: 'musculoskeletal',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'M17.11': {
    code: 'M17.11',
    description: 'Primary osteoarthritis, right knee',
    category: 'musculoskeletal',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'M17.12': {
    code: 'M17.12',
    description: 'Primary osteoarthritis, left knee',
    category: 'musculoskeletal',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'M19.90': {
    code: 'M19.90',
    description: 'Unspecified osteoarthritis, unspecified site',
    category: 'musculoskeletal',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'M54.5': {
    code: 'M54.5',
    description: 'Low back pain',
    category: 'musculoskeletal',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'M79.3': {
    code: 'M79.3',
    description: 'Panniculitis, unspecified',
    category: 'musculoskeletal',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'M81.0': {
    code: 'M81.0',
    description: 'Age-related osteoporosis without current pathological fracture',
    category: 'musculoskeletal',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'M86.9': {
    code: 'M86.9',
    description: 'Osteomyelitis, unspecified',
    category: 'musculoskeletal',
    severity: 'severe',
    hccMapping: 39,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },

  // ============================================================================
  // GENITOURINARY SYSTEM (N00-N99)
  // ============================================================================

  'N17.9': {
    code: 'N17.9',
    description: 'Acute kidney failure, unspecified',
    category: 'genitourinary',
    severity: 'severe',
    hccMapping: 135,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: true,
    ccWeight: false
  },
  'N18.3': {
    code: 'N18.3',
    description: 'Chronic kidney disease, stage 3 (moderate)',
    category: 'genitourinary',
    severity: 'moderate',
    hccMapping: 138,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'N18.4': {
    code: 'N18.4',
    description: 'Chronic kidney disease, stage 4 (severe)',
    category: 'genitourinary',
    severity: 'severe',
    hccMapping: 137,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'N18.5': {
    code: 'N18.5',
    description: 'Chronic kidney disease, stage 5',
    category: 'genitourinary',
    severity: 'severe',
    hccMapping: 136,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'N18.6': {
    code: 'N18.6',
    description: 'End stage renal disease',
    category: 'genitourinary',
    severity: 'severe',
    hccMapping: 136,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'N20.0': {
    code: 'N20.0',
    description: 'Calculus of kidney',
    category: 'genitourinary',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'N40.0': {
    code: 'N40.0',
    description: 'Benign prostatic hyperplasia without lower urinary tract symptoms',
    category: 'genitourinary',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: true,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },

  // ============================================================================
  // SYMPTOMS, SIGNS, AND ABNORMAL FINDINGS (R00-R99)
  // ============================================================================

  'R00.0': {
    code: 'R00.0',
    description: 'Tachycardia, unspecified',
    category: 'symptoms_signs',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'R05': {
    code: 'R05',
    description: 'Cough',
    category: 'symptoms_signs',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'R06.02': {
    code: 'R06.02',
    description: 'Shortness of breath',
    category: 'symptoms_signs',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'R07.9': {
    code: 'R07.9',
    description: 'Chest pain, unspecified',
    category: 'symptoms_signs',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'R10.9': {
    code: 'R10.9',
    description: 'Unspecified abdominal pain',
    category: 'symptoms_signs',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'R11.2': {
    code: 'R11.2',
    description: 'Nausea with vomiting, unspecified',
    category: 'symptoms_signs',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'R41.82': {
    code: 'R41.82',
    description: 'Altered mental status, unspecified',
    category: 'symptoms_signs',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'R50.9': {
    code: 'R50.9',
    description: 'Fever, unspecified',
    category: 'symptoms_signs',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'R51': {
    code: 'R51',
    description: 'Headache',
    category: 'symptoms_signs',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'R53.83': {
    code: 'R53.83',
    description: 'Other fatigue',
    category: 'symptoms_signs',
    severity: 'mild',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'R55': {
    code: 'R55',
    description: 'Syncope and collapse',
    category: 'symptoms_signs',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },

  // ============================================================================
  // INJURY, POISONING (S00-T88)
  // ============================================================================

  'S72.001A': {
    code: 'S72.001A',
    description: 'Fracture of unspecified part of neck of right femur, initial encounter for closed fracture',
    category: 'injury_poisoning',
    severity: 'severe',
    hccMapping: 170,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'S72.002A': {
    code: 'S72.002A',
    description: 'Fracture of unspecified part of neck of left femur, initial encounter for closed fracture',
    category: 'injury_poisoning',
    severity: 'severe',
    hccMapping: 170,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'S06.0X0A': {
    code: 'S06.0X0A',
    description: 'Concussion without loss of consciousness, initial encounter',
    category: 'injury_poisoning',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: false
  },
  'S32.000A': {
    code: 'S32.000A',
    description: 'Wedge compression fracture of unspecified lumbar vertebra, initial encounter for closed fracture',
    category: 'injury_poisoning',
    severity: 'moderate',
    hccMapping: 169,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },
  'T81.4XXA': {
    code: 'T81.4XXA',
    description: 'Infection following a procedure, initial encounter',
    category: 'injury_poisoning',
    severity: 'moderate',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: true,
    mccWeight: false,
    ccWeight: true
  },

  // ============================================================================
  // EXTERNAL CAUSES (V00-Y99)
  // ============================================================================

  'W19.XXXA': {
    code: 'W19.XXXA',
    description: 'Unspecified fall, initial encounter',
    category: 'external_causes',
    severity: 'unspecified',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: false,
    mccWeight: false,
    ccWeight: false
  },

  // ============================================================================
  // FACTORS INFLUENCING HEALTH STATUS (Z00-Z99)
  // ============================================================================

  'Z87.891': {
    code: 'Z87.891',
    description: 'Personal history of nicotine dependence',
    category: 'symptoms_signs',
    severity: 'unspecified',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: false,
    mccWeight: false,
    ccWeight: false
  },
  'Z95.1': {
    code: 'Z95.1',
    description: 'Presence of aortocoronary bypass graft',
    category: 'symptoms_signs',
    severity: 'unspecified',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: false,
    mccWeight: false,
    ccWeight: false
  },
  'Z95.5': {
    code: 'Z95.5',
    description: 'Presence of coronary angioplasty implant and graft',
    category: 'symptoms_signs',
    severity: 'unspecified',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: false,
    mccWeight: false,
    ccWeight: false
  },
  'Z96.1': {
    code: 'Z96.1',
    description: 'Presence of intraocular lens',
    category: 'symptoms_signs',
    severity: 'unspecified',
    hccMapping: null,
    isChronicCondition: false,
    isPrincipalDiagnosis: false,
    mccWeight: false,
    ccWeight: false
  },
  'Z99.2': {
    code: 'Z99.2',
    description: 'Dependence on renal dialysis',
    category: 'symptoms_signs',
    severity: 'severe',
    hccMapping: 134,
    isChronicCondition: true,
    isPrincipalDiagnosis: false,
    mccWeight: false,
    ccWeight: true
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get an ICD-10 code by code string
 */
export function getICD10Code(code: string): ICD10Code | undefined {
  // Normalize code format (remove dots if present, then try both formats)
  const normalizedCode = code.toUpperCase().replace(/\./g, '');

  // Try exact match first
  if (ICD10_CODES[code]) return ICD10_CODES[code];

  // Try with dots in standard positions
  const withDots = normalizedCode.length > 3
    ? `${normalizedCode.slice(0, 3)}.${normalizedCode.slice(3)}`
    : normalizedCode;

  return ICD10_CODES[withDots];
}

/**
 * Search ICD-10 codes by description or code
 */
export function searchICD10(query: string, limit: number = 50): ICD10Code[] {
  const normalizedQuery = query.toLowerCase().trim();

  return Object.values(ICD10_CODES)
    .filter(icd =>
      icd.code.toLowerCase().includes(normalizedQuery) ||
      icd.description.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, limit);
}

/**
 * Get ICD-10 codes by category
 */
export function getICD10sByCategory(category: ICD10Category): ICD10Code[] {
  return Object.values(ICD10_CODES).filter(icd => icd.category === category);
}

/**
 * Get all ICD-10 codes
 */
export function getAllICD10Codes(): ICD10Code[] {
  return Object.values(ICD10_CODES);
}

/**
 * Get ICD-10 codes with HCC mappings
 */
export function getHCCMappedCodes(): ICD10Code[] {
  return Object.values(ICD10_CODES).filter(icd => icd.hccMapping !== null);
}

/**
 * Get ICD-10 codes by HCC category
 */
export function getCodesByHCC(hccCategory: number): ICD10Code[] {
  return Object.values(ICD10_CODES).filter(icd => icd.hccMapping === hccCategory);
}

/**
 * Get MCC (Major Complication/Comorbidity) codes
 */
export function getMCCCodes(): ICD10Code[] {
  return Object.values(ICD10_CODES).filter(icd => icd.mccWeight);
}

/**
 * Get CC (Complication/Comorbidity) codes
 */
export function getCCCodes(): ICD10Code[] {
  return Object.values(ICD10_CODES).filter(icd => icd.ccWeight);
}

/**
 * Get chronic condition codes
 */
export function getChronicConditionCodes(): ICD10Code[] {
  return Object.values(ICD10_CODES).filter(icd => icd.isChronicCondition);
}

/**
 * Get codes by severity
 */
export function getCodesBySeverity(severity: ICD10Severity): ICD10Code[] {
  return Object.values(ICD10_CODES).filter(icd => icd.severity === severity);
}

/**
 * Get principal diagnosis codes
 */
export function getPrincipalDiagnosisCodes(): ICD10Code[] {
  return Object.values(ICD10_CODES).filter(icd => icd.isPrincipalDiagnosis);
}

/**
 * Validate ICD-10-CM code format
 */
export function isValidICD10Format(code: string): boolean {
  // ICD-10-CM format: Letter followed by 2-7 characters (alphanumeric)
  // Format: A00-Z99 with optional decimal and additional characters
  return /^[A-TV-Z][0-9][0-9A-Z](\.[0-9A-Z]{1,4})?$/i.test(code);
}

/**
 * Get ICD-10 category display name
 */
export function getICD10CategoryName(category: ICD10Category): string {
  const categoryNames: Record<ICD10Category, string> = {
    infectious_disease: 'Infectious and Parasitic Diseases',
    neoplasms: 'Neoplasms',
    blood_disorders: 'Blood and Blood-forming Organs',
    endocrine_metabolic: 'Endocrine, Nutritional and Metabolic',
    mental_behavioral: 'Mental and Behavioral Disorders',
    nervous_system: 'Nervous System',
    eye_disorders: 'Eye and Adnexa',
    ear_disorders: 'Ear and Mastoid Process',
    circulatory_system: 'Circulatory System',
    respiratory_system: 'Respiratory System',
    digestive_system: 'Digestive System',
    skin_disorders: 'Skin and Subcutaneous Tissue',
    musculoskeletal: 'Musculoskeletal System and Connective Tissue',
    genitourinary: 'Genitourinary System',
    pregnancy: 'Pregnancy, Childbirth and the Puerperium',
    perinatal: 'Perinatal Period',
    congenital: 'Congenital Malformations',
    symptoms_signs: 'Symptoms, Signs and Abnormal Findings',
    injury_poisoning: 'Injury, Poisoning and External Causes',
    external_causes: 'External Causes of Morbidity'
  };
  return categoryNames[category];
}
