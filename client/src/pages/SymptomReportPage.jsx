import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HeartCrack,
  Wind,
  Thermometer,
  Droplet,
  Bandage,
  Brain,
  AlertCircle,
  Activity,
  Zap,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowLeft,
  Info,
  ShieldCheck
} from 'lucide-react';
import { evaluateRisk } from '@healthverse/shared';
import useAuthStore from '../store/useAuthStore.js';
import { saveSymptomReportOffline } from '../db/offlineDb.js';
import { RiskBadge, SyncStatusBadge } from '../components/RiskBadge.jsx';

const SYMPTOM_OPTIONS = [
  { code: 'chest_pain', icon: HeartCrack, labelKey: 'symptoms.chest_pain', color: 'rose' },
  { code: 'breathlessness', icon: Wind, labelKey: 'symptoms.breathlessness', color: 'indigo' },
  { code: 'fever', icon: Thermometer, labelKey: 'symptoms.fever', color: 'amber' },
  { code: 'bleeding', icon: Droplet, labelKey: 'symptoms.bleeding', color: 'red' },
  { code: 'wound_discharge', icon: Bandage, labelKey: 'symptoms.wound_discharge', color: 'orange' },
  { code: 'confusion', icon: Brain, labelKey: 'symptoms.confusion', color: 'purple' },
  { code: 'persistent_vomiting', icon: AlertCircle, labelKey: 'symptoms.persistent_vomiting', color: 'yellow' },
  { code: 'reduced_urine_output', icon: Activity, labelKey: 'symptoms.reduced_urine_output', color: 'blue' },
  { code: 'headache', icon: Zap, labelKey: 'symptoms.headache', color: 'slate' }
];

