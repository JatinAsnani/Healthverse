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
  PhoneCall,
  Phone,
  Building2,
  X,
  Clock,
  Plus,
  RefreshCw,
  Sunrise,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  TrendingUp,
  Flame,
  Check
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';
import { RiskBadge, SyncStatusBadge } from '../components/RiskBadge.jsx';
import { saveAdherenceOffline } from '../db/offlineDb.js';
import { triggerSync } from '../services/syncEngine.js';

export function PatientHome() {
  const { t, i18n } = useTranslation();
  const { user, profile, isOnline, updatePendingCount } = useAuthStore();

  const [patientData, setPatientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loggedDoses, setLoggedDoses] = useState({});
  const [isSpeakingId, setIsSpeakingId] = useState(null);

  // Appointment Booking State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [doctors, setDoctors] = useState([
    { _id: '6ae19a8e4da8f1c7c8827f9a', name: 'Dr. Ananya Sharma', specialization: 'Internal Medicine' },
    { _id: '6ae19a8e4da8f1c7c8827f9e', name: 'Dr. Vikram Mehta', specialization: 'General Surgery & Critical Care' }
  ]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('6ae19a8e4da8f1c7c8827f9a');
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [bookingTime, setBookingTime] = useState('10:30 AM');
  const [bookingType, setBookingType] = useState('in_person');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingNotice, setBookingNotice] = useState(null);

  useEffect(() => {
    fetchPatientData();

    // Fetch active doctors from backend
    fetch('/api/v1/followups/doctors')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.length > 0) {
          setDoctors(json.data);
          setSelectedDoctorId(json.data[0]._id);
        }
      })
      .catch((err) => console.warn('Could not fetch doctors:', err));
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
        const res = await fetch('/api/v1/adherence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            prescriptionId: prescription._id,
            patientId: profile._id,
            dueAt,
            takenAt: status === 'taken' ? new Date().toISOString() : null,
            status,
            notes: `Logged via Patient Portal (${status})`
          })
        });

        if (res.ok) {
          setLoggedDoses((prev) => ({
            ...prev,
            [prescription._id]: { status, syncStatus: 'synced' }
          }));
        }
      } else {
        const localRecord = await saveAdherenceOffline({
          prescriptionId: prescription._id,
          patientId: profile._id,
          dueAt,
          status,
          notes: 'Offline log from Patient Portal'
        });

        setLoggedDoses((prev) => ({
          ...prev,
          [prescription._id]: { status, syncStatus: 'pending' }
        }));
        await updatePendingCount();
      }
    } catch (err) {
      console.error('Error logging adherence:', err);
    }
  };

  // Audio Read-Aloud for Medication Instructions (Supports vernacular Hindi / Gujarati / English)
  const handleSpeakMedication = (text, id) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeakingId === id) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = i18n.language;
    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-IN';
    utterance.rate = 0.9;

    utterance.onend = () => setIsSpeakingId(null);
    utterance.onerror = () => setIsSpeakingId(null);

    setIsSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingNotice(null);
    setIsSubmittingBooking(true);

    try {
      let timeStr = bookingTime;
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        const [timePart, meridiem] = timeStr.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        timeStr = `${String(hours).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}:00`;
      }
      const isoDate = new Date(`${bookingDate}T${timeStr}`).toISOString();

      const res = await fetch('/api/v1/followups/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          patientId: profile?._id,
          scheduledAt: isoDate,
          type: bookingType,
          notes: bookingNotes.trim() || 'Booked via Patient Portal'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.errors?.[0]?.msg || 'Failed to schedule appointment');
      }

      setBookingNotice({
        type: 'success',
        message: `Appointment scheduled successfully with ${data.data?.staff?.name || 'Doctor'}!`
      });
      setIsBookingModalOpen(false);
      setBookingNotes('');
      await fetchPatientData();
    } catch (err) {
      setBookingNotice({
        type: 'error',
        message: err.message || 'Error booking appointment'
      });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const activeDischarge = patientData?.discharges?.[0];
  const prescriptions = patientData?.prescriptions || [];
  const scheduledFollowups = patientData?.followups?.filter((f) => f.status === 'scheduled') || [];
  const latestRisk = patientData?.riskAssessments?.[0];

  // Adherence Calculations
  const takenCount = Object.values(loggedDoses).filter((d) => d.status === 'taken').length;
  const totalMeds = prescriptions.length;
  const adherencePercent = totalMeds > 0 ? Math.round((takenCount / totalMeds) * 100) : 100;

  // Next Upcoming Followup
  const nextFollowup = scheduledFollowups[0];

  // Group Prescriptions into Time-of-Day Buckets
  const morningMeds = prescriptions.filter(
    (p) => !p.schedule?.timeOfDay || p.schedule?.timeOfDay === 'morning' || p.schedule?.timesPerDay >= 2
  );
  const afternoonMeds = prescriptions.filter(
    (p) => p.schedule?.timeOfDay === 'afternoon' || p.schedule?.timesPerDay >= 3
  );
  const nightMeds = prescriptions.filter(
    (p) => p.schedule?.timeOfDay === 'night' || p.schedule?.timesPerDay >= 1
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Welcome Hero Card */}
      <div className="card-premium p-6 bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-teal-100 uppercase tracking-wider font-tabular">
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
              className="btn-touch bg-white text-teal-900 hover:bg-teal-50 shadow-lg text-xs font-bold"
            >
              <Activity className="w-4 h-4 text-teal-600" />
              <span>{t('patientHome.reportSymptomBtn')}</span>
            </Link>
          </div>
        </div>

        {/* Action notice if critical or high alert */}
        {latestRisk && (latestRisk.riskLevel === 'critical' || latestRisk.riskLevel === 'high') && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-600/95 text-white border border-red-400/80 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-200 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold uppercase tracking-wider block">Clinician Attention Needed:</span>
              <span>{latestRisk.suggestedAction}</span>
              {latestRisk.riskLevel === 'critical' && (
                <div className="mt-1.5 font-extrabold text-amber-200 flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4" />
                  <span>Call 108 Emergency Services Immediately</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recovery Adherence & Next Visit Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Daily Adherence Progress */}
        <div className="card-premium p-4 flex items-center gap-3.5">
          <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="18"
                className="text-slate-200 dark:text-slate-700"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="24"
                cy="24"
                r="18"
                className="text-teal-600 dark:text-teal-400 transition-all duration-500"
                strokeWidth="4"
                strokeDasharray={113}
                strokeDashoffset={113 - (113 * adherencePercent) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-[11px] font-black text-slate-800 dark:text-slate-100 font-tabular">
              {adherencePercent}%
            </span>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Today's Adherence</div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-tabular">
              {takenCount} of {totalMeds} Doses Taken
            </div>
          </div>
        </div>

        {/* Adherence Streak */}
        <div className="card-premium p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Recovery Streak</div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1 font-tabular">
              <span>7 Days Active</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded-full">
                On Track
              </span>
            </div>
          </div>
        </div>

        {/* Next Visit Countdown */}
        <div className="card-premium p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Next Doctor Visit</div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {nextFollowup
                ? new Date(nextFollowup.scheduledAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                  })
                : 'None Scheduled'}
            </div>
          </div>
        </div>

        {/* Emergency Assistance */}
        <div className="card-premium p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Emergency Services</div>
            <a href="tel:108" className="text-sm font-extrabold text-rose-600 dark:text-rose-400 hover:underline">
              Dial 108 (Free)
            </a>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Today's Prescriptions Grouped by Time of Day */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-premium p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {t('patientHome.todayMeds')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Organized by schedule. Tap buttons to record doses.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-tabular">
                {prescriptions.length} Active Medicines
              </span>
            </div>

            {prescriptions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                No active medications prescribed currently.
              </div>
            ) : (
              <div className="space-y-6 mt-4">
                {/* Morning Bucket */}
                {morningMeds.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2.5">
                      <Sunrise className="w-4 h-4" />
                      <span>Morning Schedule</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                      {morningMeds.map((presc) => {
                        const logged = loggedDoses[presc._id];
                        const speakText = `${presc.medicine}. Dosage: ${presc.dosage}. Schedule: ${presc.schedule?.timesPerDay} times daily. ${presc.instructions || ''}`;

                        return (
                          <div
                            key={`morning-${presc._id}`}
                            className="p-4 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                                  {presc.medicine}
                                </span>
                                {presc.critical && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                                    Critical
                                  </span>
                                )}
                                {logged?.syncStatus && <SyncStatusBadge status={logged.syncStatus} />}

                                {/* Listen Button */}
                                <button
                                  type="button"
                                  onClick={() => handleSpeakMedication(speakText, presc._id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Listen to medicine instructions"
                                  aria-label="Listen to medicine instructions"
                                >
                                  {isSpeakingId === presc._id ? (
                                    <VolumeX className="w-4 h-4 text-rose-500 animate-pulse" />
                                  ) : (
                                    <Volume2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>

                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                {presc.dosage} &bull; {presc.schedule?.timesPerDay}x daily ({presc.schedule?.foodTiming?.replace('_', ' ')})
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {logged ? (
                                <div
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                                    logged.status === 'taken'
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                  }`}
                                >
                                  {logged.status === 'taken' ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-rose-600" />
                                  )}
                                  <span>{logged.status === 'taken' ? 'Dose Taken' : 'Dose Skipped'}</span>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleLogAdherence(presc, 'taken')}
                                    className="btn-touch min-h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Take</span>
                                  </button>
                                  <button
                                    onClick={() => handleLogAdherence(presc, 'missed')}
                                    className="btn-touch min-h-[42px] bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-700 dark:text-slate-300 hover:text-rose-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    <span>Skip</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Afternoon & Night Buckets if available */}
                {nightMeds.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2.5">
                      <Moon className="w-4 h-4" />
                      <span>Evening / Night Schedule</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                      {nightMeds.map((presc) => {
                        const logged = loggedDoses[`night-${presc._id}`] || loggedDoses[presc._id];
                        const speakText = `${presc.medicine}. Night dose: ${presc.dosage}. ${presc.instructions || ''}`;

                        return (
                          <div
                            key={`night-${presc._id}`}
                            className="p-4 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                                  {presc.medicine}
                                </span>
                                {presc.critical && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                                    Critical
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleSpeakMedication(speakText, `night-${presc._id}`)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Listen to medicine instructions"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                {presc.dosage} &bull; After Dinner / Bedtime
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {logged ? (
                                <div className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  <span>Dose Taken</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleLogAdherence(presc, 'taken')}
                                  className="btn-touch min-h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Take</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Next Follow-Up Appointment Hero Card */}
          <div className="card-premium p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {t('patientHome.nextFollowup')}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Doctor consultations & continuity check-ups
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="btn-touch min-h-[40px] bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Book Appointment</span>
              </button>
            </div>

            {bookingNotice && (
              <div
                className={`mt-3 p-3 rounded-xl text-xs flex items-center justify-between ${
                  bookingNotice.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <span>{bookingNotice.message}</span>
                <button onClick={() => setBookingNotice(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {scheduledFollowups.length > 0 ? (
              <div className="space-y-3 mt-4">
                {scheduledFollowups.map((f) => (
                  <div
                    key={f._id}
                    className="p-4 rounded-2xl bg-sky-50/70 dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          {f.staff?.name || 'Assigned Clinician'}
                        </span>
                        {f.staff?.specialization && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                            {f.staff.specialization}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-sky-900 dark:text-sky-200 flex items-center gap-2 font-tabular">
                        <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>
                          {new Date(f.scheduledAt).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}{' '}
                          at{' '}
                          {new Date(f.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        {f.type === 'in_person' ? (
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>
                          Mode: <strong className="capitalize text-slate-700 dark:text-slate-200">{f.type?.replace('_', ' ')}</strong>
                        </span>
                      </div>
                    </div>
                    <span className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-900/80 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-700">
                      Scheduled
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('patientHome.noUpcomingFollowup')}</p>
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Doctor Visit</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Tests, Schemes, Quick Actions */}
        <div className="space-y-6">
          {/* Lab Investigations Status */}
          <div className="card-premium p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Lab Investigations</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 font-tabular">
                {patientData?.investigations?.length || 0} Total
              </span>
            </div>

            {patientData?.investigations?.length === 0 ? (
              <p className="text-xs text-slate-500 mt-4">{t('patientHome.noPendingTests')}</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2 text-xs">
                {patientData?.investigations?.map((inv) => (
                  <div key={inv._id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{inv.testName}</div>
                      {inv.result && (
                        <div className="text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                          Result: {inv.result}
                        </div>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inv.status === 'resulted'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : inv.status === 'collected'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PM-JAY Scheme Support Card */}
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
              className="mt-4 w-full btn-touch min-h-[42px] bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
            >
              <span>{t('pmjay.checkEligibility')}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Privacy & Caregiver Consent */}
          <div className="card-premium p-6">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>DPDP Privacy & Caregivers</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              Manage family caregiver access and exercise your statutory right to withdraw consent at any time.
            </p>
            <Link
              to="/consent"
              className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Consents & Permissions</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Appointment Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Calendar className="w-5 h-5 text-teal-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Book Doctor Appointment</h3>
                  <p className="text-xs text-teal-100/90">Select doctor, date, and consultation format</p>
                </div>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 text-xs">
                  Select Doctor:
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-teal-500"
                  required
                >
                  {doctors.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.name} &bull; {doc.specialization}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 text-xs">
                    Appointment Date:
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 font-tabular"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 text-xs">
                    Time Slot:
                  </label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 font-tabular"
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 text-xs">
                  Consultation Mode:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      bookingType === 'in_person'
                        ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bookingType"
                      value="in_person"
                      checked={bookingType === 'in_person'}
                      onChange={() => setBookingType('in_person')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Hospital Visit</span>
                  </label>
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      bookingType === 'telephonic'
                        ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bookingType"
                      value="telephonic"
                      checked={bookingType === 'telephonic'}
                      onChange={() => setBookingType('telephonic')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Telephonic Call</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 text-xs">
                  Reason for Visit / Symptoms (Optional):
                </label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="e.g. Routine wound recovery follow-up, BP review, medication discussion..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingBooking ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirm & Schedule</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientHome;
