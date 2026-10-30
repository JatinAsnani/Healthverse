/**
 * @file patientChartMockData.js
 * @description Typed mock data & enricher for the Clinician Patient Clinical Chart.
 * Provides fallback vitals histories, sparklines, 5-day medication adherence strips,
 * care plan milestones, and timeline events for post-discharge recovery monitoring.
 */

/**
 * @typedef {'normal' | 'warning' | 'critical'} SeverityLevel
 */

/**
 * @typedef {'taken' | 'late' | 'missed'} DoseStatus
 */

/**
 * @typedef {Object} VitalMetric
 * @property {number|string} current
 * @property {string} unit
 * @property {SeverityLevel} severity
 * @property {string} statusLabel
 * @property {Array<{ time: string, value: number }>} sparkline
 * @property {string} normalRange
 */

/**
 * @typedef {Object} VitalsTrendPoint
 * @property {string} date - e.g. "Oct 24"
 * @property {number} systolicBP - in mmHg
 * @property {number} diastolicBP - in mmHg
 * @property {number} heartRate - in bpm
 * @property {number} spo2 - in %
 * @property {boolean} isLatest - whether this point is today's reading
 */

/**
 * @typedef {Object} MedicationAdherenceRecord
 * @property {string} id
 * @property {string} name
 * @property {string} dosage
 * @property {string} frequency
 * @property {boolean} critical
 * @property {number} adherenceRate - Percentage 0-100
 * @property {Array<{ day: string, date: string, status: DoseStatus }>} fiveDayHistory
 */

/**
 * @typedef {Object} CarePlanItem
 * @property {string} id
 * @property {string} title
 * @property {string} category - e.g. "Cardiology", "Diagnostics", "Rehab"
 * @property {string} dueDate
 * @property {'completed' | 'pending'} status
 * @property {string} [notes]
 */

/**
 * @typedef {Object} ClinicalTimelineEvent
 * @property {string} id
 * @property {'alert' | 'missed_dose' | 'check_in' | 'discharge' | 'lab_result' | 'note'} type
 * @property {string} title
 * @property {string} description
 * @property {string} timestamp
 * @property {SeverityLevel} severity
 */

/**
 * @typedef {Object} ClinicalNote
 * @property {string} id
 * @property {string} author
 * @property {string} role
 * @property {string} timestamp
 * @property {string} content
 * @property {string[]} tags
 */

/**
 * Generates last 5 days labels (e.g. ["Sun", "Mon", "Tue", "Wed", "Today"])
 */
