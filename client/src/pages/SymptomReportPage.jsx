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
  ShieldCheck,
  Plus,
  Minus,
  Layers,
  X
} from 'lucide-react';
import { evaluateRisk } from '@healthverse/shared';
import useAuthStore from '../store/useAuthStore.js';
import { saveSymptomReportOffline } from '../db/offlineDb.js';
import { RiskBadge, SyncStatusBadge } from '../components/RiskBadge.jsx';

const SYMPTOM_OPTIONS = [
  { code: 'chest_pain', icon: HeartCrack, labelKey: 'symptoms.chest_pain', region: 'chest', critical: true },
  { code: 'breathlessness', icon: Wind, labelKey: 'symptoms.breathlessness', region: 'chest', critical: true },
  { code: 'fever', icon: Thermometer, labelKey: 'symptoms.fever', region: 'general' },
  { code: 'bleeding', icon: Droplet, labelKey: 'symptoms.bleeding', region: 'wound', critical: true },
  { code: 'wound_discharge', icon: Bandage, labelKey: 'symptoms.wound_discharge', region: 'wound' },
  { code: 'confusion', icon: Brain, labelKey: 'symptoms.confusion', region: 'head', critical: true },
  { code: 'persistent_vomiting', icon: AlertCircle, labelKey: 'symptoms.persistent_vomiting', region: 'abdomen' },
  { code: 'reduced_urine_output', icon: Activity, labelKey: 'symptoms.reduced_urine_output', region: 'abdomen' },
  { code: 'headache', icon: Zap, labelKey: 'symptoms.headache', region: 'head' }
];