export function SymptomReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, isOnline, updatePendingCount } = useAuthStore();

  // Active symptoms state: { [code]: severityNumber (1-3) }
  const [selectedSymptoms, setSelectedSymptoms] = useState({});
  const [symptomNotes, setSymptomNotes] = useState('');

  // Vitals state
  const [vitals, setVitals] = useState({
    temperature: '',
    pulse: '',
    spo2: '',
    systolicBP: '',
    diastolicBP: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced');

  const handleToggleSymptom = (code) => {
    setSelectedSymptoms(prev => {
      const next = { ...prev };
      if (next[code]) {
        delete next[code];
      } else {
        next[code] = 2; // Default moderate severity
      }
      return next;
    });
  };

  const handleSetSeverity = (code, severity) => {
    setSelectedSymptoms(prev => ({
      ...prev,
      [code]: severity
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);

    const patientId = profile?._id || user?.id;

    // Build structured symptoms array
    const symptomsArray = Object.entries(selectedSymptoms).map(([code, severity]) => ({
      code,
      severity,
      notes: symptomNotes || undefined
    }));

    // Build vitals
    const vitalsObj = {};
    if (vitals.temperature) vitalsObj.temperature = Number(vitals.temperature);
    if (vitals.pulse) vitalsObj.pulse = Number(vitals.pulse);
    if (vitals.spo2) vitalsObj.spo2 = Number(vitals.spo2);
    if (vitals.systolicBP && vitals.diastolicBP) {
      vitalsObj.bloodPressure = {
        systolic: Number(vitals.systolicBP),
        diastolic: Number(vitals.diastolicBP)
      };
    }

    // 1. Evaluate immediately on client using shared isomorphic engine
    const localEval = evaluateRisk({
      symptoms: symptomsArray,
      vitals: vitalsObj,
      assessedOn: 'device'
    });

    try {
      if (isOnline) {
        // Online submit to authoritative server
        const res = await fetch('/api/v1/symptoms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            patientId,
            symptoms: symptomsArray,
            vitals: vitalsObj,
            deviceAssessment: localEval
          })
        });

        if (res.ok) {
          const json = await res.json();
          setAssessmentResult({
            riskLevel: json.data.guidance.riskLevel,
            explanation: json.data.guidance.explanation,
            suggestedAction: json.data.guidance.suggestedAction,
            redFlags: json.data.guidance.redFlags,
            assessedOn: 'server'
          });
          setSyncStatus('synced');
        } else {
          throw new Error('Server returned non-200');
        }
      } else {
        // Offline: save to IndexedDB
        await saveSymptomReportOffline({
          patientId,
          symptoms: symptomsArray,
          vitals: vitalsObj,
          deviceAssessment: localEval
        });

        setAssessmentResult(localEval);
        setSyncStatus('pending');
        await updatePendingCount();
      }
    } catch (err) {
      console.warn('Network error during symptom submit, falling back to local offline assessment:', err.message);
      await saveSymptomReportOffline({
        patientId,
        symptoms: symptomsArray,
        vitals: vitalsObj,
        deviceAssessment: localEval
      });
      setAssessmentResult(localEval);
      setSyncStatus('pending');
      await updatePendingCount();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
        <div className="flex items-center gap-2">
          <SyncStatusBadge status={syncStatus} />
        </div>
      </div>

      {!assessmentResult ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card-premium p-6">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {t('symptoms.title')}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {t('symptoms.subtitle')}
            </p>

            {/* Symptom Selection Grid (Large accessible cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-6">
              {SYMPTOM_OPTIONS.map(({ code, icon: Icon, labelKey }) => {
                const isSelected = Boolean(selectedSymptoms[code]);
                const severity = selectedSymptoms[code] || 0;

                return (
                  <div
                    key={code}
                    className={`rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/60 shadow-md ring-2 ring-teal-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSymptom(code)}
                      className="w-full flex items-start gap-3 text-left focus:outline-none"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-slate-900 text-sm block leading-tight">
                          {t(labelKey)}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">
                          {isSelected ? `Severity: ${t(`symptoms.severityLevels.${severity}`)}` : 'Tap to select'}
                        </span>
                      </div>
                    </button>

                    {/* Severity Selector when selected */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-teal-200/60 flex items-center justify-between gap-1">
                        {[1, 2, 3].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => handleSetSeverity(code, level)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              severity === level
                                ? 'bg-teal-700 text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            {t(`symptoms.severityLevels.${level}`)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vitals Input Card */}
          <div className="card-premium p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              <span>{t('symptoms.vitalsTitle')}</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter any measurements taken today using home or clinic instruments.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Temp (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 37.0"
                  value={vitals.temperature}
                  onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Oxygen SpO2 (%)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 98"
                  value={vitals.spo2}
                  onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Pulse (bpm)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 74"
                  value={vitals.pulse}
                  onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  BP (Systolic / Dia)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="120"
                    value={vitals.systolicBP}
                    onChange={(e) => setVitals({ ...vitals, systolicBP: e.target.value })}
                    className="w-1/2 px-2 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-center"
                  />
                  <span className="text-slate-400 font-bold">/</span>
                  <input
                    type="number"
                    placeholder="80"
                    value={vitals.diastolicBP}
                    onChange={(e) => setVitals({ ...vitals, diastolicBP: e.target.value })}
                    className="w-1/2 px-2 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-center"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                rows="2"
                placeholder="Describe any other sensations or specific times when symptoms began..."
                value={symptomNotes}
                onChange={(e) => setSymptomNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-touch bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-base shadow-lg shadow-teal-600/30"
          >
            {isSubmitting ? t('symptoms.evaluating') : t('symptoms.submitReport')}
          </button>
        </form>
      ) : (
        /* Evaluation Result Screen */
        <div className="space-y-6">
          <div className={`card-premium p-8 border-2 ${
            assessmentResult.riskLevel === 'critical'
              ? 'border-red-500 bg-red-50/50'
              : assessmentResult.riskLevel === 'high'
              ? 'border-orange-500 bg-orange-50/50'
              : assessmentResult.riskLevel === 'medium'
              ? 'border-amber-500 bg-amber-50/50'
              : 'border-emerald-500 bg-emerald-50/50'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <RiskBadge level={assessmentResult.riskLevel} size="lg" />
                <span className="text-xs text-slate-500 font-medium">
                  Assessed on: {assessmentResult.assessedOn} &bull; Version 1.0.0
                </span>
              </div>
              <SyncStatusBadge status={syncStatus} />
            </div>

            <div className="mt-6 space-y-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {assessmentResult.suggestedAction}
              </h2>

              <div className="p-4 rounded-xl bg-white/80 border border-slate-200 text-sm text-slate-800 leading-relaxed">
                <strong className="block text-xs uppercase font-bold text-slate-500 mb-1">Clinical Evaluation Summary:</strong>
                {assessmentResult.explanation}
              </div>

              {assessmentResult.redFlags && assessmentResult.redFlags.length > 0 && (
                <div className="p-4 rounded-xl bg-white/80 border border-slate-200">
                  <strong className="block text-xs uppercase font-bold text-red-700 mb-2">Red Flags Detected:</strong>
                  <ul className="space-y-1">
                    {assessmentResult.redFlags.map((flag, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-800">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Critical 108 Emergency Banner */}
              {assessmentResult.riskLevel === 'critical' && (
                <div className="p-4 rounded-2xl bg-red-600 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <PhoneCall className="w-8 h-8 flex-shrink-0 text-red-200 animate-bounce" />
                    <div>
                      <div className="text-lg font-black tracking-tight">{t('symptoms.emergencyCall')}</div>
                      <div className="text-xs text-red-100">Do not travel alone. Inform attending emergency staff upon arrival.</div>
                    </div>
                  </div>
                  <a
                    href="tel:108"
                    className="btn-touch bg-white text-red-700 hover:bg-red-50 font-black text-sm px-6 py-2.5 shadow"
                  >
                    Dial 108 Now
                  </a>
                </div>
              )}

              {/* Safety principle reminder */}
              <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>{t('safetyPrinciple')}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setAssessmentResult(null);
                  setSelectedSymptoms({});
                }}
                className="btn-touch bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold"
              >
                Log Another Report
              </button>
              <button
                onClick={() => navigate('/')}
                className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
              >
                Return to Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SymptomReportPage;
