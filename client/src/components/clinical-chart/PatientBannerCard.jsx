import React from 'react';
import {
  Phone,
  Calendar,
  MessageSquare,
  User,
  Stethoscope,
  Clock,
  HeartHandshake
} from 'lucide-react';
import { RiskBadge } from '../RiskBadge.jsx';

export function PatientBannerCard({
  patient,
  discharge,
  riskLevel = 'low',
  onBookVisit,
  onCall,
  onMessage
}) {
  if (!patient) return null;

  // Format initials
  const initials = patient.name
    ? patient.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'PT';

  // Age & Sex
  const age = patient.age || patient.demographics?.age || 58;
  const gender = patient.gender || patient.demographics?.gender || 'M';
  const sexFormatted = gender.toLowerCase().startsWith('m')
    ? 'M'
    : gender.toLowerCase().startsWith('f')
    ? 'F'
    : 'O';

  // Attending Doctor
  const treatingDoctor =
    discharge?.treatingDoctor?.name ||
    discharge?.treatingDoctor ||
    patient.attendingDoctor ||
    'Dr. Ananya Sharma';

  // Diagnosis
  const diagnosis = discharge?.diagnosis || patient.medicalHistory?.primaryDiagnosis || 'Post-Discharge Recovery Care';

  // Discharge Date & Recovery Day
  const dischargeDateObj = discharge?.dischargeDate ? new Date(discharge.dischargeDate) : new Date(Date.now() - 5 * 86400000);
  const totalDays = discharge?.expectedRecoveryDays || 14;
  const elapsedDays = Math.max(1, Math.min(totalDays, Math.floor((Date.now() - dischargeDateObj.getTime()) / 86400000) + 1));

  return (
    <div className="card-clean p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Avatar & Patient Demographics */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-lg shrink-0">
            {initials}
          </div>

          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {patient.name}
              </h1>
              <RiskBadge level={riskLevel} size="sm" />
            </div>

            <div className="flex flex-wrap items-center gap-y-0.5 gap-x-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[11px]">
                {patient.patientId || 'HV-2026'}
              </span>
              <span>&bull;</span>
              <span>{age} {sexFormatted}</span>
              <span>&bull;</span>
              <span className="font-mono">{patient.phone || 'N/A'}</span>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>{treatingDoctor}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto justify-end">
          <button
            type="button"
            onClick={onCall}
            aria-label={`Call ${patient.name}`}
            className="btn-touch flex-1 sm:flex-none min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Call</span>
          </button>

          <button
            type="button"
            onClick={onBookVisit}
            aria-label={`Book follow-up visit for ${patient.name}`}
            className="btn-touch flex-1 sm:flex-none min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all flex items-center justify-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Book Visit</span>
          </button>

          <button
            type="button"
            onClick={onMessage}
            aria-label={`Send continuity message to ${patient.name}`}
            className="btn-touch flex-1 sm:flex-none min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Message</span>
          </button>
        </div>
      </div>

      {/* Clinical Diagnosis & Recovery Tracker Strip */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <HeartHandshake className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>
            <strong className="label-micro mr-1">Diagnosis:</strong>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{diagnosis}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 dark:text-slate-400 font-medium">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Discharged: <strong className="font-tabular font-semibold text-slate-700 dark:text-slate-200">{dischargeDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
          </span>

          <span className="inline-flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200/60 dark:border-teal-800/60 text-teal-700 dark:text-teal-300 font-bold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span>Day {elapsedDays} of {totalDays}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default PatientBannerCard;
