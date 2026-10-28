import { evaluateRisk, calculateConsecutiveMissedCriticalDoses, RISK_LEVELS } from '../../shared/riskEngine.js';

describe('HealthVerse Shared Risk Engine', () => {
  test('returns low risk for normal baseline vitals and no symptoms', () => {
    const result = evaluateRisk({
      symptoms: [],
      vitals: { temperature: 37.0, pulse: 72, spo2: 98, bloodPressure: { systolic: 120, diastolic: 80 } }
    });

    expect(result.riskLevel).toBe(RISK_LEVELS.LOW);
    expect(result.redFlags).toHaveLength(0);
    expect(result.rulesFired).toHaveLength(0);
    expect(result.safetyNotice).toBeDefined();
  });

  test('detects critical risk on acute chest pain red flag', () => {
    const result = evaluateRisk({
      symptoms: [{ code: 'chest_pain', severity: 1, notes: 'Substernal pressure' }],
      vitals: { temperature: 36.8, pulse: 80, spo2: 98 }
    });

    expect(result.riskLevel).toBe(RISK_LEVELS.CRITICAL);
    expect(result.rulesFired).toContain('RULE_CHEST_PAIN');
    expect(result.redFlags[0]).toContain('chest pain');
    expect(result.suggestedAction).toContain('108');
  });

  test('detects critical risk when SpO2 drops below 92%', () => {
    const result = evaluateRisk({
      symptoms: [{ code: 'cough', severity: 1 }],
      vitals: { temperature: 37.5, pulse: 90, spo2: 89 }
    });

    expect(result.riskLevel).toBe(RISK_LEVELS.CRITICAL);
    expect(result.rulesFired).toContain('RULE_SPO2_CRITICAL');
    expect(result.redFlags.some(f => f.includes('SpO2 < 92%'))).toBe(true);
  });

  test('detects high risk when SpO2 is in warning range (92-94%)', () => {
    const result = evaluateRisk({
      symptoms: [],
      vitals: { temperature: 37.2, pulse: 85, spo2: 93 }
    });

    expect(result.riskLevel).toBe(RISK_LEVELS.HIGH);
    expect(result.rulesFired).toContain('RULE_SPO2_WARNING');
  });

  test('detects high risk for high fever (> 38.5 C)', () => {
    const result = evaluateRisk({
      symptoms: [],
      vitals: { temperature: 39.2, pulse: 105, spo2: 97 }
    });

    expect(result.riskLevel).toBe(RISK_LEVELS.HIGH);
    expect(result.rulesFired).toContain('RULE_FEVER_CRITICAL');
  });

  test('calculates consecutive missed doses correctly for critical prescriptions', () => {
    const prescriptions = [
      { _id: 'med-critical-1', critical: true },
      { _id: 'med-regular-2', critical: false }
    ];

    const adherenceLogs = [
      { prescription: 'med-critical-1', status: 'missed', dueAt: new Date('2026-10-14T10:00:00Z') },
      { prescription: 'med-critical-1', status: 'skipped', dueAt: new Date('2026-10-13T10:00:00Z') },
      { prescription: 'med-critical-1', status: 'missed', dueAt: new Date('2026-10-12T10:00:00Z') },
      { prescription: 'med-regular-2', status: 'taken', dueAt: new Date('2026-10-11T10:00:00Z') }
    ];

    const count = calculateConsecutiveMissedCriticalDoses(adherenceLogs, prescriptions);
    expect(count).toBe(3);

    const result = evaluateRisk({
      symptoms: [],
      vitals: {},
      adherenceLogs,
      prescriptions
    });

    expect(result.riskLevel).toBe(RISK_LEVELS.CRITICAL);
    expect(result.rulesFired).toContain('RULE_MISSED_CRITICAL_MEDS_3');
  });
});
