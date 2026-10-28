/**
 * HealthVerse End-to-End Clinical Scenario Walkthrough Script
 * 
 * Scenario:
 * 1. Patient is discharged with prescriptions and follow-up.
 * 2. Patient goes offline, logs a high-risk symptom (High Fever 39.2°C + severe breathlessness).
 * 3. Client evaluates offline risk immediately using shared risk engine.
 * 4. Patient comes back online and synchronizes queued data via POST /api/v1/sync.
 * 5. Server runs authoritative risk assessment, marks sync status, and creates an Alert for Hospital Dashboard.
 * 6. Doctor logs in, sees the new alert in Alert Inbox with red flags.
 * 7. Doctor acknowledges the alert.
 * 8. Doctor records clinicianDecision and resolves the alert.
 */

import { evaluateRisk } from '@healthverse/shared';

const BASE_URL = 'http://localhost:5000/api/v1';

async function runScenario() {
  console.log('================================================================');
  console.log('🩺 STARTING HEALTHVERSE END-TO-END SCENARIO WALKTHROUGH');
  console.log('================================================================\n');

  // STEP 1: Doctor Login & Verify Discharge
  console.log('👉 STEP 1: Attending Doctor logs in (Dr. Ananya Sharma)');
  const docLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '9800000002', password: 'password123' })
  });
  const docLogin = await docLoginRes.json();
  const docToken = docLogin.token;
  const docHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${docToken}`
  };
  console.log(`✅ Doctor authenticated: ${docLogin.profile.name} (${docLogin.user.role})`);
  console.log(`🏥 Hospital: ${docLogin.profile.hospital.name}\n`);

  // STEP 2: Patient Login
  console.log('👉 STEP 2: Discharged Patient logs in (Patient 1 - Rajesh Verma)');
  const patLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '9800000011', password: 'password123' })
  });
  const patLogin = await patLoginRes.json();
  const patToken = patLogin.token;
  const patHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${patToken}`
  };
  const patientId = patLogin.profile._id;
  console.log(`✅ Patient authenticated: ${patLogin.profile.name} (ID: ${patLogin.profile.patientId})\n`);

  // STEP 3: Patient goes offline and logs high-risk symptom
  console.log('👉 STEP 3: Patient is in rural home, disconnected (OFFLINE)');
  console.log('📝 Patient logs high-risk symptoms on device:');
  console.log('   - Symptom: Severe Breathlessness (Severity 2/3)');
  console.log('   - Vital: High Post-Discharge Fever (39.2°C)');
  console.log('   - Vital: Blood Oxygen SpO2 (91%)');

  const clientUuid = `offline-symptom-${Date.now()}`;
  const offlineSymptomData = {
    patient: patientId,
    symptoms: [
      { code: 'breathlessness', severity: 2, notes: 'Struggling to breathe at rest' }
    ],
    vitals: {
      temperature: 39.2,
      spo2: 91,
      pulse: 108,
      bloodPressure: { systolic: 140, diastolic: 90 }
    },
    reportedAt: new Date().toISOString()
  };

  // Immediate offline risk evaluation using shared engine
  const offlineEvaluation = evaluateRisk({
    symptoms: offlineSymptomData.symptoms,
    vitals: offlineSymptomData.vitals,
    assessedOn: 'device'
  });

  console.log('\n⚡ [LOCAL DEVICE RISK EVALUATION]');
  console.log(`   - Risk Level: ${offlineEvaluation.riskLevel.toUpperCase()}`);
  console.log(`   - Red Flags: ${offlineEvaluation.redFlags.join(', ')}`);
  console.log(`   - Guidance: ${offlineEvaluation.suggestedAction}`);
  console.log(`   - Safety Notice: ${offlineEvaluation.safetyNotice}`);
  console.log('   - Local Record Status: syncStatus = "pending"\n');

  // STEP 4: Patient comes back online, batch sync triggers
  console.log('👉 STEP 4: Connectivity restored. Sync Engine sends batch to POST /api/v1/sync');
  const syncBatchPayload = {
    deviceId: 'device-pwa-mobile-01',
    records: [
      {
        collection: 'symptoms',
        clientUuid,
        data: {
          ...offlineSymptomData,
          deviceAssessment: offlineEvaluation
        },
        updatedAt: new Date().toISOString()
      }
    ]
  };

  const syncRes = await fetch(`${BASE_URL}/sync`, {
    method: 'POST',
    headers: patHeaders,
    body: JSON.stringify(syncBatchPayload)
  });
  const syncResult = await syncRes.json();
  console.log(`✅ Sync Response: HTTP ${syncRes.status}`);
  console.log(`   - Summary: Uploaded: ${syncResult.summary.totalReceived}, Created: ${syncResult.summary.created}, Conflicts: ${syncResult.summary.conflictsCount}`);
  console.log(`   - Item Status: ${syncResult.results[0].status} (Server Report ID: ${syncResult.results[0].serverId})`);
  console.log(`   - Authoritative Server Risk: ${syncResult.results[0].riskLevel.toUpperCase()}`);
  console.log(`   - Alert Generated: ${syncResult.results[0].alertGenerated}\n`);

  // STEP 5: Doctor views Hospital Alert Inbox
  console.log('👉 STEP 5: Attending Doctor opens Hospital Alert Inbox (GET /api/v1/alerts)');
  const alertsRes = await fetch(`${BASE_URL}/alerts?status=open`, {
    headers: docHeaders
  });
  const alertsData = await alertsRes.json();
  console.log(`✅ Alert Inbox loaded: ${alertsData.counts.open} open alerts, ${alertsData.counts.critical} critical`);

  // Find the alert for our patient
  const targetAlert = alertsData.data.find(a => a.patient?._id === patientId || a.patient?.patientId === patLogin.profile.patientId);
  if (!targetAlert) {
    throw new Error('Expected alert was not found in doctor inbox');
  }

  console.log(`🚨 TARGET ALERT FOUND: Alert ID ${targetAlert._id}`);
  console.log(`   - Patient: ${targetAlert.patient.name}`);
  console.log(`   - Risk Level: ${targetAlert.riskLevel.toUpperCase()}`);
  console.log(`   - Status: ${targetAlert.status}`);
  console.log(`   - Red Flags: ${targetAlert.assessment?.redFlags?.join(', ') || 'Severe respiratory & fever'}\n`);

  // STEP 6: Doctor Acknowledges Alert
  console.log(`👉 STEP 6: Doctor acknowledges the alert (PATCH /api/v1/alerts/${targetAlert._id}/acknowledge)`);
  const ackRes = await fetch(`${BASE_URL}/alerts/${targetAlert._id}/acknowledge`, {
    method: 'PATCH',
    headers: docHeaders
  });
  const ackData = await ackRes.json();
  console.log(`✅ Alert acknowledged: Status is now '${ackData.data.status}' (Acknowledged At: ${ackData.data.acknowledgedAt})\n`);

  // STEP 7: Doctor Records Decision and Resolves Alert
  console.log(`👉 STEP 7: Doctor records clinical decision and resolves alert (PATCH /api/v1/alerts/${targetAlert._id}/resolve)`);
  const decisionPayload = {
    actionTaken: 'emergency_transfer',
    notes: 'Called patient caregiver Amit Verma. SpO2 91% with high fever warrants immediate emergency admission. Ambulance 108 dispatched; CHW Sunita alerted.'
  };

  const resolveRes = await fetch(`${BASE_URL}/alerts/${targetAlert._id}/resolve`, {
    method: 'PATCH',
    headers: docHeaders,
    body: JSON.stringify(decisionPayload)
  });
  const resolveData = await resolveRes.json();
  console.log(`✅ Alert resolved successfully!`);
  console.log(`   - Final Status: ${resolveData.data.status.toUpperCase()}`);
  console.log(`   - Action Taken: ${resolveData.data.clinicianDecision.actionTaken}`);
  console.log(`   - Decision Notes: "${resolveData.data.clinicianDecision.notes}"`);
  console.log(`   - Decision Recorded Time: ${resolveData.data.clinicianDecision.decisionTime}\n`);

  console.log('================================================================');
  console.log('🎉 FULL END-TO-END CLINICAL WALKTHROUGH COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
}

runScenario().catch(err => {
  console.error('Walkthrough error:', err);
  process.exit(1);
});