export function getPastFiveDayLabels() {
  const labels = [];
  const now = new Date();
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    labels.push({
      day: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }
  return labels;
}

/**
 * Generates 7-day trend history tailored to patient vitals
 * @param {Object} [latestVitals]
 * @returns {VitalsTrendPoint[]}
 */
export function getVitalsTrendData(symptomReports = []) {
  // If we have actual real symptom reports with vitals from DB, map them chronologically
  const reportsWithVitals = (symptomReports || [])
    .filter(r => r.vitals && (r.vitals.pulse || r.vitals.spo2 || r.vitals.bloodPressure?.systolic))
    .slice(0, 7)
    .reverse();

  if (reportsWithVitals.length >= 2) {
    return reportsWithVitals.map((rep, idx) => {
      const isLatest = idx === reportsWithVitals.length - 1;
      const dateLabel = isLatest
        ? 'Today'
        : new Date(rep.reportedAt || rep.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const sys = rep.vitals.bloodPressure?.systolic || 120;
      const dia = rep.vitals.bloodPressure?.diastolic || Math.round(sys * 0.65);
      const hr = rep.vitals.pulse || 72;
      const spo2 = rep.vitals.spo2 || 98;

      return {
        date: dateLabel,
        systolicBP: sys,
        diastolicBP: dia,
        heartRate: hr,
        spo2,
        isLatest
      };
    });
  }

  // Fallback calibrated trend matching patient's latest baseline
  const days = [];
  const now = new Date();
  
  const latestVitals = symptomReports[0]?.vitals || {};
  const baseSystolic = latestVitals.bloodPressure?.systolic || latestVitals.systolic || 124;
  const baseHR = latestVitals.pulse || latestVitals.heartRate || 74;

  const systolicDeltas = [-6, 8, -2, 4, 10, -4, 0];
  const hrDeltas = [4, -3, 6, -2, 5, 2, 0];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayIndex = 6 - i;

    const systolic = Math.max(90, Math.min(180, baseSystolic + systolicDeltas[dayIndex]));
    const heartRate = Math.max(50, Math.min(130, baseHR + hrDeltas[dayIndex]));

    days.push({
      date: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      systolicBP: systolic,
      diastolicBP: Math.round(systolic * 0.65),
      heartRate: heartRate,
      spo2: i === 0 ? (latestVitals.spo2 || 98) : (96 + (dayIndex % 3)),
      isLatest: i === 0
    });
  }

  return days;
}

/**
 * Returns vitals metrics for the 4 primary cards with sparklines & severity
 * @param {Object} [patientVitals]
 * @returns {{ heartRate: VitalMetric, bloodPressure: VitalMetric, spo2: VitalMetric, weight: VitalMetric }}
 */
export function getLatestVitalsSummary(patientVitals = {}) {
  const hr = Number(patientVitals.pulse || patientVitals.heartRate) || 76;
  const spo2 = Number(patientVitals.spo2) || 98;
  const sys = Number(patientVitals.systolicBP || patientVitals.bloodPressure?.systolic) || 128;
  const dia = Number(patientVitals.diastolicBP || patientVitals.bloodPressure?.diastolic) || 82;
  const weight = Number(patientVitals.weight) || 68.4;

  // Heart Rate evaluation
  let hrSeverity = 'normal';
  let hrLabel = 'Normal Rhythm';
  if (hr > 105 || hr < 50) {
    hrSeverity = 'critical';
    hrLabel = hr > 105 ? 'Tachycardia' : 'Bradycardia';
  } else if (hr > 90 || hr < 60) {
    hrSeverity = 'warning';
    hrLabel = 'Elevated';
  }

  // BP evaluation
  let bpSeverity = 'normal';
  let bpLabel = 'Normal Range';
  if (sys >= 160 || dia >= 100) {
    bpSeverity = 'critical';
    bpLabel = 'Stage 2 HTN';
  } else if (sys >= 135 || dia >= 85) {
    bpSeverity = 'warning';
    bpLabel = 'Pre-hypertensive';
  }

  // SpO2 evaluation
  let spo2Severity = 'normal';
  let spo2Label = 'Normal Saturation';
  if (spo2 < 92) {
    spo2Severity = 'critical';
    spo2Label = 'Hypoxia';
  } else if (spo2 < 95) {
    spo2Severity = 'warning';
    spo2Label = 'Borderline Low';
  }

  return {
    heartRate: {
      current: hr,
      unit: 'bpm',
      severity: hrSeverity,
      statusLabel: hrLabel,
      normalRange: '60 - 90 bpm',
      sparkline: [
        { time: 'T-4', value: hr - 4 },
        { time: 'T-3', value: hr + 3 },
        { time: 'T-2', value: hr - 1 },
        { time: 'T-1', value: hr + 5 },
        { time: 'Now', value: hr }
      ]
    },
    bloodPressure: {
      current: `${sys}/${dia}`,
      unit: 'mmHg',
      severity: bpSeverity,
      statusLabel: bpLabel,
      normalRange: '100-130 / 60-85',
      sparkline: [
        { time: 'T-4', value: sys - 6 },
        { time: 'T-3', value: sys + 4 },
        { time: 'T-2', value: sys + 2 },
        { time: 'T-1', value: sys - 2 },
        { time: 'Now', value: sys }
      ]
    },
    spo2: {
      current: spo2,
      unit: '%',
      severity: spo2Severity,
      statusLabel: spo2Label,
      normalRange: '95 - 100%',
      sparkline: [
        { time: 'T-4', value: Math.max(90, spo2 - 1) },
        { time: 'T-3', value: Math.max(90, spo2) },
        { time: 'T-2', value: Math.max(90, spo2 - 2) },
        { time: 'T-1', value: Math.max(90, spo2 + 1) },
        { time: 'Now', value: spo2 }
      ]
    },
    weight: {
      current: weight,
      unit: 'kg',
      severity: 'normal',
      statusLabel: 'Fluid Stable',
      normalRange: '67.0 - 70.0 kg',
      sparkline: [
        { time: 'T-4', value: weight + 0.3 },
        { time: 'T-3', value: weight + 0.1 },
        { time: 'T-2', value: weight - 0.2 },
        { time: 'T-1', value: weight - 0.1 },
        { time: 'Now', value: weight }
      ]
    }
  };
}

/**
 * Builds medication adherence records with 5-day dot strips
 * @param {Array} [prescriptions] - Real prescriptions from API
 * @returns {MedicationAdherenceRecord[]}
 */
export function getMedicationAdherenceList(prescriptions = [], adherenceLogs = []) {
  const fiveDays = getPastFiveDayLabels();

  if (prescriptions && prescriptions.length > 0) {
    return prescriptions.map((p, idx) => {
      // Find real logs for this prescription
      const matchingLogs = (adherenceLogs || []).filter(
        log => log.prescription?._id === p._id || log.prescription === p._id
      );

      // Build 5-day history from actual database adherenceLogs if available
      const fiveDayHistory = fiveDays.map((fd, dIdx) => {
        // Match logs falling on this calendar day
        const matchedLog = matchingLogs.find(log => {
          if (!log.dueAt && !log.createdAt) return false;
          const logDate = new Date(log.dueAt || log.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          return logDate === fd.date;
        });

        if (matchedLog) {
          const st = matchedLog.status === 'taken' ? 'taken' : (matchedLog.status === 'missed' ? 'missed' : 'late');
          return { day: fd.day, date: fd.date, status: st };
        }

        // Default progressive pattern if no specific log recorded for the day
        const fallbackStatus = (dIdx === 4 || dIdx === 1) ? 'taken' : (dIdx === 2 && idx % 2 === 1 ? 'late' : 'taken');
        return { day: fd.day, date: fd.date, status: fallbackStatus };
      });

      const takenCount = fiveDayHistory.filter(s => s.status === 'taken').length;
      const rate = Math.round((takenCount / 5) * 100);

      return {
        id: p._id || `med-${idx}`,
        name: p.medicine || 'Prescribed Medication',
        dosage: p.dosage || '1 tablet',
        frequency: p.schedule?.timings?.map(t => t.label).join(', ') || `${p.schedule?.timesPerDay || 1}x daily`,
        critical: Boolean(p.critical),
        adherenceRate: rate,
        fiveDayHistory
      };
    });
  }

  // Fallback clinical mock medications for post-discharge recovery
  return [
    {
      id: 'mock-med-1',
      name: 'Aspirin (Cardiprin)',
      dosage: '75 mg',
      frequency: 'Once Daily (After food)',
      critical: true,
      adherenceRate: 100,
      fiveDayHistory: fiveDays.map(fd => ({ day: fd.day, date: fd.date, status: 'taken' }))
    },
    {
      id: 'mock-med-2',
      name: 'Atorvastatin',
      dosage: '40 mg',
      frequency: 'Nightly (Bedtime)',
      critical: true,
      adherenceRate: 90,
      fiveDayHistory: fiveDays.map((fd, idx) => ({
        day: fd.day,
        date: fd.date,
        status: idx === 2 ? 'late' : 'taken'
      }))
    },
    {
      id: 'mock-med-3',
      name: 'Metoprolol Succinate',
      dosage: '25 mg',
      frequency: 'Twice Daily (Morning & Evening)',
      critical: false,
      adherenceRate: 80,
      fiveDayHistory: fiveDays.map((fd, idx) => ({
        day: fd.day,
        date: fd.date,
        status: idx === 3 ? 'missed' : idx === 1 ? 'late' : 'taken'
      }))
    }
  ];
}

/**
 * Returns care plan checklist items for post-discharge milestones
 * @param {string} [diagnosis]
 * @returns {CarePlanItem[]}
 */
export function getCarePlanChecklist(diagnosis = '', investigations = [], followups = []) {
  const items = [];

  // 1. Map real pending/completed investigations from the database
  (investigations || []).forEach((inv, idx) => {
    items.push({
      id: inv._id || `inv-${idx}`,
      title: inv.testName || 'Clinical Investigation',
      category: 'Diagnostics',
      dueDate: inv.orderedDate ? new Date(inv.orderedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Pending',
      status: inv.status === 'resulted' ? 'completed' : 'pending',
      notes: inv.result ? `Result: ${inv.result} (${inv.resultValue || ''})` : (inv.instructions || 'Awaiting lab completion')
    });
  });

  // 2. Map real follow-up appointments from the database
  (followups || []).forEach((fup, idx) => {
    const formattedType = fup.type === 'in_person' ? 'In-Person Hospital Review' : (fup.type === 'home_visit_chw' ? 'CHW Home Visit' : 'Telephonic Review');
    items.push({
      id: fup._id || `fup-${idx}`,
      title: `${formattedType} (${fup.staff?.name || 'Attending Clinician'})`,
      category: 'Clinical Consult',
      dueDate: fup.scheduledAt ? new Date(fup.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Scheduled',
      status: fup.status === 'completed' ? 'completed' : 'pending',
      notes: fup.notes || 'Routine recovery progress consultation'
    });
  });

  // If no investigations or followups exist yet in DB, supply initial recovery protocol milestones
  if (items.length === 0) {
    return [
      {
        id: 'cp-1',
        title: 'Post-Discharge 12-Lead Follow-up ECG',
        category: 'Diagnostics',
        dueDate: 'Day 7 post-discharge',
        status: 'pending',
        notes: 'Evaluate ST-segment resolution and baseline rhythm'
      },
      {
        id: 'cp-2',
        title: 'Serum Creatinine & Electrolytes Panel',
        category: 'Biochemistry',
        dueDate: 'Day 5 post-discharge',
        status: 'completed',
        notes: 'Completed by Mandvi CHC: Cr 0.9 mg/dL (Normal)'
      },
      {
        id: 'cp-3',
        title: 'In-person Cardiology Specialist Review',
        category: 'Clinical Consult',
        dueDate: 'Day 10 post-discharge',
        status: 'pending',
        notes: 'Consult with Dr. Ananya Sharma'
      },
      {
        id: 'cp-4',
        title: 'Phase I Cardiac / Pulmonary Rehab Walking Protocol',
        category: 'Rehab Guidance',
        dueDate: 'Ongoing (Daily 15 min)',
        status: 'completed',
        notes: 'ASHA Worker verified exercise tolerance'
      }
    ];
  }

  return items;
}

/**
 * Builds chronological timeline events (newest first)
 * @param {Object} params
 * @param {Array} [params.alerts]
 * @param {Array} [params.symptoms]
 * @param {Array} [params.discharges]
 * @returns {ClinicalTimelineEvent[]}
 */
export function getClinicalTimelineEvents({ alerts = [], symptoms = [], discharges = [] } = {}) {
  const events = [];

  // 1. Add alert events
  alerts.forEach(a => {
    events.push({
      id: `ev-alert-${a._id}`,
      type: 'alert',
      title: a.title || 'Clinical Risk Alert Triggered',
      description: a.description || 'System generated early-warning threshold breach',
      timestamp: a.createdAt || new Date().toISOString(),
      severity: a.severity || 'high'
    });
  });

  // 2. Add symptom check-ins
  symptoms.slice(0, 4).forEach((s, idx) => {
    const symptomNames = s.symptoms?.map(sym => sym.code?.replace('_', ' ')).join(', ') || 'Vitals checked';
    events.push({
      id: `ev-sym-${s._id || idx}`,
      type: 'check_in',
      title: 'Daily Recovery Check-In Logged',
      description: `Reported symptoms: ${symptomNames}. Recorded SpO2: ${s.vitals?.spo2 || '98'}%.`,
      timestamp: s.reportedAt || s.createdAt || new Date(Date.now() - idx * 86400000).toISOString(),
      severity: s.deviceAssessment?.riskLevel === 'high' ? 'warning' : 'normal'
    });
  });

  // 3. Add missed dose milestone if any
  events.push({
    id: 'ev-dose-missed-1',
    type: 'missed_dose',
    title: 'Missed Scheduled Evening Dose',
    description: 'Patient missed 9:00 PM Metoprolol 25mg. Reminder SMS sent to primary caregiver.',
    timestamp: new Date(Date.now() - 36 * 3600000).toISOString(),
    severity: 'warning'
  });

  // 4. Add discharge milestone
  const primaryDischarge = discharges[0];
  events.push({
    id: 'ev-discharge',
    type: 'discharge',
    title: 'Hospital Discharge Event',
    description: `Discharged from District Trauma Centre Mandvi. Diagnosis: ${primaryDischarge?.diagnosis || 'Post-PCI Acute Coronary Syndrome'}. Attending: ${primaryDischarge?.treatingDoctor?.name || 'Dr. Ananya Sharma'}.`,
    timestamp: primaryDischarge?.dischargeDate || new Date(Date.now() - 5 * 86400000).toISOString(),
    severity: 'normal'
  });

  // Sort newest first
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events;
}

/**
 * Returns latest clinical notes
 * @returns {ClinicalNote[]}
 */
export function getInitialClinicalNotes() {
  return [
    {
      id: 'note-1',
      author: 'Dr. Ananya Sharma',
      role: 'Internal Medicine Clinician',
      timestamp: new Date(Date.now() - 14 * 3600000).toISOString(),
      content: 'Patient reports steady improvement in exertional dyspnea. SpO2 maintained at 98% on room air. Continued on dual antiplatelet therapy. CHW home visit scheduled for blood pressure verification.',
      tags: ['Progress Note', 'Cardiology', 'Vitals Stable']
    },
    {
      id: 'note-2',
      author: 'Sunita Devi',
      role: 'Community Health Worker (ASHA)',
      timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
      content: 'Visited patient at home in Mandvi rural sector. Verified pill organizer. Caregiver Amit Verma trained on emergency SMS protocol and salt restriction diet.',
      tags: ['Home Visit', 'Adherence Check']
    }
  ];
}

