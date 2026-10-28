import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import {
  Hospital,
  Staff,
  User,
  Patient,
  Caregiver,
  PatientCaregiver,
  Discharge,
  Prescription,
  AdherenceLog,
  Followup,
  Investigation,
  SymptomReport,
  RiskAssessment,
  Alert,
  Consent,
  SchemeEligibility,
  EducationContent
} from '../models/index.js';
import { evaluateRisk } from '@healthverse/shared';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthverse';

export async function runSeed() {
  console.log('Connecting to MongoDB for seeding HealthVerse database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB. Clearing existing collections...');

  await Promise.all([
    Hospital.deleteMany({}),
    Staff.deleteMany({}),
    User.deleteMany({}),
    Patient.deleteMany({}),
    Caregiver.deleteMany({}),
    PatientCaregiver.deleteMany({}),
    Discharge.deleteMany({}),
    Prescription.deleteMany({}),
    AdherenceLog.deleteMany({}),
    Followup.deleteMany({}),
    Investigation.deleteMany({}),
    SymptomReport.deleteMany({}),
    RiskAssessment.deleteMany({}),
    Alert.deleteMany({}),
    Consent.deleteMany({}),
    SchemeEligibility.deleteMany({}),
    EducationContent.deleteMany({})
  ]);

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Create Demo Hospital
  console.log('Seeding Demo Hospital...');
  const hospital = await Hospital.create({
    name: 'District Sub-Divisional Hospital & Trauma Centre, Mandvi',
    facilityCode: 'HV-HOSP-01',
    address: {
      street: 'Station Road, Taluka Mandvi',
      district: 'Kutch',
      state: 'Gujarat',
      pincode: '370465'
    },
    contactPhone: '+91 2834 220101',
    active: true
  });

  // 2. Create Users & Staff
  console.log('Seeding Hospital Staff...');
  // 1 Admin
  const adminUser = await User.create({
    email: 'admin@healthverse.local',
    phone: '9800000001',
    passwordHash: defaultPassword,
    role: 'hospital_admin',
    language: 'en'
  });
  const adminStaff = await Staff.create({
    user: adminUser._id,
    hospital: hospital._id,
    role: 'hospital_admin',
    name: 'Dr. Ramesh Patel',
    phone: '9800000001',
    specialization: 'Hospital Administration & Public Health'
  });

  // 2 Doctors
  const doctor1User = await User.create({
    email: 'doctor1@healthverse.local',
    phone: '9800000002',
    passwordHash: defaultPassword,
    role: 'doctor',
    language: 'en'
  });
  const doctor1Staff = await Staff.create({
    user: doctor1User._id,
    hospital: hospital._id,
    role: 'doctor',
    name: 'Dr. Ananya Sharma',
    phone: '9800000002',
    specialization: 'Internal Medicine'
  });

  const doctor2User = await User.create({
    email: 'doctor2@healthverse.local',
    phone: '9800000003',
    passwordHash: defaultPassword,
    role: 'doctor',
    language: 'hi'
  });
  const doctor2Staff = await Staff.create({
    user: doctor2User._id,
    hospital: hospital._id,
    role: 'doctor',
    name: 'Dr. Vikram Mehta',
    phone: '9800000003',
    specialization: 'General Surgery & Critical Care'
  });

  // 2 Nurses
  const nurse1User = await User.create({
    email: 'nurse1@healthverse.local',
    phone: '9800000004',
    passwordHash: defaultPassword,
    role: 'nurse',
    language: 'gu'
  });
  const nurse1Staff = await Staff.create({
    user: nurse1User._id,
    hospital: hospital._id,
    role: 'nurse',
    name: 'Sister Priya Nair',
    phone: '9800000004',
    specialization: 'Post-Operative Ward'
  });

  const nurse2User = await User.create({
    email: 'nurse2@healthverse.local',
    phone: '9800000005',
    passwordHash: defaultPassword,
    role: 'nurse',
    language: 'en'
  });
  const nurse2Staff = await Staff.create({
    user: nurse2User._id,
    hospital: hospital._id,
    role: 'nurse',
    name: 'Sister Meena Desai',
    phone: '9800000005',
    specialization: 'Emergency & Triage'
  });

  // 1 CHW (Community Health Worker / ASHA)
  const chwUser = await User.create({
    email: 'chw@healthverse.local',
    phone: '9800000006',
    passwordHash: defaultPassword,
    role: 'chw',
    language: 'gu'
  });
  const chwStaff = await Staff.create({
    user: chwUser._id,
    hospital: hospital._id,
    role: 'chw',
    name: 'Sunita Devi',
    phone: '9800000006',
    specialization: 'Community Health Worker / ASHA'
  });

  // 3. Create Caregivers
  console.log('Seeding Caregivers...');
  const caregiver1User = await User.create({
    email: 'caregiver1@healthverse.local',
    phone: '9800000020',
    passwordHash: defaultPassword,
    role: 'caregiver',
    language: 'hi'
  });
  const caregiver1 = await Caregiver.create({
    user: caregiver1User._id,
    name: 'Amit Verma',
    phone: '9800000020',
    language: 'hi'
  });

  const caregiver2User = await User.create({
    email: 'caregiver2@healthverse.local',
    phone: '9800000021',
    passwordHash: defaultPassword,
    role: 'caregiver',
    language: 'gu'
  });
  const caregiver2 = await Caregiver.create({
    user: caregiver2User._id,
    name: 'Bhavna Patel',
    phone: '9800000021',
    language: 'gu'
  });

  // 4. Create 10 Patients with Realistic Discharges & Care
  console.log('Seeding 10 Patients with clinical histories...');

  const patientSeedData = [
    {
      id: 'HV-2026-001',
      name: 'Rajesh Verma',
      phone: '9800000011',
      email: 'rajesh.verma@example.local',
      dob: new Date('1964-05-12'),
      gender: 'male',
      language: 'hi',
      address: 'House 42, Gadhada Road, Mandvi Rural',
      diagnosis: 'Acute ST-Elevation Myocardial Infarction (Post-PCI)',
      summary: 'Patient presented with acute chest pain; underwent emergency coronary stenting with drug-eluting stent to LAD. Discharged stable on dual antiplatelet therapy.',
      warningSigns: ['Recurrent chest pain or heaviness', 'Unusual shortness of breath', 'Bleeding gums or black stools'],
      doctor: doctor1Staff,
      nurse: nurse1Staff,
      caregiver: caregiver1,
      relationship: 'child',
      meds: [
        { name: 'Aspirin', dosage: '75mg once daily', critical: true, timesPerDay: 1, timings: [{ time: '09:00', label: 'Morning' }] },
        { name: 'Clopidogrel', dosage: '75mg once daily', critical: true, timesPerDay: 1, timings: [{ time: '09:00', label: 'Morning' }] },
        { name: 'Atorvastatin', dosage: '40mg once at night', critical: true, timesPerDay: 1, timings: [{ time: '21:00', label: 'Night' }] },
        { name: 'Metoprolol Succinate', dosage: '25mg once daily', critical: false, timesPerDay: 1, timings: [{ time: '09:00', label: 'Morning' }] }
      ],
      investigation: { testName: 'Lipid Profile & Serum Creatinine', status: 'ordered', instructions: 'Fasting 12 hours required' },
      followupDays: 7,
      symptomsScenario: 'missed_critical' // Triggers high risk due to 3 consecutive missed critical doses
    },
    {
      id: 'HV-2026-002',
      name: 'Sunita Patel',
      phone: '9800000012',
      email: 'sunita.patel@example.local',
      dob: new Date('1988-11-20'),
      gender: 'female',
      language: 'gu',
      address: 'Plot 18, Khari River Bank, Mandvi',
      diagnosis: 'Acute Appendicitis (Laparoscopic Appendectomy)',
      summary: 'Underwent uncomplicated laparoscopic appendectomy. Wound clean, ambulating well, tolerating normal soft diet.',
      warningSigns: ['Fever over 38.5°C', 'Severe abdominal cramps', 'Wound redness or discharge'],
      doctor: doctor2Staff,
      nurse: nurse1Staff,
      caregiver: caregiver2,
      relationship: 'sibling',
      meds: [
        { name: 'Cefixime', dosage: '200mg twice daily', critical: true, timesPerDay: 2, timings: [{ time: '08:00', label: 'Morning' }, { time: '20:00', label: 'Night' }] },
        { name: 'Paracetamol', dosage: '650mg as needed for pain', critical: false, timesPerDay: 3, timings: [{ time: '08:00', label: 'Morning' }, { time: '14:00', label: 'Afternoon' }, { time: '20:00', label: 'Night' }] }
      ],
      investigation: { testName: 'Post-op CBC & Wound Check', status: 'resulted', result: 'WBC 7,200/uL - Normal resolution', resultedAt: new Date() },
      followupDays: 5,
      symptomsScenario: 'normal'
    },
    {
      id: 'HV-2026-003',
      name: 'Hasmukh Patel',
      phone: '9800000013',
      email: 'hasmukh.patel@example.local',
      dob: new Date('1956-02-14'),
      gender: 'male',
      language: 'gu',
      address: 'Wadi Vistar, Near Primary School, Mota Mandvi',
      diagnosis: 'Congestive Heart Failure Exacerbation & Cor Pulmonale',
      summary: 'Admitted with severe orthopnea and peripheral edema. Treated with IV diuretics, now stable on oral regimen with fluid restriction (1.5L/day).',
      warningSigns: ['Rapid weight gain (>1.5kg in 2 days)', 'Swelling in feet or legs', 'Difficulty breathing lying flat'],
      doctor: doctor1Staff,
      nurse: nurse2Staff,
      meds: [
        { name: 'Furosemide (Lasix)', dosage: '40mg morning', critical: true, timesPerDay: 1, timings: [{ time: '08:00', label: 'Morning' }] },
        { name: 'Spironolactone', dosage: '25mg once daily', critical: true, timesPerDay: 1, timings: [{ time: '08:00', label: 'Morning' }] },
        { name: 'Enalapril', dosage: '5mg twice daily', critical: false, timesPerDay: 2, timings: [{ time: '08:00', label: 'Morning' }, { time: '20:00', label: 'Night' }] }
      ],
      investigation: { testName: 'Serum Electrolytes (Sodium, Potassium)', status: 'collected', sampleCollectedDate: new Date() },
      followupDays: 7,
      symptomsScenario: 'moderate_breathlessness'
    },
    {
      id: 'HV-2026-004',
      name: 'Laxmi Rathod',
      phone: '9800000014',
      email: 'laxmi.rathod@example.local',
      dob: new Date('1997-07-08'),
      gender: 'female',
      language: 'hi',
      address: 'Anganwadi Road, Village Gundiyali',
      diagnosis: 'Emergency Lower Segment Cesarean Section (LSCS)',
      summary: 'Delivered healthy female infant. Post-operative period uneventful, wound healing primarily. Counselled on exclusive breastfeeding and neonatal thermal care.',
      warningSigns: ['Heavy bleeding soaking >1 pad/hr', 'Foul smelling discharge', 'Fever or chills'],
      doctor: doctor2Staff,
      nurse: nurse1Staff,
      meds: [
        { name: 'Iron & Folic Acid', dosage: '100mg elemental iron once daily', critical: false, timesPerDay: 1, timings: [{ time: '12:00', label: 'Afternoon' }] },
        { name: 'Calcium Carbonate + Vit D3', dosage: '500mg twice daily', critical: false, timesPerDay: 2, timings: [{ time: '09:00', label: 'Morning' }, { time: '21:00', label: 'Night' }] }
      ],
      investigation: { testName: 'Hemoglobin Check', status: 'resulted', result: 'Hb 10.4 g/dL', resultedAt: new Date() },
      followupDays: 10,
      symptomsScenario: 'normal'
    },
    {
      id: 'HV-2026-005',
      name: 'Devendra Solanki',
      phone: '9800000015',
      email: 'devendra.solanki@example.local',
      dob: new Date('1972-09-30'),
      gender: 'male',
      language: 'gu',
      address: 'Main Bazaar, Bada Village',
      diagnosis: 'Severe Community-Acquired Pneumonia with Hypoxia',
      summary: 'Admitted with fever, cough and SpO2 88%. Responded well to IV Ceftriaxone, Azithromycin and oxygen therapy. Weaned off oxygen prior to discharge.',
      warningSigns: ['SpO2 falling below 92%', 'High spiking fever', 'Confusion or chest tightness'],
      doctor: doctor1Staff,
      nurse: nurse2Staff,
      meds: [
        { name: 'Amoxicillin-Clavulanate', dosage: '625mg thrice daily', critical: true, timesPerDay: 3, timings: [{ time: '08:00', label: 'Morning' }, { time: '14:00', label: 'Afternoon' }, { time: '20:00', label: 'Night' }] },
        { name: 'Levocetirizine', dosage: '5mg at night', critical: false, timesPerDay: 1, timings: [{ time: '21:00', label: 'Night' }] }
      ],
      investigation: { testName: 'Follow-up Chest X-Ray', status: 'ordered', instructions: 'Review right lower lobe clearance' },
      followupDays: 4,
      symptomsScenario: 'critical_hypoxia' // Triggers Critical Alert: SpO2 90% + Fever 39.1°C
    },
    {
      id: 'HV-2026-006',
      name: 'Kamla Ben',
      phone: '9800000016',
      email: 'kamla.ben@example.local',
      dob: new Date('1960-03-22'),
      gender: 'female',
      language: 'gu',
      address: 'Near Ramji Mandir, Salaya',
      diagnosis: 'Type 2 Diabetes Mellitus with Right Foot Neuropathic Ulcer (Debrided)',
      summary: 'Underwent minor surgical debridement of Wagner Grade 2 ulcer. Blood glucose stabilized with basal-bolus insulin regimen. Regular dressing required.',
      warningSigns: ['Spreading erythema around foot ulcer', 'Foul discharge', 'Unexplained shivering or fever'],
      doctor: doctor2Staff,
      nurse: nurse1Staff,
      meds: [
        { name: 'Insulin Glargine', dosage: '14 units subcutaneous at bedtime', critical: true, timesPerDay: 1, timings: [{ time: '21:30', label: 'Night' }] },
        { name: 'Metformin Hydrochloride', dosage: '500mg twice daily with meals', critical: false, timesPerDay: 2, timings: [{ time: '09:00', label: 'Morning' }, { time: '20:00', label: 'Night' }] }
      ],
      investigation: { testName: 'Fasting & Postprandial Blood Sugar', status: 'resulted', result: 'FBS: 132 mg/dL, PPBS: 178 mg/dL', resultedAt: new Date() },
      followupDays: 3,
      symptomsScenario: 'wound_redness'
    },
    {
      id: 'HV-2026-007',
      name: 'Bhupat Singh',
      phone: '9800000017',
      email: 'bhupat.singh@example.local',
      dob: new Date('1979-12-05'),
      gender: 'male',
      language: 'hi',
      address: 'Farm Cluster 7, Mandvi Outskirts',
      diagnosis: 'Closed Fracture Shaft of Right Femur (Intramedullary Nailing)',
      summary: 'Internal fixation performed successfully. Advised non-weight bearing mobilization with crutches and DVT prophylaxis.',
      warningSigns: ['Sudden calf swelling or severe tenderness', 'Shortness of breath', 'High wound fever'],
      doctor: doctor2Staff,
      nurse: nurse2Staff,
      meds: [
        { name: 'Enoxaparin (Low Mol Wt Heparin)', dosage: '40mg subcutaneous once daily', critical: true, timesPerDay: 1, timings: [{ time: '10:00', label: 'Morning' }] },
        { name: 'Tramadol + Paracetamol', dosage: '37.5mg/325mg as needed for severe pain', critical: false, timesPerDay: 2, timings: [{ time: '10:00', label: 'Morning' }, { time: '22:00', label: 'Night' }] }
      ],
      investigation: { testName: 'Right Thigh X-Ray AP & Lateral', status: 'ordered', instructions: 'Check nail alignment' },
      followupDays: 14,
      symptomsScenario: 'normal'
    },
    {
      id: 'HV-2026-008',
      name: 'Manjula Dave',
      phone: '9800000018',
      email: 'manjula.dave@example.local',
      dob: new Date('1968-08-17'),
      gender: 'female',
      language: 'gu',
      address: 'Brahmin Street, Mandvi',
      diagnosis: 'Severe Hypertensive Urgency & Accelerated Hypertension',
      summary: 'Admitted with BP 210/120 and occipital headache without acute end-organ damage. Gradually titrated down on combination antihypertensives.',
      warningSigns: ['Systolic BP > 180 or Diastolic > 110', 'Severe throbbing headache or visual blurring', 'Chest discomfort'],
      doctor: doctor1Staff,
      nurse: nurse1Staff,
      meds: [
        { name: 'Amlodipine', dosage: '10mg once daily', critical: true, timesPerDay: 1, timings: [{ time: '08:00', label: 'Morning' }] },
        { name: 'Telmisartan', dosage: '40mg once daily', critical: true, timesPerDay: 1, timings: [{ time: '08:00', label: 'Morning' }] }
      ],
      investigation: { testName: 'Serum Creatinine & Urine Microalbumin', status: 'resulted', result: 'Creatinine: 1.1 mg/dL, Urine Protein: Nil', resultedAt: new Date() },
      followupDays: 6,
      symptomsScenario: 'high_vomiting' // Triggers High Alert: Persistent vomiting & severe headache
    },
    {
      id: 'HV-2026-009',
      name: 'Suresh Chauhan',
      phone: '9800000019',
      email: 'suresh.chauhan@example.local',
      dob: new Date('1984-04-25'),
      gender: 'male',
      language: 'gu',
      address: 'Koliwad, Coastal Sector, Mandvi',
      diagnosis: 'Acute Bacterial Gastroenteritis with Moderate Dehydration',
      summary: 'Treated with IV Ringer Lactate and oral rehydration. Stool frequency normalized, oral intake restored.',
      warningSigns: ['Inability to retain fluids', 'No urine for 12 hours', 'High fever with bloody stools'],
      doctor: doctor1Staff,
      nurse: nurse2Staff,
      meds: [
        { name: 'Oral Rehydration Salts (ORS)', dosage: '1 packet in 1L boiled water daily', critical: false, timesPerDay: 3, timings: [{ time: '08:00', label: 'Morning' }, { time: '14:00', label: 'Afternoon' }, { time: '20:00', label: 'Night' }] },
        { name: 'Zinc Sulphate', dosage: '20mg once daily for 14 days', critical: false, timesPerDay: 1, timings: [{ time: '12:00', label: 'Afternoon' }] }
      ],
      investigation: { testName: 'Stool Routine & Microscopy', status: 'resulted', result: 'No ova or parasites seen', resultedAt: new Date() },
      followupDays: 7,
      symptomsScenario: 'normal'
    },
    {
      id: 'HV-2026-010',
      name: 'Geeta Parmar',
      phone: '9800000022',
      email: 'geeta.parmar@example.local',
      dob: new Date('1992-10-10'),
      gender: 'female',
      language: 'hi',
      address: 'Navi Vasahat, Mandvi',
      diagnosis: 'Acute Pyelonephritis (Complicated Urinary Tract Infection)',
      summary: 'Admitted with high fever and right flank pain. Urine culture grew E. coli sensitive to Nitrofurantoin and Ceftriaxone. Afebrile for 48 hours prior to discharge.',
      warningSigns: ['Recurrence of high fever or rigors', 'Severe back/flank pain', 'Burning with reduced urination'],
      doctor: doctor1Staff,
      nurse: nurse1Staff,
      meds: [
        { name: 'Nitrofurantoin MR', dosage: '100mg twice daily with meals', critical: true, timesPerDay: 2, timings: [{ time: '08:00', label: 'Morning' }, { time: '20:00', label: 'Night' }] }
      ],
      investigation: { testName: 'Repeat Urine Routine & Culture', status: 'ordered', instructions: 'Clean catch midstream morning sample' },
      followupDays: 7,
      symptomsScenario: 'normal'
    }
  ];

  const now = new Date();

  for (const pData of patientSeedData) {
    // Create Patient User
    const pUser = await User.create({
      email: pData.email,
      phone: pData.phone,
      passwordHash: defaultPassword,
      role: 'patient',
      language: pData.language
    });

    // Create Patient Profile
    const patient = await Patient.create({
      user: pUser._id,
      hospital: hospital._id,
      patientId: pData.id,
      name: pData.name,
      dob: pData.dob,
      gender: pData.gender,
      language: pData.language,
      phone: pData.phone,
      address: pData.address,
      medicalHistory: JSON.stringify(['Post-discharge recovery', pData.diagnosis]),
      eligibilityInfo: JSON.stringify({ hasAyushmanCard: true, bplCategory: 'State NFSA BPL' }),
      primaryDoctor: pData.doctor._id,
      primaryCHW: chwStaff._id,
      deviceId: 'seed-runner',
      syncStatus: 'synced'
    });

    // Add to CHW assigned patients
    await Staff.findByIdAndUpdate(chwStaff._id, {
      $addToSet: { assignedPatients: patient._id }
    });

    // Link Caregiver if available
    if (pData.caregiver) {
      await PatientCaregiver.create({
        patient: patient._id,
        caregiver: pData.caregiver._id,
        relationship: pData.relationship,
        alertsAllowed: true
      });

      // Grant consent
      await Consent.create({
        patient: patient._id,
        purpose: 'caregiver_access',
        grantedTo: pData.caregiver.user,
        grantedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      });
    }

    // Default Clinical Continuity & Emergency Consent
    await Consent.create({
      patient: patient._id,
      purpose: 'clinical_continuity',
      grantedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    });
    await Consent.create({
      patient: patient._id,
      purpose: 'emergency_sms_alerts',
      grantedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    });

    // Create Discharge
    const discharge = await Discharge.create({
      patient: patient._id,
      hospital: hospital._id,
      dischargeDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      admissionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      diagnosis: pData.diagnosis,
      summary: pData.summary,
      instructions: {
        diet: 'Low-salt, freshly prepared, balanced nutritious diet with plenty of clean drinking water.',
        activity: 'Light walking as tolerated. Avoid strenuous lifting or heavy exertion for 2 weeks.',
        warningSigns: pData.warningSigns,
        general: 'Take all medicines on time. Report any sudden discomfort to your visiting CHW or hospital immediately.'
      },
      treatingDoctor: pData.doctor._id,
      status: 'active'
    });

    // Create Prescriptions
    const createdPrescriptions = [];
    for (const med of pData.meds) {
      const presc = await Prescription.create({
        discharge: discharge._id,
        patient: patient._id,
        medicine: med.name,
        dosage: med.dosage,
        schedule: {
          timesPerDay: med.timesPerDay,
          timings: med.timings,
          foodTiming: 'after_food'
        },
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        critical: med.critical,
        instructions: med.critical ? 'CRITICAL MEDICATION: Do not skip without doctor order.' : 'Take with water after food.',
        syncStatus: 'synced'
      });
      createdPrescriptions.push(presc);
    }

    // Create Scheduled Follow-up
    await Followup.create({
      discharge: discharge._id,
      patient: patient._id,
      staff: pData.doctor._id,
      scheduledAt: new Date(Date.now() + pData.followupDays * 24 * 60 * 60 * 1000),
      status: 'scheduled',
      type: 'in_person',
      notes: 'Review clinical recovery, wound status and check baseline vitals.',
      syncStatus: 'synced'
    });

    // Create Investigation
    if (pData.investigation) {
      await Investigation.create({
        discharge: discharge._id,
        patient: patient._id,
        testName: pData.investigation.testName,
        status: pData.investigation.status,
        result: pData.investigation.result,
        resultedAt: pData.investigation.resultedAt,
        instructions: pData.investigation.instructions,
        syncStatus: 'synced'
      });
    }

    // Create PM-JAY Eligibility Record
    await SchemeEligibility.create({
      patient: patient._id,
      scheme: 'PM-JAY',
      result: 'likely_eligible',
      reasons: [
        'Possesses valid State BPL ration card under NFSA',
        'Rural SECC deprivation criteria satisfied (D1/D3 category)'
      ],
      nextSteps: [
        'Visit District Hospital Mandvi Ayushman Helpdesk with Ration Card and Aadhaar for Golden Card e-KYC',
        'Free post-discharge follow-up diagnostics covered under PM-JAY package guidelines'
      ],
      checkedBy: pData.doctor.user
    });

    // Seed Adherence Logs and Symptom Scenarios
    const adherenceLogsForEvaluation = [];

    // Past 3 days adherence
    for (let day = 3; day >= 1; day--) {
      for (const presc of createdPrescriptions) {
        let status = 'taken';
        if (pData.symptomsScenario === 'missed_critical' && presc.critical && day <= 2) {
          // Patient 1 missed 3 critical doses over last 2 days
          status = 'missed';
        }

        const log = await AdherenceLog.create({
          prescription: presc._id,
          patient: patient._id,
          dueAt: new Date(Date.now() - day * 24 * 60 * 60 * 1000 + 9 * 3600 * 1000),
          takenAt: status === 'taken' ? new Date(Date.now() - day * 24 * 60 * 60 * 1000 + 9.5 * 3600 * 1000) : undefined,
          status,
          loggedBy: pUser._id,
          syncStatus: 'synced'
        });
        adherenceLogsForEvaluation.push(log);
      }
    }

    // Symptom Reports and Alerts
    if (pData.symptomsScenario === 'critical_hypoxia') {
      // Patient 5: Devendra Solanki -> Critical Alert
      const report = await SymptomReport.create({
        patient: patient._id,
        reportedBy: pUser._id,
        symptoms: [
          { code: 'breathlessness', severity: 2, notes: 'Feeling short of breath when walking to bathroom' },
          { code: 'fever', severity: 2, notes: 'High fever started last evening' }
        ],
        vitals: {
          temperature: 39.1,
          pulse: 112,
          spo2: 90,
          bloodPressure: { systolic: 135, diastolic: 88 }
        },
        reportedAt: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago (escalation candidate)
        syncStatus: 'synced'
      });

      const assessmentResult = evaluateRisk({
        symptoms: report.symptoms,
        vitals: report.vitals,
        adherenceLogs: adherenceLogsForEvaluation,
        prescriptions: createdPrescriptions,
        assessedOn: 'server'
      });

      const assessment = await RiskAssessment.create({
        report: report._id,
        patient: patient._id,
        riskLevel: assessmentResult.riskLevel,
        redFlags: assessmentResult.redFlags,
        rulesFired: assessmentResult.rulesFired,
        explanation: assessmentResult.explanation,
        suggestedAction: assessmentResult.suggestedAction,
        assessedOn: 'server',
        rulesetVersion: '1.0.0',
        syncStatus: 'synced'
      });

      await Alert.create({
        assessment: assessment._id,
        patient: patient._id,
        hospital: hospital._id,
        riskLevel: 'critical',
        status: 'open',
        escalationLevel: 1, // Already unacknowledged for > 15m
        escalatedAt: new Date(Date.now() - 10 * 60 * 1000),
        assignedTo: pData.doctor._id
      });
    } else if (pData.symptomsScenario === 'high_vomiting') {
      // Patient 8: Manjula Dave -> High Alert
      const report = await SymptomReport.create({
        patient: patient._id,
        reportedBy: pUser._id,
        symptoms: [
          { code: 'persistent_vomiting', severity: 2, notes: 'Vomited three times this morning, unable to retain antihypertensive tablets' },
          { code: 'headache', severity: 2, notes: 'Heavy throbbing headache' }
        ],
        vitals: {
          temperature: 37.2,
          pulse: 98,
          spo2: 96,
          bloodPressure: { systolic: 172, diastolic: 104 }
        },
        reportedAt: new Date(Date.now() - 20 * 60 * 1000),
        syncStatus: 'synced'
      });

      const assessmentResult = evaluateRisk({
        symptoms: report.symptoms,
        vitals: report.vitals,
        adherenceLogs: adherenceLogsForEvaluation,
        prescriptions: createdPrescriptions,
        assessedOn: 'server'
      });

      const assessment = await RiskAssessment.create({
        report: report._id,
        patient: patient._id,
        riskLevel: assessmentResult.riskLevel,
        redFlags: assessmentResult.redFlags,
        rulesFired: assessmentResult.rulesFired,
        explanation: assessmentResult.explanation,
        suggestedAction: assessmentResult.suggestedAction,
        assessedOn: 'server',
        rulesetVersion: '1.0.0',
        syncStatus: 'synced'
      });

      await Alert.create({
        assessment: assessment._id,
        patient: patient._id,
        hospital: hospital._id,
        riskLevel: 'high',
        status: 'open',
        escalationLevel: 0,
        assignedTo: pData.doctor._id
      });
    } else if (pData.symptomsScenario === 'missed_critical') {
      // Patient 1: Rajesh Verma -> High Risk from Adherence failure
      const report = await SymptomReport.create({
        patient: patient._id,
        reportedBy: pUser._id,
        symptoms: [
          { code: 'fatigue', severity: 1, notes: 'Feeling slight weakness' }
        ],
        vitals: {
          temperature: 36.8,
          pulse: 78,
          spo2: 97,
          bloodPressure: { systolic: 128, diastolic: 82 }
        },
        reportedAt: new Date(Date.now() - 4 * 3600 * 1000),
        syncStatus: 'synced'
      });

      const assessmentResult = evaluateRisk({
        symptoms: report.symptoms,
        vitals: report.vitals,
        adherenceLogs: adherenceLogsForEvaluation,
        prescriptions: createdPrescriptions,
        assessedOn: 'server'
      });

      const assessment = await RiskAssessment.create({
        report: report._id,
        patient: patient._id,
        riskLevel: assessmentResult.riskLevel,
        redFlags: assessmentResult.redFlags,
        rulesFired: assessmentResult.rulesFired,
        explanation: assessmentResult.explanation,
        suggestedAction: assessmentResult.suggestedAction,
        assessedOn: 'server',
        rulesetVersion: '1.0.0',
        syncStatus: 'synced'
      });

      await Alert.create({
        assessment: assessment._id,
        patient: patient._id,
        hospital: hospital._id,
        riskLevel: 'critical',
        status: 'acknowledged',
        reviewer: doctor1Staff._id,
        acknowledgedAt: new Date(Date.now() - 2 * 3600 * 1000),
        clinicianDecision: {
          actionTaken: 'telephonic_reassurance',
          notes: 'Called son (caregiver Amit). Advised immediate resumption of Clopidogrel and Aspirin. CHW Sunita dispatched for home visit.',
          decisionTime: new Date(Date.now() - 2 * 3600 * 1000)
        },
        assignedTo: doctor1Staff._id
      });
    } else {
      // Normal/Low risk report
      const report = await SymptomReport.create({
        patient: patient._id,
        reportedBy: pUser._id,
        symptoms: [],
        vitals: {
          temperature: 36.9,
          pulse: 74,
          spo2: 98,
          bloodPressure: { systolic: 120, diastolic: 80 }
        },
        reportedAt: new Date(Date.now() - 12 * 3600 * 1000),
        syncStatus: 'synced'
      });

      const assessmentResult = evaluateRisk({
        symptoms: report.symptoms,
        vitals: report.vitals,
        adherenceLogs: adherenceLogsForEvaluation,
        prescriptions: createdPrescriptions,
        assessedOn: 'server'
      });

      await RiskAssessment.create({
        report: report._id,
        patient: patient._id,
        riskLevel: assessmentResult.riskLevel,
        redFlags: assessmentResult.redFlags,
        rulesFired: assessmentResult.rulesFired,
        explanation: assessmentResult.explanation,
        suggestedAction: assessmentResult.suggestedAction,
        assessedOn: 'server',
        rulesetVersion: '1.0.0',
        syncStatus: 'synced'
      });
    }
  }

  // 5. Seed Education Content in English, Hindi, and Gujarati
  console.log('Seeding Multilingual Education Content (EN, HI, GU)...');

  const educationArticles = [
    // 1. Wound Care
    {
      topic: 'wound_care',
      language: 'en',
      title: 'Post-Surgical Wound Care at Home',
      summary: 'Essential steps to keep surgical wounds clean, dry, and free from infection after discharge.',
      body: `1. Keep the dressing clean and dry. Avoid soaking in bathtubs or buckets.\n2. Wash hands thoroughly with soap before touching the wound area.\n3. Do not apply home powders, turmeric, or unprescribed ointments to the incision.\n4. Watch for warning signs: spreading redness, swelling, warmth, or foul-smelling yellow/green discharge.\n5. If you notice severe wound pain or opening of stitches, inform your CHW or doctor immediately.`,
      tags: ['wound', 'surgery', 'hygiene', 'infection_prevention'],
      readingTimeMinutes: 3,
      icon: 'Bandage'
    },
    {
      topic: 'wound_care',
      language: 'hi',
      title: 'घर पर ऑपरेशन के घाव की सही देखभाल',
      summary: 'डिस्चार्ज के बाद टांकों और घाव को सूखा, साफ और संक्रमण से सुरक्षित रखने के महत्वपूर्ण नियम।',
      body: `1. घाव की पट्टी को हमेशा सूखा और साफ रखें। नहाते समय पानी सीधे घाव पर न पड़ने दें।\n2. घाव को छूने से पहले अपने हाथों को साबुन और पानी से अच्छी तरह धोएं।\n3. घाव पर कभी भी हल्दी, भस्म, पाउडर या बिना डॉक्टर की सलाह के कोई मलहम न लगाएं।\n4. खतरे के संकेत: यदि घाव के आसपास लालिमा बढ़े, सूजन आए, या मवाद/बदबूदार पानी निकले तो तुरंत संपर्क करें।\n5. यदि टांके खुल जाएं या तेज दर्द हो, तो तुरंत अपने आशा कार्यकर्ता (CHW) या अस्पताल को सूचित करें।`,
      tags: ['घाव', 'सर्जरी', 'सफाई', 'संक्रमण_रोकथाम'],
      readingTimeMinutes: 3,
      icon: 'Bandage'
    },
    {
      topic: 'wound_care',
      language: 'gu',
      title: 'ઘરે ઓપરેશનના ઘાની યોગ્ય સંભાળ',
      summary: 'હોસ્પિટલમાંથી રજા મળ્યા પછી ઘાને સૂકો, સ્વચ્છ અને ચેપ મુક્ત રાખવા માટે જરૂરી સૂચનાઓ.',
      body: `1. ઘા પરનો પાટો હંમેશા સૂકો અને સ્વચ્છ રાખો. નહાતી વખતે ઘા પર પાણી પડવા ન દો.\n2. ઘાને અડકતા પહેલા હાથ સાબુ અને પાણીથી સારી રીતે સાફ કરો.\n3. ઘા પર હળદર, રાખ કે ડોક્ટરની સલાહ વગર કોઈ મલમ લગાવશો નહીં.\n4. ચેતવણીના લક્ષણો: ઘા પાસે લાલાશ વધવી, સોજો આવવો, અથવા પરુ નીકળવું.\n5. જો અતિશય દુખાવો થાય અથવા ટાંકા ખુલી જાય તો તરત જ આશા બહેન અથવા હોસ્પિટલનો સંપર્ક કરો.`,
      tags: ['ઘા', 'સર્જરી', 'સ્વચ્છતા', 'ચેપ_નિવારણ'],
      readingTimeMinutes: 3,
      icon: 'Bandage'
    },
    // 2. Medication Adherence
    {
      topic: 'medication_adherence',
      language: 'en',
      title: 'Why Completing Your Medicines is Life-Saving',
      summary: 'Understand the danger of stopping medicines early and how to maintain a simple daily routine.',
      body: `1. Always take medicines at the exact times specified on your discharge card.\n2. Do NOT stop taking antibiotics or blood thinners simply because you feel better. Stopping early allows disease recurrence and antibiotic resistance.\n3. Use meal times (breakfast, lunch, dinner) or sunrise/sunset as natural memory triggers.\n4. If you miss a dose, never double the next dose without consulting your clinician.\n5. Keep your medicines in a cool, dry place away from direct sunlight and children's reach.`,
      tags: ['medicines', 'adherence', 'routine', 'safety'],
      readingTimeMinutes: 3,
      icon: 'Pill'
    },
    {
      topic: 'medication_adherence',
      language: 'hi',
      title: 'दवाइयों का पूरा कोर्स लेना क्यों जीवन रक्षक है',
      summary: 'दवाएं बीच में बंद करने के खतरे और समय पर दवाई लेने के आसान तरीके समझें।',
      body: `1. अस्पताल के डिस्चार्ज पर्चे में बताए गए समय पर ही दवाएं लें।\n2. तबीयत में थोड़ा सुधार होते ही दवाइयां कभी बंद न करें। विशेषकर दिल, बीपी और एंटीबायोटिक दवाएं बंद करने से बीमारी दोबारा गंभीर हो सकती है।\n3. दवा का समय याद रखने के लिए सुबह की चाय, दोपहर के भोजन या रात के खाने का नियम बनाएं।\n4. यदि कोई खुराक छूट जाए, तो अगली बार दो गोलियां एक साथ न खाएं।\n5. दवाइयों को सीधी धूप और बच्चों की पहुंच से दूर सूखी जगह पर रखें।`,
      tags: ['दवाई', 'नियम', 'सुरक्षा', 'स्वास्थ्य'],
      readingTimeMinutes: 3,
      icon: 'Pill'
    },
    {
      topic: 'medication_adherence',
      language: 'gu',
      title: 'દવાઓનો પૂરો કોર્સ લેવો શા માટે જીવન રક્ષક છે',
      summary: 'દવાઓ અધવચ્ચે બંધ કરવાના જોખમો અને સમયસર દવા લેવાની સાદી રીત.',
      body: `1. ડિસ્ચાર્જ કાર્ડમાં જણાવેલ સમય પ્રમાણે જ નિયમિત દવા લો.\n2. સારું લાગવા માંડે એટલે એન્ટીબાયોટીક કે બીપી/હૃદયની દવાઓ ક્યારેય બંધ કરશો નહીં.\n3. સવારની ચા, બપોરનું ભોજન કે રાતના જમવાના સમય સાથે દવા જોડવાથી ભૂલ પડતી નથી.\n4. જો કોઈ વખત દવા લેવાનું ભૂલી જાઓ, તો બીજી વખતે બમણી ગોળીઓ એકસાથે લેશો નહીં.\n5. દવાઓને સૂકી જગ્યાએ અને બાળકોના હાથ ન પહોંચે તે રીતે સાચવીને રાખો.`,
      tags: ['દવા', 'નિયમિતતા', 'સુરક્ષા'],
      readingTimeMinutes: 3,
      icon: 'Pill'
    },
    // 3. Warning Signs
    {
      topic: 'warning_signs',
      language: 'en',
      title: 'Emergency Warning Signs: When to Call 108',
      summary: 'Critical red flags after hospital discharge that require immediate emergency attention.',
      body: `Immediately call 108 or go to the nearest emergency room if you experience any of the following:\n- Sudden, crushing chest pain or left arm/jaw pain.\n- Severe difficulty breathing or gasping for breath at rest.\n- Sudden confusion, slurred speech, or facial drooping.\n- Blood in cough, vomit, or heavy uncontrolled bleeding.\n- Inability to retain any liquids or fever exceeding 38.5°C (101.3°F).\nDo not wait until morning if these symptoms appear at night.`,
      tags: ['emergency', 'warning_signs', '108', 'critical'],
      readingTimeMinutes: 2,
      icon: 'AlertTriangle'
    },
    {
      topic: 'warning_signs',
      language: 'hi',
      title: 'आपातकालीन खतरे के लक्षण: कब तुरंत 108 पर कॉल करें',
      summary: 'अस्पताल से छुट्टी के बाद वे गंभीर संकेत जिनमें तुरंत डॉक्टरी सहायता आवश्यक है।',
      body: `यदि आपको इनमें से कोई भी लक्षण दिखाई दे तो तुरंत 108 एम्बुलेंस बुलाएं या नजदीकी अस्पताल जाएं:\n- सीने में तेज दर्द, भारीपन या बाएं हाथ/जबड़े में दर्द का फैलना।\n- सांस लेने में अत्यधिक तकलीफ या दम घुटना।\n- अचानक बेहोशी, चक्कर, बोलने में लड़खड़ाहट या चेहरा टेढ़ा होना।\n- उल्टी या खांसी में खून आना, या किसी जगह से लगातार खून बहना।\n- तेज बुखार (38.5°C से अधिक) या लगातार उल्टियां होना।\nरात के समय भी सुबह होने का इंतजार न करें, तुरंत मदद लें।`,
      tags: ['आपातकाल', 'खतरे_के_निशान', '108', 'सीने_का_दर्द'],
      readingTimeMinutes: 2,
      icon: 'AlertTriangle'
    },
    {
      topic: 'warning_signs',
      language: 'gu',
      title: 'તાકીદના ચેતવણી ચિહ્નો: ક્યારે તાત્કાલિક 108 પર કોલ કરવો',
      summary: 'ડિસ્ચાર્જ પછીના ગંભીર લક્ષણો જેમાં ક્ષણનો પણ વિલંબ કર્યા વગર મદદ લેવી જરૂરી છે.',
      body: `જો નીચેનામાંથી કોઈ પણ લક્ષણ જણાય તો તરત જ 108 પર ફોન કરો અથવા નજીકની હોસ્પિટલ પહોંચો:\n- છાતીમાં અસહ્ય દુખાવો, ભારેપણું કે ડાબા હાથમાં દુખાવો.\n- શ્વાસ લેવામાં અતિશય તકલીફ કે દમ ચઢવો.\n- અચાનક ચક્કર આવવા, બોલવામાં તકલીફ થવી કે બેભાન થવું.\n- ઉધરસ કે ઉલટીમાં લોહી પડવું.\n- ૧૦૧.૩ ડિગ્રી (38.5°C) થી વધુ તાવ અથવા સતત ઉલટી થવી.\nરાત્રિના સમયે સવાર થવાની રાહ ન જુઓ, તાત્કાલિક સારવાર મેળવો.`,
      tags: ['ઇમરજન્સી', 'ચેતવણી', '108', 'તાકીદ'],
      readingTimeMinutes: 2,
      icon: 'AlertTriangle'
    },
    // 4. PM-JAY Benefits
    {
      topic: 'pmjay_benefits',
      language: 'en',
      title: 'Ayushman Bharat PM-JAY: Post-Hospitalization Benefits',
      summary: 'Learn about financial protection up to ₹5 Lakhs and post-discharge diagnostic coverage.',
      body: `1. Ayushman Bharat PM-JAY provides health cover of ₹5 Lakh per family per year for secondary and tertiary care.\n2. The package includes 3 days of pre-hospitalization and up to 15 days of post-hospitalization diagnostics and medicines.\n3. Keep your Ayushman Card and Discharge Card safe for free follow-up checks at empaneled hospitals.\n4. No out-of-pocket payment should be made to empaneled government or private hospitals for approved procedures.\n5. For queries or grievance redressal, dial national toll-free helpline 14555.`,
      tags: ['pmjay', 'ayushman_bharat', 'insurance', 'benefits'],
      readingTimeMinutes: 3,
      icon: 'ShieldCheck'
    },
    {
      topic: 'pmjay_benefits',
      language: 'hi',
      title: 'आयुष्मान भारत PM-JAY: अस्पताल से छुट्टी के बाद मिलने वाले लाभ',
      summary: '5 लाख रुपये तक के मुफ्त इलाज और डिस्चार्ज के बाद 15 दिनों तक दवाओं/जांचों के अधिकार जानें।',
      body: `1. आयुष्मान भारत योजना के तहत प्रत्येक पात्र परिवार को प्रतिवर्ष ₹5 लाख तक का कैशलेस स्वास्थ्य सुरक्षा कवर मिलता है।\n2. पैकेज में अस्पताल में भर्ती होने से 3 दिन पहले और छुट्टी मिलने के 15 दिनों बाद तक की दवाएं और जांचें शामिल हैं।\n3. फॉलो-अप जांच के लिए अपना आयुष्मान गोल्डन कार्ड और डिस्चार्ज सारांश हमेशा साथ रखें।\n4. सूचीबद्ध सरकारी या निजी अस्पतालों में इलाज के लिए मरीज को कोई नकद भुगतान नहीं करना पड़ता।\n5. किसी भी सहायता या शिकायत के लिए राष्ट्रीय टोल-फ्री नंबर 14555 पर संपर्क करें।`,
      tags: ['आयुष्मान_भारत', 'पीएमजय', 'मुफ्त_इलाज', 'लाभ'],
      readingTimeMinutes: 3,
      icon: 'ShieldCheck'
    },
    {
      topic: 'pmjay_benefits',
      language: 'gu',
      title: 'આયુષ્માન ભારત PM-JAY: ડિસ્ચાર્જ પછી મળતા લાભો',
      summary: '૫ લાખ સુધીની મફત સારવાર અને હોસ્પિટલમાંથી રજા મળ્યા પછી ૧૫ દિવસ સુધી દવા-તપાસના લાભો.',
      body: `1. પ્રધાનમંત્રી જન આરોગ્ય યોજના (PM-JAY) હેઠળ દરેક પાત્ર કુટુંબને વાર્ષિક ₹૫ લાખનું કેશલેસ સુરક્ષા કવચ મળે છે.\n2. આ પેકેજમાં દાખલ થવાના ૩ દિવસ પહેલા અને ડિસ્ચાર્જ થયા પછીના ૧૫ દિવસ સુધીની દવાઓ અને લેબ તપાસો આવરી લેવાયેલ છે.\n3. હોસ્પિટલમાં ફરી તપાસ માટે જાઓ ત્યારે આયુષ્માન ગોલ્ડન કાર્ડ અને ડિસ્ચાર્જ કાર્ડ સાથે રાખો.\n4. માન્યતા પ્રાપ્ત હોસ્પિટલમાં માન્ય પેકેજ માટે દર્દીએ કોઈ વધારાના રોકડા રૂપિયા ચૂકવવાના રહેતા નથી.\n5. વધુ માહિતી અથવા સહાય માટે રાષ્ટ્રીય ટોલ-ફ્રી નંબર ૧૪૫૫૫ પર કોલ કરો.`,
      tags: ['આયુષ્માન_કાર્ડ', 'સરકારી_યોજના', 'પીએમજેએવાય'],
      readingTimeMinutes: 3,
      icon: 'ShieldCheck'
    }
  ];

  await EducationContent.insertMany(educationArticles);

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
  console.log(`Hospital: ${hospital.name} (Code: ${hospital.facilityCode})`);
  console.log('Demo Logins:');
  console.log('Hospital Admin: admin@healthverse.local / 9800000001 (password123)');
  console.log('Doctor 1: doctor1@healthverse.local / 9800000002 (password123)');
  console.log('Doctor 2: doctor2@healthverse.local / 9800000003 (password123)');
  console.log('Nurse 1: nurse1@healthverse.local / 9800000004 (password123)');
  console.log('Nurse 2: nurse2@healthverse.local / 9800000005 (password123)');
  console.log('CHW (ASHA): chw@healthverse.local / 9800000006 (password123)');
  console.log('Patient 1 (High Alert): 9800000011 (password123)');
  console.log('Patient 5 (Critical Alert): 9800000015 (password123)');
  console.log('Caregiver 1: caregiver1@healthverse.local / 9800000020 (password123)');
}

if (process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(() => {
      console.log('Seed execution finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed execution error:', err);
      process.exit(1);
    });
}
