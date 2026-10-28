/**
 * HealthVerse Shared Risk Engine
 * Version 1.0.0
 * Isomorphic: Runs both offline on client (IndexedDB/Web) and online on server (Express/Node).
 */

import defaultRuleset from './rules/riskRules_v1.json' with { type: 'json' };

export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

const LEVEL_WEIGHT = {
  [RISK_LEVELS.LOW]: 1,
  [RISK_LEVELS.MEDIUM]: 2,
  [RISK_LEVELS.HIGH]: 3,
  [RISK_LEVELS.CRITICAL]: 4
};

/**
 * Parse Blood Pressure from object { systolic, diastolic } or string "120/80"
 */
export function parseBloodPressure(bpInput) {
  if (!bpInput) return null;
  if (typeof bpInput === 'object' && bpInput.systolic && bpInput.diastolic) {
    return {
      systolic: Number(bpInput.systolic),
      diastolic: Number(bpInput.diastolic)
    };
  }
  if (typeof bpInput === 'string' && bpInput.includes('/')) {
    const parts = bpInput.split('/');
    const systolic = Number(parts[0].trim());
    const diastolic = Number(parts[1].trim());
    if (!isNaN(systolic) && !isNaN(diastolic)) {
      return { systolic, diastolic };
    }
  }
  return null;
}

/**
 * Count consecutive missed doses for critical prescriptions
 * @param {Array} adherenceLogs - List of adherence log items sorted chronologically or reverse
 * @param {Array} prescriptions - List of prescription objects with _id and critical boolean
 */
export function calculateConsecutiveMissedCriticalDoses(adherenceLogs = [], prescriptions = []) {
  if (!adherenceLogs || adherenceLogs.length === 0) return 0;

  // Build lookup of critical prescription IDs
  const criticalMap = new Set();
  prescriptions.forEach(p => {
    if (p.critical) {
      criticalMap.add(String(p._id || p.id || p.clientUuid));
    }
  });

  // Filter logs for critical prescriptions
  const criticalLogs = adherenceLogs.filter(log => {
    const pId = String(log.prescription?._id || log.prescription || log.prescriptionId);
    return criticalMap.has(pId);
  });

  if (criticalLogs.length === 0) return 0;

  // Sort by dueAt descending (most recent first)
  const sorted = [...criticalLogs].sort((a, b) => new Date(b.dueAt || b.createdAt) - new Date(a.dueAt || a.createdAt));

  let consecutiveMissed = 0;
  for (const log of sorted) {
    if (log.status === 'missed' || log.status === 'skipped') {
      consecutiveMissed++;
    } else if (log.status === 'taken') {
      // Streak broken by taken dose
      break;
    }
  }

  return consecutiveMissed;
}

/**
 * Main Risk Assessment Evaluation
 * @param {Object} params
 * @param {Array} params.symptoms - Array of { code: string, severity: number (0-3), notes?: string }
 * @param {Object} params.vitals - { temp/temperature: number, pulse: number, spo2: number, bloodPressure: object|string }
 * @param {Array} [params.adherenceLogs] - History of adherence logs
 * @param {Array} [params.prescriptions] - Prescriptions to identify critical medications
 * @param {Object} [params.ruleset] - Optional custom ruleset override
 * @param {string} [params.assessedOn] - 'device' or 'server'
 * @returns {Object} Evaluation Result
 */
