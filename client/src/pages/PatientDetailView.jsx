import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  X,
  Plus,
  Calendar,
  Pill,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import useAuthStore from "../store/useAuthStore.js";

// Modular Clinical Chart Sub-components
import { ChartBreadcrumb } from "../components/clinical-chart/ChartBreadcrumb.jsx";
import { PatientBannerCard } from "../components/clinical-chart/PatientBannerCard.jsx";
import { AlertStrip } from "../components/clinical-chart/AlertStrip.jsx";
import { VitalsRow } from "../components/clinical-chart/VitalsRow.jsx";
import { VitalsTrendChart } from "../components/clinical-chart/VitalsTrendChart.jsx";
import { ClinicalTimeline } from "../components/clinical-chart/ClinicalTimeline.jsx";
import { MedicationList } from "../components/clinical-chart/MedicationList.jsx";
import { CarePlanChecklist } from "../components/clinical-chart/CarePlanChecklist.jsx";
import { ClinicalNotesPanel } from "../components/clinical-chart/ClinicalNotesPanel.jsx";

// Typed Clinical Chart Mock & Helper Data
import {
  getVitalsTrendData,
  getLatestVitalsSummary,
  getMedicationAdherenceList,
  getCarePlanChecklist,
  getClinicalTimelineEvents,
  getInitialClinicalNotes,
} from "../data/patientChartMockData.js";

/**
 * PatientDetailView
 * Redesigned Clinical Chart adhering strictly to the post-discharge continuity-of-care layout:
 * 1. Breadcrumb
 * 2. Patient Banner Card (Demographics, Doctor, Days, Actions)
 * 3. Alert Strip (Active alert escalation / Calm recovery line when stable)
 * 4. Vitals Row (Heart Rate, BP, SpO2, Weight with sparklines & severity)
 * 5. Two-Column Layout (Vitals trend & Timeline on Left, Meds, Care Plan & Notes on Right)
 */
