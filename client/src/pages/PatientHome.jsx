import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Pill,
  Calendar,
  FlaskConical,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  FileText,
  UserCheck,
  Sparkles,
  PhoneCall
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';
import { RiskBadge, SyncStatusBadge } from '../components/RiskBadge.jsx';
import { saveAdherenceOffline } from '../db/offlineDb.js';
import { triggerSync } from '../services/syncEngine.js';

export function PatientHome() {
  const { t } = useTranslation();
  const { user, profile, isOnline, updatePendingCount } = useAuthStore();

  const [patientData, setPatientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loggedDoses, setLoggedDoses] = useState({});
  const [actionNotice, setActionNotice] = useState(null);

  const patientId = profile?.patientId || profile?._id;

  useEffect(() => {
    fetchPatientData();
  }, [profile]);

  const fetchPatientData = async () => {
    if (!profile?._id) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/patients/${profile._id}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setPatientData(json.data);
      }
    } catch (err) {
      console.warn('Network fetch failed, loading offline state');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogAdherence = async (prescription, status) => {
    try {
      const dueAt = new Date().toISOString();

      if (isOnline) {
        // Online write
        const res = await fetch('/api/v1/adherence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            prescriptionId: prescription._id,
            patientId: profile._id,
            status,
            dueAt
          })
        });

        if (res.ok) {
          const data = await res.json();
          setLoggedDoses(prev => ({
            ...prev,
            [prescription._id]: { status, syncStatus: 'synced' }
          }));

          if (data.data?.riskAssessment) {
            setActionNotice({
              type: data.data.riskAssessment.riskLevel,
              message: data.data.riskAssessment.explanation,
              action: data.data.riskAssessment.suggestedAction
            });
          }
        }
      } else {
        // Offline write to IndexedDB
        await saveAdherenceOffline({
          prescriptionId: prescription._id,
          patientId: profile._id,
          dueAt,
          status
        });

        setLoggedDoses(prev => ({
          ...prev,
          [prescription._id]: { status, syncStatus: 'pending' }
        }));
        await updatePendingCount();
      }
    } catch (e) {
      console.error('Error logging adherence:', e);
    }
  };

  const activeDischarge = patientData?.discharges?.[0];
  const prescriptions = patientData?.prescriptions || [];
  const nextFollowup = patientData?.followups?.find(f => f.status === 'scheduled');
  const pendingTests = patientData?.investigations?.filter(i => i.status !== 'resulted') || [];
  const latestRisk = patientData?.riskAssessments?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Welcome Card */}
      <div className="card-premium p-6 bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-teal-100 uppercase tracking-wider">
                ID: {profile?.patientId || 'HV-PATIENT'}
              </span>
              {latestRisk && <RiskBadge level={latestRisk.riskLevel} size="sm" />}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('patientHome.greeting')}, {profile?.name || user?.phone}
            </h1>
            <p className="text-teal-100 text-sm mt-1 max-w-2xl">
              {activeDischarge
                ? `Recovering from ${activeDischarge.diagnosis}. Follow your daily discharge care plan below.`
                : 'Welcome to your post-discharge continuity-of-care timeline.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/symptoms/report"
              className="btn-touch bg-white text-teal-900 hover:bg-teal-50 shadow-lg text-sm font-bold"
            >
              <Activity className="w-5 h-5 text-teal-600" />
              <span>{t('patientHome.reportSymptomBtn')}</span>
            </Link>
          </div>
        </div>

        {/* Action notice if critical or high alert */}
        {latestRisk && (latestRisk.riskLevel === 'critical' || latestRisk.riskLevel === 'high') && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-600/90 text-white border border-red-400 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-200 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold uppercase tracking-wider block">Clinician Attention Needed:</span>
              <span>{latestRisk.suggestedAction}</span>
              {latestRisk.riskLevel === 'critical' && (
                <div className="mt-1 font-extrabold text-amber-200 flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4" />
                  <span>Call 108 Emergency Services Immediately</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Today's Prescriptions & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Today's Prescriptions */}
          <div className="card-premium p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{t('patientHome.todayMeds')}</h2>
                  <p className="text-xs text-slate-500">Tap below to confirm medication doses taken</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                {prescriptions.length} Active Medicines
              </span>
            </div>

            {prescriptions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                No active medications prescribed currently.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {prescriptions.map((presc) => {
                  const logged = loggedDoses[presc._id];
                  return (
                    <div key={presc._id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-base">{presc.medicine}</span>
                          {presc.critical && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-100 text-red-800 border border-red-200">
                              Critical
                            </span>
                          )}
                          {logged?.syncStatus && <SyncStatusBadge status={logged.syncStatus} />}
                        </div>
                        <div className="text-xs font-medium text-slate-600">
                          {presc.dosage} &bull; {presc.schedule?.timesPerDay}x daily ({presc.schedule?.foodTiming?.replace('_', ' ')})
                        </div>
                        {presc.critical && (
                          <p className="text-[11px] text-amber-700 font-medium">
                            {t('adherence.criticalNotice')}
                          </p>
                        )}
                      </div>

                      {/* Large Low-Literacy Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {logged ? (
                          <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                            logged.status === 'taken'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {logged.status === 'taken' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            <span>{logged.status === 'taken' ? 'Dose Taken' : 'Dose Skipped/Missed'}</span>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleLogAdherence(presc, 'taken')}
                              className="btn-touch bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 shadow-sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>{t('adherence.takeNow')}</span>
                            </button>
                            <button
                              onClick={() => handleLogAdherence(presc, 'missed')}
                              className="btn-touch bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 text-xs font-semibold px-3 py-2.5"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>{t('adherence.missDose')}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Next Follow-Up Appointment */}
          <div className="card-premium p-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">{t('patientHome.nextFollowup')}</h2>
            </div>

            {nextFollowup ? (
              <div className="mt-4 p-4 rounded-xl bg-sky-50/60 border border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-sky-900">
                    {new Date(nextFollowup.scheduledAt).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-sky-700 mt-0.5">
                    Mode: <strong className="capitalize">{nextFollowup.type?.replace('_', ' ')}</strong> &bull; Note: {nextFollowup.notes || 'Routine recovery review'}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-200 text-sky-800">
                  Scheduled
                </span>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">{t('patientHome.noUpcomingFollowup')}</p>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Tests, Schemes, Quick Actions */}
        <div className="space-y-6">
          {/* Lab Investigations Status */}
          <div className="card-premium p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Lab Investigations</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {patientData?.investigations?.length || 0} Total
              </span>
            </div>

            {patientData?.investigations?.length === 0 ? (
              <p className="text-xs text-slate-500 mt-4">{t('patientHome.noPendingTests')}</p>
            ) : (
              <div className="divide-y divide-slate-100 mt-2 text-xs">
                {patientData?.investigations?.map(inv => (
                  <div key={inv._id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{inv.testName}</div>
                      {inv.result && (
                        <div className="text-emerald-700 font-semibold mt-0.5">Result: {inv.result}</div>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      inv.status === 'resulted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inv.status === 'collected'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Support & PM-JAY Card */}
          <div className="card-premium p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <h3 className="font-bold text-base">PM-JAY Scheme Support</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Check your eligibility for up to ₹5 Lakh cashless coverage and free post-discharge medicines under Ayushman Bharat.
            </p>
            <Link
              to="/pmjay"
              className="mt-4 w-full btn-touch bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
            >
              <span>{t('pmjay.checkEligibility')}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Privacy & Caregiver Consent */}
          <div className="card-premium p-6">
            <h3 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-teal-600" />
              <span>DPDP Privacy & Caregivers</span>
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Manage family caregiver access and exercise your right to withdraw consent at any time.
            </p>
            <Link
              to="/consent"
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
            >
              <span>Manage Consents & Permissions</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientHome;
