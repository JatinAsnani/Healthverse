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
        .map(n => n[0])
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
    <div className="card-premium p-5 sm:p-6 bg-slate-900/90 border border-slate-800 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Avatar & Patient Demographics */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-black text-xl sm:text-2xl shadow-inner shrink-0">
            {initials}
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {patient.name}
              </h1>
              <RiskBadge level={riskLevel} size="sm" />
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-400 font-medium">
              <span className="font-mono text-teal-400 font-bold bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/80">
                {patient.patientId || 'HV-2026'}
              </span>
              <span>&bull;</span>
              <span className="text-slate-300 font-semibold">{age} {sexFormatted}</span>
              <span>&bull;</span>
              <span className="font-mono text-slate-300">{patient.phone || 'N/A'}</span>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-1 text-slate-300">
                <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                <span>{treatingDoctor}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-stretch sm:self-auto justify-end">
          <button
            type="button"
            onClick={onCall}
            aria-label={`Call ${patient.name}`}
            className="btn-touch flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>Call</span>
          </button>

          <button
            type="button"
            onClick={onBookVisit}
            aria-label={`Book follow-up visit for ${patient.name}`}
            className="btn-touch flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-900/40 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Calendar className="w-4 h-4 text-white" />
            <span>Book Visit</span>
          </button>

          <button
            type="button"
            onClick={onMessage}
            aria-label={`Send continuity message to ${patient.name}`}
            className="btn-touch flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
          >
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <span>Message</span>
          </button>
        </div>
      </div>

      {/* Clinical Diagnosis & Recovery Tracker Strip */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <HeartHandshake className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            <strong className="text-slate-400 uppercase tracking-wider text-[11px] font-bold">Diagnosis: </strong>
            <span className="font-semibold text-white">{diagnosis}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 font-medium">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Discharged: <strong className="text-slate-200 font-semibold">{dischargeDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
          </span>

          <span className="inline-flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80 text-teal-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span>Recovery Day {elapsedDays} of {totalDays}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default PatientBannerCard;
