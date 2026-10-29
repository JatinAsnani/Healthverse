import React from 'react';
import {
  Pill,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';

/**
 * Status styling for the 5-day dot strip
 */
const STATUS_CONFIG = {
  taken: {
    color: 'bg-emerald-500 border-emerald-400',
    label: 'Taken on schedule',
    icon: Check
  },
  late: {
    color: 'bg-amber-500 border-amber-400',
    label: 'Taken late',
    icon: Clock
  },
  missed: {
    color: 'bg-rose-500 border-rose-400',
    label: 'Dose missed',
    icon: X
  }
};

/**
 * Helper to get adherence badge styling & icon
 */
function getAdherenceBadge(rate = 100) {
  if (rate >= 80) {
    return {
      classes: 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300',
      icon: CheckCircle2,
      label: `${rate}% Adherent`
    };
  }
  if (rate >= 60) {
    return {
      classes: 'bg-amber-950/70 border-amber-800/80 text-amber-300',
      icon: Clock,
      label: `${rate}% Moderate`
    };
  }
  return {
    classes: 'bg-rose-950/70 border-rose-800/80 text-rose-300',
    icon: AlertTriangle,
    label: `${rate}% At Risk`
  };
}

/**
 * MedicationList
 * Displays active post-discharge medications with 5-day adherence tracking dot strips
 */
export function MedicationList({
  medications = [],
  onAddMedication
}) {
  // Calculate average overall adherence across all medications
  const overallAdherence = medications.length > 0
    ? Math.round(medications.reduce((sum, m) => sum + (m.adherenceRate || 100), 0) / medications.length)
    : 100;

  const overallBadge = getAdherenceBadge(overallAdherence);
  const OverallIcon = overallBadge.icon;

  return (
    <div className="card-premium p-5 sm:p-6 bg-slate-900/90 border border-slate-800 shadow-lg">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-950/70 border border-teal-800/60 flex items-center justify-center text-teal-400">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">
              Medications &amp; 5-Day Adherence
            </h3>
            <p className="text-[11px] text-slate-400">
              Active regimens &bull; Verified via patient check-ins &amp; ASHA audits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Overall Adherence Badge */}
          {medications.length > 0 && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold border ${overallBadge.classes}`}
              title="Average adherence across all active medicines"
            >
              <OverallIcon className="w-3.5 h-3.5" />
              <span>{overallBadge.label}</span>
            </div>
          )}

          {/* Add Medication Action */}
          {onAddMedication && (
            <button
              type="button"
              onClick={onAddMedication}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Med</span>
            </button>
          )}
        </div>
      </div>

      {/* Legend for 5-Day Dot Strip */}
      <div className="flex items-center gap-4 mb-3 text-[11px] text-slate-400 font-medium">
        <span className="text-slate-400 font-semibold">5-Day Tracking:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>Taken</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <span>Late</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
          <span>Missed</span>
        </span>
      </div>

      {/* Empty State */}
      {medications.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No medications currently prescribed. Click &ldquo;Add Med&rdquo; to add a prescription.
        </div>
      ) : (
        /* Medication Cards List */
        <div className="space-y-3">
          {medications.map((med) => {
            const medBadge = getAdherenceBadge(med.adherenceRate || 100);
            const MedBadgeIcon = medBadge.icon;

            return (
              <div
                key={med.id}
                className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Left: Medicine details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                        {med.name}
                      </h4>
                      {med.critical && (
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60">
                          Critical
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span className="text-teal-400 font-medium">{med.dosage}</span>
                      <span>&bull;</span>
                      <span>{med.frequency}</span>
                    </div>
                  </div>

                  {/* Right: Dot strip and individual adherence */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {/* 5-day dot strip */}
                    <div
                      className="flex items-center gap-1.5 bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-800"
                      role="group"
                      aria-label={`5-day adherence history for ${med.name}`}
                    >
                      {med.fiveDayHistory?.map((dayRecord, dIdx) => {
                        const statusCfg = STATUS_CONFIG[dayRecord.status] || STATUS_CONFIG.taken;
                        return (
                          <div
                            key={dIdx}
                            className="relative group/dot flex flex-col items-center"
                          >
                            <span
                              className={`w-3 h-3 rounded-full border ${statusCfg.color} shadow-sm transition-transform group-hover/dot:scale-125`}
                              aria-label={`${dayRecord.day}: ${statusCfg.label}`}
                            />
                            {/* Hover tooltip */}
                            <span className="absolute bottom-full mb-1.5 hidden group-hover/dot:block z-10 whitespace-nowrap text-[10px] bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700 shadow-md">
                              {dayRecord.day}: {statusCfg.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Rate pill */}
                    <span
                      className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border flex items-center gap-1 ${medBadge.classes}`}
                    >
                      <MedBadgeIcon className="w-3 h-3" />
                      <span>{med.adherenceRate}%</span>
                    </span>
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