export function SymptomReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, isOnline, updatePendingCount } = useAuthStore();

  const [activeRegion, setActiveRegion] = useState('all');
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
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const handleToggleSymptom = (code) => {
    setSelectedSymptoms((prev) => {
      const next = { ...prev };
      if (next[code]) {
        delete next[code];
      } else {
        next[code] = 2; // Default moderate severity
        // If critical symptom selected, prompt emergency awareness
        if (code === 'chest_pain' || code === 'breathlessness') {
          setShowEmergencyModal(true);
        }
      }
      return next;
    });
  };

  const handleSetSeverity = (code, severity) => {
    setSelectedSymptoms((prev) => ({
      ...prev,
      [code]: severity
    }));
  };

  // Helper step adjusters for touch screens
  const adjustVital = (key, delta, min = 0, max = 300, stepDecimals = 0) => {
    setVitals((prev) => {
      const current = parseFloat(prev[key]) || (key === 'temperature' ? 37.0 : key === 'spo2' ? 98 : key === 'pulse' ? 72 : key === 'systolicBP' ? 120 : 80);
      const updated = Math.min(max, Math.max(min, current + delta));
      return {
        ...prev,
        [key]: stepDecimals > 0 ? updated.toFixed(stepDecimals) : Math.round(updated).toString()
      };
    });
  };

  // Real-time Vitals Range Checks
  const spo2Val = parseFloat(vitals.spo2);
  const isSpo2Critical = !isNaN(spo2Val) && spo2Val > 0 && spo2Val < 92;
  const isSpo2Warning = !isNaN(spo2Val) && spo2Val >= 92 && spo2Val <= 94;

  const tempVal = parseFloat(vitals.temperature);
  const isTempHigh = !isNaN(tempVal) && tempVal > 38.5;

  const systolicVal = parseFloat(vitals.systolicBP);
  const diastolicVal = parseFloat(vitals.diastolicBP);
  const isBPCrisis = (!isNaN(systolicVal) && systolicVal >= 180) || (!isNaN(diastolicVal) && diastolicVal >= 120);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);

    const patientId = profile?._id || user?.id;

    const symptomsArray = Object.entries(selectedSymptoms).map(([code, severity]) => ({
      code,
      severity,
      notes: symptomNotes || undefined
    }));

    const vitalsObj = {};
    if (vitals.temperature) vitalsObj.temperature = parseFloat(vitals.temperature);
    if (vitals.pulse) vitalsObj.pulse = parseInt(vitals.pulse, 10);
    if (vitals.spo2) vitalsObj.spo2 = parseInt(vitals.spo2, 10);
    if (vitals.systolicBP && vitals.diastolicBP) {
      vitalsObj.bloodPressure = {
        systolic: parseInt(vitals.systolicBP, 10),
        diastolic: parseInt(vitals.diastolicBP, 10)
      };
    }

    const localEval = evaluateRisk({
      symptoms: symptomsArray,
      vitals: vitalsObj,
      assessedOn: 'device'
    });

    try {
      if (isOnline) {
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
          setAssessmentResult(json.data.assessment || localEval);
          setSyncStatus('synced');
        } else {
          throw new Error('Server returned non-200');
        }
      } else {
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
      console.warn('Network error during symptom submit, falling back to local assessment:', err.message);
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

  const filteredSymptoms = activeRegion === 'all'
    ? SYMPTOM_OPTIONS
    : SYMPTOM_OPTIONS.filter((s) => s.region === activeRegion);

  const regionTabs = [
    { id: 'all', label: 'All Symptoms', icon: Layers },
    { id: 'chest', label: 'Chest & Breathing', icon: HeartCrack },
    { id: 'head', label: 'Head & Senses', icon: Brain },
    { id: 'wound', label: 'Surgical Wound', icon: Bandage },
    { id: 'abdomen', label: 'Abdomen & Digestion', icon: Activity }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
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
          {/* Main Symptom Selector Card */}
          <div className="card-premium p-6">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {t('symptoms.title')}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t('symptoms.subtitle')}
            </p>

            {/* Anatomical Region Filter Chips */}
            <div className="flex items-center gap-1.5 mt-5 overflow-x-auto pb-2 scrollbar-none">
              {regionTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveRegion(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      activeRegion === tab.id
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Symptom Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              {filteredSymptoms.map(({ code, icon: Icon, labelKey, critical }) => {
                const isSelected = Boolean(selectedSymptoms[code]);
                const severity = selectedSymptoms[code] || 0;

                return (
                  <div
                    key={code}
                    className={`rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? 'border-teal-600 dark:border-teal-500 bg-teal-50/80 dark:bg-teal-950/60 shadow-md ring-2 ring-teal-500/20'
                        : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSymptom(code)}
                      className="w-full flex items-start gap-3 text-left focus:outline-none"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold text-sm block leading-tight ${
                              isSelected
                                ? 'text-teal-950 dark:text-teal-100'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {t(labelKey)}
                          </span>
                          {critical && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" title="High-risk clinical red flag" />
                          )}
                        </div>
                        <span
                          className={`text-[11px] mt-0.5 block ${
                            isSelected
                              ? 'text-teal-700 dark:text-teal-300 font-semibold'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {isSelected
                            ? `Severity: ${t(`symptoms.severityLevels.${severity}`)}`
                            : 'Tap to select'}
                        </span>
                      </div>
                    </button>

                    {/* Severity Selector */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-teal-200/60 dark:border-teal-800 flex items-center justify-between gap-1">
                        {[1, 2, 3].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => handleSetSeverity(code, level)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              severity === level
                                ? 'bg-teal-700 dark:bg-teal-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 border border-slate-200 dark:border-slate-600'
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

          {/* Vitals Input Card with Real-Time Feedback & Touch Steppers */}
          <div className="card-premium p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>{t('symptoms.vitalsTitle')}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter any measurements taken today using home or clinic instruments.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Temperature */}
              <div
                className={`p-3 rounded-2xl border transition-colors ${
                  isTempHigh
                    ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40'
                    : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Temp (°C)
                  </label>
                  <Thermometer className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustVital('temperature', -0.2, 34, 43, 1)}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="37.0"
                    value={vitals.temperature}
                    onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                    className="flex-1 text-center py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold font-tabular"
                  />
                  <button
                    type="button"
                    onClick={() => adjustVital('temperature', 0.2, 34, 43, 1)}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {isTempHigh && (
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 mt-1.5 block">
                    High Fever (&gt; 38.5°C)
                  </span>
                )}
              </div>

              {/* SpO2 Oxygen */}
              <div
                className={`p-3 rounded-2xl border transition-colors ${
                  isSpo2Critical
                    ? 'border-red-500 bg-red-50/70 dark:bg-red-950/50'
                    : isSpo2Warning
                    ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40'
                    : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    SpO2 (%)
                  </label>
                  <Wind className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustVital('spo2', -1, 50, 100)}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    placeholder="98"
                    value={vitals.spo2}
                    onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                    className="flex-1 text-center py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold font-tabular"
                  />
                  <button
                    type="button"
                    onClick={() => adjustVital('spo2', 1, 50, 100)}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {isSpo2Critical ? (
                  <span className="text-[10px] font-black text-red-700 dark:text-red-300 mt-1.5 block animate-pulse">
                    Critical: Low Oxygen (&lt; 92%)
                  </span>
                ) : isSpo2Warning ? (
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 mt-1.5 block">
                    Warning Range (92-94%)
                  </span>
                ) : null}
              </div>

              {/* Pulse */}
              <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Pulse (bpm)
                  </label>
                  <Activity className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustVital('pulse', -2, 30, 220)}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    placeholder="74"
                    value={vitals.pulse}
                    onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                    className="flex-1 text-center py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold font-tabular"
                  />
                  <button
                    type="button"
                    onClick={() => adjustVital('pulse', 2, 30, 220)}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Blood Pressure */}
              <div
                className={`p-3 rounded-2xl border transition-colors ${
                  isBPCrisis
                    ? 'border-red-500 bg-red-50/70 dark:bg-red-950/50'
                    : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    BP (Sys / Dia)
                  </label>
                  <HeartCrack className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="120"
                    value={vitals.systolicBP}
                    onChange={(e) => setVitals({ ...vitals, systolicBP: e.target.value })}
                    className="w-1/2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold text-center font-tabular"
                  />
                  <span className="text-slate-400 font-bold">/</span>
                  <input
                    type="number"
                    placeholder="80"
                    value={vitals.diastolicBP}
                    onChange={(e) => setVitals({ ...vitals, diastolicBP: e.target.value })}
                    className="w-1/2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold text-center font-tabular"
                  />
                </div>
                {isBPCrisis && (
                  <span className="text-[10px] font-black text-red-700 dark:text-red-300 mt-1.5 block">
                    Crisis BP (≥180/120)
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                rows="2"
                placeholder="Describe any other sensations or specific times when symptoms began..."
                value={symptomNotes}
                onChange={(e) => setSymptomNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-touch bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md transition-all rounded-2xl"
          >
            {isSubmitting ? t('symptoms.evaluating') : t('symptoms.submitReport')}
          </button>
        </form>
      ) : (
        /* Evaluation Result Screen */
        <div className="space-y-6">
          <div
            className={`card-premium p-8 border-2 ${
              assessmentResult.riskLevel === 'critical'
                ? 'border-red-500 bg-red-50/50 dark:bg-red-950/40'
                : assessmentResult.riskLevel === 'high'
                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/40'
                : assessmentResult.riskLevel === 'medium'
                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40'
                : 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <RiskBadge level={assessmentResult.riskLevel} size="lg" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Assessed on: {assessmentResult.assessedOn} &bull; Ruleset v{assessmentResult.rulesetVersion}
                </span>
              </div>
              <SyncStatusBadge status={syncStatus} />
            </div>

            <div className="mt-6 space-y-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {assessmentResult.suggestedAction}
              </h2>

              <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                <strong className="block text-xs uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Clinical Evaluation Summary:
                </strong>
                {assessmentResult.explanation}
              </div>

              {assessmentResult.redFlags && assessmentResult.redFlags.length > 0 && (
                <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <strong className="block text-xs uppercase font-bold text-red-700 dark:text-red-400 mb-2">
                    Red Flags Detected:
                  </strong>
                  <ul className="space-y-1">
                    {assessmentResult.redFlags.map((flag, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
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
                      <div className="text-xs text-red-100">
                        Do not travel alone. Emergency ambulance line is toll-free 24/7.
                      </div>
                    </div>
                  </div>
                  <a
                    href="tel:108"
                    className="btn-touch bg-white text-red-700 hover:bg-red-50 font-black text-sm px-6 py-2.5 shadow rounded-xl"
                  >
                    Dial 108 Now
                  </a>
                </div>
              )}

              {/* Safety principle reminder */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                <span>{t('safetyPrinciple')}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setAssessmentResult(null);
                  setSelectedSymptoms({});
                }}
                className="btn-touch bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold rounded-xl"
              >
                Log Another Report
              </button>
              <button
                onClick={() => navigate('/')}
                className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl"
              >
                Return to Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Immediate Emergency Awareness Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-red-200 dark:border-red-900/60 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-red-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertOctagon className="w-6 h-6 text-red-200 animate-pulse" />
                <h3 className="font-extrabold text-base">Critical Symptom Alert</h3>
              </div>
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="p-1 rounded-lg text-red-100 hover:text-white hover:bg-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                You selected an acute high-risk symptom (such as chest pain or severe breathlessness). If this is crushing, spreading to your arm or jaw, or causing dizziness:
              </p>
              <a
                href="tel:108"
                className="btn-touch bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm w-full flex items-center justify-center gap-2 rounded-xl shadow-md"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call 108 Ambulance Hotline</span>
              </a>
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="w-full py-2 text-center text-slate-500 hover:text-slate-700 font-semibold text-xs"
              >
                I understand, continue logging symptoms
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SymptomReportPage;
