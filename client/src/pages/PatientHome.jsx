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
  UserCheck,
  PhoneCall,
  Phone,
  Building2,
  X,
  Clock,
  Plus,
  RefreshCw,
  Sunrise,
  Moon,
  Volume2,
  VolumeX,
  Flame,
  Check
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';
import { RiskBadge } from '../components/RiskBadge.jsx';
import { saveAdherenceOffline } from '../db/offlineDb.js';
import { fetchWithTimeout } from '../utils/api.js';

export function PatientHome() {
  const { t, i18n } = useTranslation();
  const { user, profile, isOnline, updatePendingCount } = useAuthStore();

  const [patientData, setPatientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loggedDoses, setLoggedDoses] = useState({});
  const [isSpeakingId, setIsSpeakingId] = useState(null);
  const [activeBucket, setActiveBucket] = useState('all');

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

    const cacheKey = `healthverse_patient_${profile._id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setPatientData(JSON.parse(cached));
        setIsLoading(false);
      } catch (e) {}
    } else {
      setIsLoading(true);
    }

    try {
      const res = await fetchWithTimeout(`/api/v1/patients/${profile._id}`, {
        credentials: 'include',
        timeout: 3500
      });
      if (res.ok) {
        const json = await res.json();
        setPatientData(json.data);
        localStorage.setItem(cacheKey, JSON.stringify(json.data));
      }
    } catch (err) {
      console.warn('Network fetch timed out or offline, keeping cached state');
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
        await saveAdherenceOffline({
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
        message: `Booked with ${data.data?.staff?.name || 'Doctor'}!`
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

  const takenCount = Object.values(loggedDoses).filter((d) => d.status === 'taken').length;
  const totalMeds = prescriptions.length;
  const adherencePercent = totalMeds > 0 ? Math.round((takenCount / totalMeds) * 100) : 100;
  const nextFollowup = scheduledFollowups[0];

  const filteredMeds = prescriptions.filter((p) => {
    if (activeBucket === 'morning') {
      return !p.schedule?.timeOfDay || p.schedule?.timeOfDay === 'morning' || p.schedule?.timesPerDay >= 2;
    }
    if (activeBucket === 'night') {
      return p.schedule?.timeOfDay === 'night' || p.schedule?.timesPerDay >= 1;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
      {/* Sleek, Clean Patient Header */}
      <div className="card-clean p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200/60 dark:border-teal-800/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-black text-sm">
            {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'PT'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {profile?.name || user?.phone}
              </h1>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                {profile?.patientId || 'HV-P100'}
              </span>
              {latestRisk && <RiskBadge level={latestRisk.riskLevel} size="sm" />}
            </div>
            {activeDischarge?.diagnosis && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeDischarge.diagnosis}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/symptoms/report"
            className="btn-touch min-h-[38px] px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <Activity className="w-4 h-4" />
            <span>Check Symptoms</span>
          </Link>
          <a
            href="tel:108"
            className="btn-touch min-h-[38px] px-3 py-1.5 border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1"
            title="Emergency Hotline"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>108</span>
          </a>
        </div>
      </div>

      {/* Critical Alert Bar (Only shown when alert is active) */}
      {latestRisk && (latestRisk.riskLevel === 'critical' || latestRisk.riskLevel === 'high') && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 text-red-900 dark:text-red-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 truncate">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="font-semibold truncate">{latestRisk.suggestedAction}</span>
          </div>
          <a
            href="tel:108"
            className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-[11px] flex-shrink-0"
          >
            Call 108
          </a>
        </div>
      )}

      {/* Minimalist Micro-Metrics Strip (No Bulky Cards) */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="card-clean p-3 flex items-center gap-2.5">
          <div className="icon-box bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <Pill className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="label-micro">Adherence</div>
            <div className="value-data truncate">
              {adherencePercent}% <span className="text-[11px] font-normal text-slate-400">({takenCount}/{totalMeds})</span>
            </div>
          </div>
        </div>

        <div className="card-clean p-3 flex items-center gap-2.5">
          <div className="icon-box bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="label-micro">Streak</div>
            <div className="value-data truncate">7 Days</div>
          </div>
        </div>

        <div className="card-clean p-3 flex items-center gap-2.5">
          <div className="icon-box bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="label-micro">Next Visit</div>
            <div className="value-data truncate">
              {nextFollowup
                ? new Date(nextFollowup.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : 'None'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Compact Meds + Next Visit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (2 Cols): Clean Medication List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card-clean p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Prescriptions</h2>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded font-tabular">
                  {prescriptions.length}
                </span>
              </div>

              {/* Minimal Schedule Filter Chips */}
              <div className="pill-track">
                <button
                  onClick={() => setActiveBucket('all')}
                  className={`pill-item ${
                    activeBucket === 'all'
                      ? 'pill-item-active'
                      : ''
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveBucket('morning')}
                  className={`pill-item flex items-center gap-1 ${
                    activeBucket === 'morning'
                      ? 'pill-item-active !text-amber-600 dark:!text-amber-300'
                      : ''
                  }`}
                >
                  <Sunrise className="w-3 h-3" />
                  <span>AM</span>
                </button>
                <button
                  onClick={() => setActiveBucket('night')}
                  className={`pill-item flex items-center gap-1 ${
                    activeBucket === 'night'
                      ? 'pill-item-active !text-indigo-600 dark:!text-indigo-300'
                      : ''
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  <span>PM</span>
                </button>
              </div>
            </div>

            {/* Clean Meds Rows */}
            {filteredMeds.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active medications in this time slot.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMeds.map((presc) => {
                  const logged = loggedDoses[presc._id];
                  const isCritical = presc.critical;
                  const speakText = `${presc.medicine}, ${presc.dosage}. ${presc.schedule?.timesPerDay} times daily.`;

                  return (
                    <div
                      key={presc._id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`icon-box ${
                          isCritical
                            ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                            : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'
                        }`}>
                          <Pill className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                              {presc.medicine}
                            </span>
                            {isCritical && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                                Critical
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSpeakMedication(speakText, presc._id)}
                              className="p-0.5 text-slate-400 hover:text-teal-600 transition-colors"
                              title="Listen"
                            >
                              {isSpeakingId === presc._id ? (
                                <VolumeX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {presc.dosage} &bull; {presc.schedule?.timesPerDay}x daily &bull; {presc.schedule?.foodTiming?.replace('_', ' ')}
                          </div>
                        </div>
                      </div>

                      {/* Compact Action */}
                      <div className="flex-shrink-0">
                        {logged ? (
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 ${
                              logged.status === 'taken'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {logged.status === 'taken' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            <span>{logged.status === 'taken' ? 'Taken' : 'Skipped'}</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleLogAdherence(presc, 'taken')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              <span>Take</span>
                            </button>
                            <button
                              onClick={() => handleLogAdherence(presc, 'missed')}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded-lg font-medium text-[11px] transition-colors"
                            >
                              Skip
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next Followup Consultation Card */}
          <div className="card-clean p-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>Doctor Consultation</span>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Book</span>
              </button>
            </div>

            {scheduledFollowups.length > 0 ? (
              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {nextFollowup.staff?.name || 'Attending Clinician'}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(nextFollowup.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                      at {new Date(nextFollowup.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="capitalize">&bull; {nextFollowup.type?.replace('_', ' ')}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  Confirmed
                </span>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                No upcoming visits scheduled.
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Tests & Clean Shortcuts */}
        <div className="space-y-4">
          {/* Lab Tests */}
          <div className="card-clean p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100">
              <div className="flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-purple-600" />
                <span>Lab Tests</span>
              </div>
              <span className="text-[10px] text-slate-400 font-tabular font-normal">
                {patientData?.investigations?.length || 0}
              </span>
            </div>

            {patientData?.investigations?.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No pending lab tests.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs mt-1">
                {patientData?.investigations?.map((inv) => (
                  <div key={inv._id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">{inv.testName}</div>
                      {inv.result && (
                        <div className="text-[10px] text-emerald-600 font-medium">Result: {inv.result}</div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clean PM-JAY & Consent Quick Links (No Giant Bulky Cards) */}
          <div className="card-clean p-3 space-y-1 text-xs">
            <Link
              to="/pmjay"
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="icon-box bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Ayushman Bharat (PM-JAY)</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <Link
              to="/consent"
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="icon-box bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Privacy & Caregiver Access</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Appointment Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Schedule Consultation</h3>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Doctor</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  {doctors.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.name} &bull; {doc.specialization}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-tabular"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Time</label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingType('in_person')}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      bookingType === 'in_person'
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>In-Person</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingType('telephonic')}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      bookingType === 'telephonic'
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Phone</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1"
                >
                  {isSubmittingBooking ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  <span>Confirm</span>
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
