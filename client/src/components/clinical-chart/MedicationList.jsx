import React from "react";
import {
  Pill,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
} from "lucide-react";

/**
 * Helper to get adherence badge styling & icon
 */
function getAdherenceBadge(rate = 100) {
  if (rate >= 80) {
    return {
      classes:
        "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
      icon: CheckCircle2,
      label: `${rate}% Adherent`,
    };
  }
  if (rate >= 60) {
    return {
      classes:
        "bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
      icon: Clock,
      label: `${rate}% Moderate`,
    };
  }
  return {
    classes:
      "bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300",
    icon: AlertTriangle,
    label: `${rate}% At Risk`,
  };
}

/**
 * MedicationList
 * Displays active post-discharge medications with 5-day adherence tracking dot strips
 */
export function MedicationList({ medications = [], onAddMedication }) {
  const overallAdherence =
    medications.length > 0
      ? Math.round(
          medications.reduce((sum, m) => sum + (m.adherenceRate || 100), 0) /
            medications.length,
        )
      : 100;

  const overallBadge = getAdherenceBadge(overallAdherence);
  const OverallIcon = overallBadge.icon;

  return (
    <div className="card-clean p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="icon-box !w-7 !h-7 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <Pill className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Prescriptions &amp; Adherence
            </h3>
            <p className="text-[10px] text-slate-400">
              Active regimens &bull; Verified via check-ins &amp; ASHA audits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {medications.length > 0 && (
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${overallBadge.classes}`}
            >
              <OverallIcon className="w-3 h-3" />
              <span>{overallBadge.label}</span>
            </div>
          )}

          {onAddMedication && (
            <button
              type="button"
              onClick={onAddMedication}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Legend for 5-Day Dot Strip */}
      <div className="flex items-center gap-3 mb-2.5 text-[10px] text-slate-400 font-medium">
        <span className="label-micro">5-Day Tracking:</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>Taken</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          <span>Late</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
          <span>Missed</span>
        </span>
      </div>

      {/* Empty State */}
      {medications.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No medications currently prescribed.
        </div>
      ) : (
        /* Medication Cards List */
        <div className="space-y-2">
          {medications.map((med) => {
            const medBadge = getAdherenceBadge(med.adherenceRate || 100);
            const MedBadgeIcon = medBadge.icon;

            return (
              <div
                key={med.id}
                className="bg-slate-50/70 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Left: Medicine details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {med.name}
                      </h4>
                      {med.critical && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                          Critical
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-tabular">
                      <span className="text-teal-600 dark:text-teal-400 font-medium">
                        {med.dosage}
                      </span>
                      <span>&bull;</span>
                      <span>{med.frequency}</span>
                    </div>
                  </div>

                  {/* Right: Dot strip and individual adherence */}
                  <div className="flex items-center gap-2.5 self-end sm:self-center">
                    {/* 5-day dot strip */}
                    <div
                      className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200/80 dark:border-slate-800"
                      role="group"
                      aria-label={`5-day adherence history for ${med.name}`}
                    >
                      {(
                        med.history || [
                          "taken",
                          "taken",
                          "taken",
                          "taken",
                          "taken",
                        ]
                      ).map((status, i) => (
                        <span
                          key={i}
                          title={`Day ${i + 1}: ${status}`}
                          className={`w-2 h-2 rounded-full ${
                            status === "taken"
                              ? "bg-emerald-500"
                              : status === "late"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          }`}
                        />
                      ))}
                    </div>

                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border font-tabular ${medBadge.classes}`}
                    >
                      <MedBadgeIcon className="w-2.5 h-2.5" />
                      <span>{med.adherenceRate || 100}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MedicationList;
