import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  ShieldCheck,
  Plus,
  Minus,
  Layers,
  X,
  Check,
} from "lucide-react";
import { evaluateRisk } from "@healthverse/shared";
import useAuthStore from "../store/useAuthStore.js";
import { saveSymptomReportOffline } from "../db/offlineDb.js";
import { RiskBadge, SyncStatusBadge } from "../components/RiskBadge.jsx";

const SYMPTOM_OPTIONS = [
  {
    code: "chest_pain",
    icon: HeartCrack,
    labelKey: "symptoms.chest_pain",
    region: "chest",
    critical: true,
  },
  {
    code: "breathlessness",
    icon: Wind,
    labelKey: "symptoms.breathlessness",
    region: "chest",
    critical: true,
  },
  {
    code: "fever",
    icon: Thermometer,
    labelKey: "symptoms.fever",
    region: "general",
  },
  {
    code: "bleeding",
    icon: Droplet,
    labelKey: "symptoms.bleeding",
    region: "wound",
    critical: true,
  },
  {
    code: "wound_discharge",
    icon: Bandage,
    labelKey: "symptoms.wound_discharge",
    region: "wound",
  },
  {
    code: "confusion",
    icon: Brain,
    labelKey: "symptoms.confusion",
    region: "head",
    critical: true,
  },
  {
    code: "persistent_vomiting",
    icon: AlertCircle,
    labelKey: "symptoms.persistent_vomiting",
    region: "abdomen",
  },
  {
    code: "reduced_urine_output",
    icon: Activity,
    labelKey: "symptoms.reduced_urine_output",
    region: "abdomen",
  },
  {
    code: "headache",
    icon: Zap,
    labelKey: "symptoms.headache",
    region: "head",
  },
];