export function PatientDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Modals state
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);

  // Form states
  const [newMed, setNewMed] = useState({
    medicine: "",
    dosage: "",
    critical: false,
    timesPerDay: 1,
    timingLabel: "Morning",
    timingHour: "09:00",
    foodTiming: "after_food",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    instructions: "",
  });

  const [newFollowup, setNewFollowup] = useState({
    scheduledAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    type: "in_person",
    notes: "Routine clinical check-up",
  });

  useEffect(() => {
    fetchPatientChart();
  }, [id]);

  const fetchPatientChart = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await fetch(`/api/v1/patients/${id}`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setLoadError(errJson.message || "Failed to retrieve patient chart");
      }
    } catch (e) {
      console.error(e);
      setLoadError("Network error connecting to patient clinical service");
    } finally {
      setIsLoading(false);
    }
  };

  // Alert Action Handlers
  const handleAcknowledgeAlert = async (alertId) => {
    try {
      const res = await fetch(`/api/v1/alerts/${alertId}/acknowledge`, {
        method: "PATCH",
        credentials: "include",
      });
      if (res.ok) {
        await fetchPatientChart();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || "Failed to acknowledge alert");
      }
    } catch (err) {
      console.error(err);
      alert("Network error acknowledging alert");
    }
  };

  const handleSendToER = async (alertId) => {
    if (
      !window.confirm(
        "Confirm immediate Emergency Transfer (ER) escalation for this patient?",
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/alerts/${alertId}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          actionTaken: "emergency_transfer",
          notes:
            "Direct emergency transfer initiated from Clinical Chart by attending clinician",
        }),
      });
      if (res.ok) {
        alert("Patient escalated to ER desk. Emergency protocol activated.");
        await fetchPatientChart();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || "Failed to process ER escalation");
      }
    } catch (err) {
      console.error(err);
      alert("Network error sending ER referral");
    }
  };

  // Banner Actions
  const handleCall = () => {
    if (data?.patient?.phone) {
      window.location.href = `tel:${data.patient.phone}`;
    } else {
      alert("No verified phone number on record for this patient.");
    }
  };

  const handleMessage = () => {
    if (data?.patient?.phone) {
      const cleanPhone = data.patient.phone.replace(/[^0-9]/g, "");
      const defaultText = encodeURIComponent(
        `Namaste ${data.patient.name}, this is Dr. Ananya Sharma from District Sub-Divisional Hospital & Trauma Centre Mandvi regarding your post-discharge continuity follow-up.`,
      );
      window.open(
        `https://wa.me/91${cleanPhone}?text=${defaultText}`,
        "_blank",
      );
    } else {
      alert("No verified phone number on record for this patient.");
    }
  };

  // Prescription Form Submit
  const handleAddMedSubmit = async (e) => {
    e.preventDefault();
    const activeDischarge = data?.discharges?.[0];

    try {
      const res = await fetch("/api/v1/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          dischargeId: activeDischarge?._id || undefined,
          patientId: id,
          medicine: newMed.medicine,
          dosage: newMed.dosage,
          critical: newMed.critical,
          schedule: {
            timesPerDay: Number(newMed.timesPerDay) || 1,
            timings: [
              {
                time: newMed.timingHour || "09:00",
                label: newMed.timingLabel || "Morning",
              },
            ],
            foodTiming: newMed.foodTiming || "after_food",
          },
          startDate: newMed.startDate || new Date().toISOString().split("T")[0],
          endDate:
            newMed.endDate ||
            new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
          instructions: newMed.instructions || "Take as advised by doctor",
        }),
      });

      if (res.ok) {
        setShowAddMedModal(false);
        setNewMed({
          medicine: "",
          dosage: "",
          critical: false,
          timesPerDay: 1,
          timingLabel: "Morning",
          timingHour: "09:00",
          foodTiming: "after_food",
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 14 * 86400000)
            .toISOString()
            .split("T")[0],
          instructions: "",
        });
        await fetchPatientChart();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(
          errData.message ||
            errData.errors?.[0]?.msg ||
            "Failed to add medication",
        );
      }
    } catch (err) {
      console.error(err);
      alert("Network error while adding medication");
    }
  };

  // Follow-up Appointment Submit
  const handleScheduleFollowupSubmit = async (e) => {
    e.preventDefault();
    const activeDischarge = data?.discharges?.[0];
    try {
      const res = await fetch("/api/v1/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId: id,
          dischargeId: activeDischarge?._id || undefined,
          scheduledAt: newFollowup.scheduledAt,
          type: newFollowup.type,
          notes: newFollowup.notes,
        }),
      });

      if (res.ok) {
        setShowFollowupModal(false);
        await fetchPatientChart();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(
          errData.message ||
            errData.errors?.[0]?.msg ||
            "Failed to schedule visit",
        );
      }
    } catch (err) {
      console.error(err);
      alert("Network error while scheduling visit");
    }
  };

  // Care Plan Milestone Toggle (Live updates database)
  const handleCarePlanToggle = async (itemId, nextStatus) => {
    const isInv = data?.investigations?.some((i) => i._id === itemId);
    const isFup = data?.followups?.some((f) => f._id === itemId);

    try {
      if (isInv) {
        await fetch(`/api/v1/investigations/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            status: nextStatus === "completed" ? "resulted" : "ordered",
          }),
        });
        await fetchPatientChart();
      } else if (isFup) {
        await fetch(`/api/v1/followups/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            status: nextStatus === "completed" ? "completed" : "scheduled",
          }),
        });
        await fetchPatientChart();
      }
    } catch (e) {
      console.error("Error updating milestone in database:", e);
    }
  };

  // Clinical Note Submit
  const handleNewClinicalNote = (note) => {
    console.log("New clinical note logged:", note);
  };

  // Data processing with useMemo
  const patient = data?.patient;
  const activeDischarge = data?.discharges?.[0];
  const latestRisk = data?.riskAssessments?.[0];
  const openAlert = data?.alerts?.find(
    (a) => a.status === "open" || a.status === "escalated",
  );

  // Recovery Day Calculation
  const dischargeDateObj = activeDischarge?.dischargeDate
    ? new Date(activeDischarge.dischargeDate)
    : new Date(Date.now() - 5 * 86400000);
  const totalDays = activeDischarge?.expectedRecoveryDays || 14;
  const elapsedDays = Math.max(
    1,
    Math.min(
      totalDays,
      Math.floor((Date.now() - dischargeDateObj.getTime()) / 86400000) + 1,
    ),
  );

  const vitalsSummary = useMemo(() => {
    const latestRecordedVitals = data?.recentSymptoms?.[0]?.vitals || {};
    return getLatestVitalsSummary(latestRecordedVitals);
  }, [data?.recentSymptoms]);

  const trendData = useMemo(() => {
    return getVitalsTrendData(data?.recentSymptoms || []);
  }, [data?.recentSymptoms]);

  const medicationList = useMemo(() => {
    return getMedicationAdherenceList(
      data?.prescriptions || [],
      data?.adherenceLogs || [],
    );
  }, [data?.prescriptions, data?.adherenceLogs]);

  const carePlanItems = useMemo(() => {
    return getCarePlanChecklist(
      activeDischarge?.diagnosis,
      data?.investigations || [],
      data?.followups || [],
    );
  }, [activeDischarge, data?.investigations, data?.followups]);

  const timelineEvents = useMemo(() => {
    return getClinicalTimelineEvents({
      alerts: data?.alerts || [],
      symptoms: data?.recentSymptoms || [],
      discharges: data?.discharges || [],
    });
  }, [data?.alerts, data?.recentSymptoms, data?.discharges]);

  const clinicalNotes = useMemo(() => {
    return getInitialClinicalNotes();
  }, []);

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="h-5 w-48 rounded-lg skeleton-shimmer" />
        <div className="h-32 rounded-2xl skeleton-shimmer" />
        <div className="h-12 rounded-xl skeleton-shimmer" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl skeleton-shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-72 rounded-2xl skeleton-shimmer" />
          <div className="h-72 rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    );
  }

  // Error State
  if (loadError || !patient) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/70 border border-rose-800 flex items-center justify-center mx-auto text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">
          Unable to Load Clinical Chart
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {loadError ||
            "The requested patient record could not be found or has been archived."}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => navigate("/clinician")}
            className="btn-touch bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
          >
            Return to Roster
          </button>
          <button
            onClick={fetchPatientChart}
            className="btn-touch bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      {/* 1. Breadcrumb: "Discharged patient roster / [Patient name]" */}
      <ChartBreadcrumb patientName={patient.name} />

      {/* 2. Patient Banner Card */}
      <PatientBannerCard
        patient={patient}
        discharge={activeDischarge}
        riskLevel={latestRisk?.riskLevel || "low"}
        onBookVisit={() => setShowFollowupModal(true)}
        onCall={handleCall}
        onMessage={handleMessage}
      />

      {/* 3. Alert Strip (open alert action or calm recovery summary) */}
      <AlertStrip
        alert={openAlert}
        recoverySummary={`Recovering as expected, day ${elapsedDays} of ${totalDays}`}
        onAcknowledge={handleAcknowledgeAlert}
        onSendToER={handleSendToER}
      />

      {/* 4. Vitals Row (4 cards: Heart rate, BP, SpO2, Weight with sparklines) */}
      <VitalsRow vitalsSummary={vitalsSummary} />

      {/* 5. Two-Column Section (Stacks to one column below 768px) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Left Column: Vitals Trend Chart & Clinical Timeline */}
        <div className="space-y-4">
          <VitalsTrendChart trendData={trendData} />
          <ClinicalTimeline events={timelineEvents} />
        </div>

        {/* Right Column: Medications, Care Plan Checklist, Clinical Notes */}
        <div className="space-y-4">
          <MedicationList
            medications={medicationList}
            onAddMedication={() => setShowAddMedModal(true)}
          />
          <CarePlanChecklist
            initialItems={carePlanItems}
            onItemToggle={handleCarePlanToggle}
          />
          <ClinicalNotesPanel
            initialNotes={clinicalNotes}
            onAddNote={handleNewClinicalNote}
          />
        </div>
      </div>

      {/* ADD MEDICATION MODAL */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="card-clean max-w-md w-full p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Add Post-Discharge Prescription</span>
              </h3>
              <button
                onClick={() => setShowAddMedModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMedSubmit} className="space-y-3 text-xs">
              <div>
                <label className="label-micro block mb-1">Medicine Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aspirin 75mg / Atorvastatin"
                  value={newMed.medicine}
                  onChange={(e) =>
                    setNewMed({ ...newMed, medicine: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="label-micro block mb-1">
                  Dosage &amp; Frequency
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 75mg once daily"
                  value={newMed.dosage}
                  onChange={(e) =>
                    setNewMed({ ...newMed, dosage: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50">
                <input
                  type="checkbox"
                  id="critCheck"
                  checked={newMed.critical}
                  onChange={(e) =>
                    setNewMed({ ...newMed, critical: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                />
                <label
                  htmlFor="critCheck"
                  className="font-semibold text-xs text-red-700 dark:text-red-300 cursor-pointer select-none"
                >
                  Critical Medication (Triggers alerts if missed)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  Save Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE FOLLOWUP MODAL */}
      {showFollowupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="card-clean max-w-md w-full p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Book Follow-up Appointment</span>
              </h3>
              <button
                onClick={() => setShowFollowupModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleScheduleFollowupSubmit}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="label-micro block mb-1">
                  Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newFollowup.scheduledAt}
                  onChange={(e) =>
                    setNewFollowup({
                      ...newFollowup,
                      scheduledAt: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-tabular text-xs"
                />
              </div>

              <div>
                <label className="label-micro block mb-1">Visit Type</label>
                <select
                  value={newFollowup.type}
                  onChange={(e) =>
                    setNewFollowup({ ...newFollowup, type: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                >
                  <option value="in_person">In-Person at Hospital</option>
                  <option value="home_visit_chw">
                    Home Visit by CHW (ASHA)
                  </option>
                  <option value="telephonic">Telephonic Consultation</option>
                </select>
              </div>

              <div>
                <label className="label-micro block mb-1">Clinical Notes</label>
                <textarea
                  rows="2"
                  value={newFollowup.notes}
                  onChange={(e) =>
                    setNewFollowup({ ...newFollowup, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFollowupModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientDetailView;