export function evaluateRisk({
  symptoms = [],
  vitals = {},
  adherenceLogs = [],
  prescriptions = [],
  ruleset = defaultRuleset,
  assessedOn = 'device'
} = {}) {
  const redFlags = [];
  const rulesFired = [];
  const explanations = [];
  let highestLevel = RISK_LEVELS.LOW;

  const promoteLevel = (level, rule, note) => {
    if (!rulesFired.includes(rule.id)) {
      rulesFired.push(rule.id);
    }
    if (rule.redFlag && !redFlags.includes(rule.redFlag)) {
      redFlags.push(rule.redFlag);
    }
    if (note && !explanations.includes(note)) {
      explanations.push(note);
    } else if (rule.explanation && !explanations.includes(rule.explanation)) {
      explanations.push(rule.explanation);
    }

    if (LEVEL_WEIGHT[level] > LEVEL_WEIGHT[highestLevel]) {
      highestLevel = level;
    }
  };

  const rules = ruleset.rules || [];

  // 1. Evaluate Symptom Rules
  symptoms.forEach(s => {
    const code = s.code?.toLowerCase();
    const severity = Number(s.severity || 0);

    rules.filter(r => r.category === 'symptom').forEach(rule => {
      if (rule.targetCode.toLowerCase() === code && severity >= (rule.minSeverity || 1)) {
        promoteLevel(rule.riskLevel, rule, `${rule.explanation} (Reported severity: ${severity}/3)`);
      }
    });
  });

  // Evaluate Symptom Cluster (e.g. 2 or more symptoms with severity >= 2)
  const clusterRules = rules.filter(r => r.category === 'symptom_cluster');
  clusterRules.forEach(rule => {
    const matchingCount = symptoms.filter(s => Number(s.severity || 0) >= (rule.minSeverity || 2)).length;
    if (matchingCount >= (rule.minCount || 2)) {
      promoteLevel(rule.riskLevel, rule, `${rule.explanation} (${matchingCount} active moderate symptoms)`);
    }
  });

  // 2. Evaluate Vital Signs
  const temp = Number(vitals.temperature || vitals.temp);
  const pulse = Number(vitals.pulse);
  const spo2 = Number(vitals.spo2 || vitals.spO2);
  const bp = parseBloodPressure(vitals.bloodPressure || vitals.bp);

  // Temperature
  if (!isNaN(temp) && temp > 0) {
    rules.filter(r => r.category === 'vital' && r.target === 'temperature').forEach(rule => {
      if (rule.condition === 'greater_than' && temp > rule.threshold) {
        promoteLevel(rule.riskLevel, rule, `${rule.explanation} Recorded: ${temp}°C`);
      }
    });
  }

  // SpO2
  if (!isNaN(spo2) && spo2 > 0) {
    rules.filter(r => r.category === 'vital' && r.target === 'spo2').forEach(rule => {
      if (rule.condition === 'less_than' && spo2 < rule.threshold) {
        promoteLevel(rule.riskLevel, rule, `${rule.explanation} Recorded: ${spo2}%`);
      } else if (rule.condition === 'range_inclusive' && spo2 >= rule.min && spo2 <= rule.max) {
        promoteLevel(rule.riskLevel, rule, `${rule.explanation} Recorded: ${spo2}%`);
      }
    });
  }

  // Pulse
  if (!isNaN(pulse) && pulse > 0) {
    rules.filter(r => r.category === 'vital' && r.target === 'pulse').forEach(rule => {
      if (rule.condition === 'custom_pulse') {
        if (pulse > rule.highThreshold || pulse < rule.lowThreshold) {
          promoteLevel(rule.riskLevel, rule, `${rule.explanation} Recorded: ${pulse} bpm`);
        }
      }
    });
  }

  // Blood Pressure
  if (bp) {
    rules.filter(r => r.category === 'vital' && r.target === 'bloodPressure').forEach(rule => {
      if (rule.condition === 'custom_bp_crisis') {
        if (bp.systolic >= rule.systolicThreshold || bp.diastolic >= rule.diastolicThreshold) {
          promoteLevel(rule.riskLevel, rule, `${rule.explanation} Recorded: ${bp.systolic}/${bp.diastolic} mmHg`);
        }
      } else if (rule.condition === 'custom_bp_hypo') {
        if (bp.systolic < rule.systolicThreshold) {
          promoteLevel(rule.riskLevel, rule, `${rule.explanation} Recorded: ${bp.systolic}/${bp.diastolic} mmHg`);
        }
      }
    });
  }

  // 3. Evaluate Adherence Patterns
  const consecutiveMissed = calculateConsecutiveMissedCriticalDoses(adherenceLogs, prescriptions);
  if (consecutiveMissed > 0) {
    rules.filter(r => r.category === 'adherence').forEach(rule => {
      if (rule.condition === 'greater_or_equal' && consecutiveMissed >= rule.threshold) {
        promoteLevel(rule.riskLevel, rule, `${rule.explanation} (${consecutiveMissed} missed critical doses detected)`);
      } else if (rule.condition === 'equal_to' && consecutiveMissed === rule.threshold) {
        promoteLevel(rule.riskLevel, rule, `${rule.explanation} (${consecutiveMissed} missed critical doses detected)`);
      }
    });
  }

  // Suggested Plain-Language Action
  let suggestedAction = 'Continue your prescribed post-discharge medication and routine recovery care.';
  if (highestLevel === RISK_LEVELS.CRITICAL) {
    suggestedAction = 'EMERGENCY: Please contact your hospital immediately or call 108 emergency services. Have someone stay with you.';
  } else if (highestLevel === RISK_LEVELS.HIGH) {
    suggestedAction = 'URGENT: Please contact your attending clinician or hospital today for an early medical review.';
  } else if (highestLevel === RISK_LEVELS.MEDIUM) {
    suggestedAction = 'ADVISORY: Follow-up recommended. Inform your visiting CHW or contact the health clinic within 24-48 hours.';
  }

  const finalExplanation = explanations.length > 0
    ? explanations.join(' | ')
    : 'All reported vitals and symptoms are currently within expected post-discharge baseline.';

  return {
    riskLevel: highestLevel,
    redFlags,
    rulesFired,
    explanation: finalExplanation,
    suggestedAction,
    rulesetVersion: ruleset.version || '1.0.0',
    assessedOn,
    assessedAt: new Date().toISOString(),
    safetyNotice: 'The AI is a decision-support and early-warning tool only. It never diagnoses or prescribes. Every high or critical alert must be reviewed by a qualified clinician.'
  };
}

export default {
  evaluateRisk,
  calculateConsecutiveMissedCriticalDoses,
  parseBloodPressure,
  RISK_LEVELS,
  defaultRuleset
};