export function SymptomReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, isOnline, updatePendingCount } = useAuthStore();

  const [activeRegion, setActiveRegion] = useState("all");
  const [selectedSymptoms, setSelectedSymptoms] = useState({});
  const [symptomNotes, setSymptomNotes] = useState("");

  const [vitals, setVitals] = useState({
    temperature: "",
    pulse: "",
    spo2: "",
    systolicBP: "",
    diastolicBP: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [syncStatus, setSyncStatus] = useState("synced");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const handleToggleSymptom = (code) => {
    setSelectedSymptoms((prev) => {
      const next = { ...prev };
      if (next[code]) {
        delete next[code];
      } else {
        next[code] = 2;
        if (code === "chest_pain" || code === "breathlessness") {
          setShowEmergencyModal(true);
        }
      }
      return next;
    });
  };

  const handleSetSeverity = (code, severity) => {
    setSelectedSymptoms((prev) => ({
      ...prev,
      [code]: severity,
    }));
  };

  const adjustVital = (key, delta, min = 0, max = 300, stepDecimals = 0) => {
    setVitals((prev) => {
      const current =
        parseFloat(prev[key]) ||
        (key === "temperature"
          ? 37.0
          : key === "spo2"
            ? 98
            : key === "pulse"
              ? 72
              : key === "systolicBP"
                ? 120
                : 80);
      const updated = Math.min(max, Math.max(min, current + delta));
      return {
        ...prev,
        [key]:
          stepDecimals > 0
            ? updated.toFixed(stepDecimals)
            : Math.round(updated).toString(),
      };
    });
  };

  const spo2Val = parseFloat(vitals.spo2);
  const isSpo2Critical = !isNaN(spo2Val) && spo2Val > 0 && spo2Val < 92;
  const tempVal = parseFloat(vitals.temperature);
  const isTempHigh = !isNaN(tempVal) && tempVal > 38.5;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);

    const patientId = profile?._id || user?.id;

    const symptomsArray = Object.entries(selectedSymptoms).map(
      ([code, severity]) => ({
        code,
        severity,
        notes: symptomNotes || undefined,
      }),
    );

    const vitalsObj = {};
    if (vitals.temperature)
      vitalsObj.temperature = parseFloat(vitals.temperature);
    if (vitals.pulse) vitalsObj.pulse = parseInt(vitals.pulse, 10);
    if (vitals.spo2) vitalsObj.spo2 = parseInt(vitals.spo2, 10);
    if (vitals.systolicBP && vitals.diastolicBP) {
      vitalsObj.bloodPressure = {
        systolic: parseInt(vitals.systolicBP, 10),
        diastolic: parseInt(vitals.diastolicBP, 10),
      };
    }

    const localEval = evaluateRisk({
      symptoms: symptomsArray,
      vitals: vitalsObj,
      assessedOn: "device",
    });

    try {
      if (isOnline) {
        const res = await fetch("/api/v1/symptoms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            patientId,
            symptoms: symptomsArray,
            vitals: vitalsObj,
            deviceAssessment: localEval,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          setAssessmentResult(json.data.assessment || localEval);
          setSyncStatus("synced");
        } else {
          throw new Error("Server returned non-200");
        }
      } else {
        await saveSymptomReportOffline({
          patientId,
          symptoms: symptomsArray,
          vitals: vitalsObj,
          deviceAssessment: localEval,
        });
        setAssessmentResult(localEval);
        setSyncStatus("pending");
        await updatePendingCount();
      }
    } catch (err) {
      console.warn(
        "Network error during symptom submit, falling back to local assessment:",
        err.message,
      );
      await saveSymptomReportOffline({
        patientId,
        symptoms: symptomsArray,
        vitals: vitalsObj,
        deviceAssessment: localEval,
      });
      setAssessmentResult(localEval);
      setSyncStatus("pending");
      await updatePendingCount();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSymptoms =
    activeRegion === "all"
      ? SYMPTOM_OPTIONS
      : SYMPTOM_OPTIONS.filter((s) => s.region === activeRegion);

  const regionTabs = [
    { id: "all", label: "All", icon: Layers },
    { id: "chest", label: "Chest", icon: HeartCrack },
    { id: "head", label: "Head", icon: Brain },
    { id: "wound", label: "Wound", icon: Bandage },
    { id: "abdomen", label: "Abdomen", icon: Activity },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
      {/* Sleek Minimal Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Check Symptoms & Vitals
          </h1>
          <SyncStatusBadge status={syncStatus} />
        </div>
      </div>

      {!assessmentResult ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Symptoms Card */}
          <div className="card-clean p-4 space-y-3">
            {/* Category Filter Chips */}
            <div className="pill-track overflow-x-auto scrollbar-none">
              {regionTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveRegion(tab.id)}
                    className={`pill-item flex items-center gap-1 whitespace-nowrap ${
                      activeRegion === tab.id ? "pill-item-active" : ""
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Compact Symptom Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredSymptoms.map(
                ({ code, icon: Icon, labelKey, critical }) => {
                  const isSelected = Boolean(selectedSymptoms[code]);
                  const severity = selectedSymptoms[code] || 0;

                  return (
                    <div
                      key={code}
                      className={`rounded-xl border p-2.5 transition-all text-xs ${
                        isSelected
                          ? "border-teal-500 bg-teal-50/70 dark:bg-teal-950/60"
                          : "border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-900/60 hover:border-slate-300"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSymptom(code)}
                        className="w-full flex items-center gap-2 text-left"
                      >
                        <div
                          className={`icon-box !w-7 !h-7 ${
                            isSelected
                              ? "bg-teal-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate text-xs flex-1">
                          {t(labelKey)}
                        </span>
                        {critical && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                        )}
                      </button>

                      {isSelected && (
                        <div className="mt-2 pt-1.5 border-t border-teal-200/50 dark:border-teal-900/50 flex gap-1">
                          {[1, 2, 3].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => handleSetSeverity(code, lvl)}
                              className={`flex-1 py-0.5 rounded text-[10px] font-bold ${
                                severity === lvl
                                  ? "bg-teal-700 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {lvl === 1 ? "Mild" : lvl === 2 ? "Mod" : "Sev"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {/* Compact Vitals Card */}
          <div className="card-clean p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              <span>Vitals (Optional)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Temp */}
              <div
                className={`p-2 rounded-xl border text-xs ${isTempHigh ? "border-amber-400 bg-amber-50/50" : "border-slate-200 dark:border-slate-800"}`}
              >
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1">
                  <span>Temp (°C)</span>
                  <Thermometer className="w-3 h-3 text-slate-400" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustVital("temperature", -0.2, 34, 43, 1)}
                    className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="37.0"
                    value={vitals.temperature}
                    onChange={(e) =>
                      setVitals({ ...vitals, temperature: e.target.value })
                    }
                    className="flex-1 text-center py-1 bg-transparent font-bold text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => adjustVital("temperature", 0.2, 34, 43, 1)}
                    className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* SpO2 */}
              <div
                className={`p-2 rounded-xl border text-xs ${isSpo2Critical ? "border-red-500 bg-red-50/50" : "border-slate-200 dark:border-slate-800"}`}
              >
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1">
                  <span>SpO2 (%)</span>
                  <Wind className="w-3 h-3 text-slate-400" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustVital("spo2", -1, 50, 100)}
                    className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    placeholder="98"
                    value={vitals.spo2}
                    onChange={(e) =>
                      setVitals({ ...vitals, spo2: e.target.value })
                    }
                    className="flex-1 text-center py-1 bg-transparent font-bold text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => adjustVital("spo2", 1, 50, 100)}
                    className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Pulse */}
              <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1">
                  <span>Pulse (bpm)</span>
                  <Activity className="w-3 h-3 text-slate-400" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustVital("pulse", -2, 30, 220)}
                    className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    placeholder="72"
                    value={vitals.pulse}
                    onChange={(e) =>
                      setVitals({ ...vitals, pulse: e.target.value })
                    }
                    className="flex-1 text-center py-1 bg-transparent font-bold text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => adjustVital("pulse", 2, 30, 220)}
                    className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* BP */}
              <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1">
                  <span>BP (Sys/Dia)</span>
                  <HeartCrack className="w-3 h-3 text-slate-400" />
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="120"
                    value={vitals.systolicBP}
                    onChange={(e) =>
                      setVitals({ ...vitals, systolicBP: e.target.value })
                    }
                    className="w-1/2 text-center py-1 bg-transparent font-bold text-xs"
                  />
                  <span className="text-slate-400">/</span>
                  <input
                    type="number"
                    placeholder="80"
                    value={vitals.diastolicBP}
                    onChange={(e) =>
                      setVitals({ ...vitals, diastolicBP: e.target.value })
                    }
                    className="w-1/2 text-center py-1 bg-transparent font-bold text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-touch min-h-[42px] bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            {isSubmitting ? "Evaluating..." : "Evaluate & Submit"}
          </button>
        </form>
      ) : (
        /* Sleek Result View */
        <div className="card-clean p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <RiskBadge level={assessmentResult.riskLevel} size="md" />
            <SyncStatusBadge status={syncStatus} />
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {assessmentResult.suggestedAction}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {assessmentResult.explanation}
            </p>
          </div>

          {assessmentResult.riskLevel === "critical" && (
            <div className="p-3 rounded-xl bg-red-600 text-white flex items-center justify-between text-xs">
              <span className="font-bold">
                Call 108 Emergency Ambulance Immediately
              </span>
              <a
                href="tel:108"
                className="px-3 py-1 bg-white text-red-700 font-bold rounded-lg text-xs"
              >
                Call 108
              </a>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setAssessmentResult(null);
                setSelectedSymptoms({});
              }}
              className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Report Again
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* Emergency Alert Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-red-200 w-full max-w-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-600 font-bold text-xs">
              <AlertOctagon className="w-4 h-4" />
              <span>High Alert Symptom</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              You selected a critical symptom. If experiencing acute discomfort:
            </p>
            <a
              href="tel:108"
              className="w-full py-2 bg-red-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call 108 Ambulance</span>
            </a>
            <button
              type="button"
              onClick={() => setShowEmergencyModal(false)}
              className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SymptomReportPage;
