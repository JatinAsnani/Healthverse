import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  ChevronRight,
  Stethoscope,
  Check,
  Send,
  X,
  Calendar,
  Video,
  MapPin,
  CheckCircle,
  XCircle,
  FileText,
  Building2,
  Home
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';
import { RiskBadge } from '../components/RiskBadge.jsx';

export function ClinicianDashboard() {
  const { t } = useTranslation();
  const { user, profile } = useAuthStore();

  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'appointments' | 'alerts'
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertCounts, setAlertCounts] = useState({ total: 0, open: 0, critical: 0 });
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Roster Filters
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  // Appointments Filters
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [appointmentScope, setAppointmentScope] = useState('all'); // 'all' | 'my'
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState('all'); // 'all' | 'scheduled' | 'completed' | 'missed'
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState('all'); // 'all' | 'in_person' | 'telephonic' | 'home_visit_chw'

  // Complete Appointment Modal
  const [completingApt, setCompletingApt] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isUpdatingApt, setIsUpdatingApt] = useState(false);

  // Resolve Alert Modal
  const [resolvingAlert, setResolvingAlert] = useState(null);
  const [actionTaken, setActionTaken] = useState('medication_adjusted');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  useEffect(() => {
    fetchData();
  }, [riskFilter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [patientsRes, alertsRes, followupsRes] = await Promise.all([
        fetch(`/api/v1/patients?riskLevel=${riskFilter}`, { credentials: 'include' }),
        fetch('/api/v1/alerts', { credentials: 'include' }),
        fetch('/api/v1/followups', { credentials: 'include' })
      ]);

      if (patientsRes.ok) {
        const pJson = await patientsRes.json();
        setPatients(pJson.data || []);
      }

      if (alertsRes.ok) {
        const aJson = await alertsRes.json();
        setAlerts(aJson.data || []);
        setAlertCounts(aJson.counts || { total: 0, open: 0, critical: 0 });
      }

      if (followupsRes && followupsRes.ok) {
        const fJson = await followupsRes.json();
        setAppointments(fJson.data || []);
      }
    } catch (err) {
      console.error('Error fetching clinician data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFollowupStatus = async (followupId, status, notes = '') => {
    try {
      setIsUpdatingApt(true);
      const res = await fetch(`/api/v1/followups/${followupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status,
          notes: notes || undefined,
          completedAt: status === 'completed' ? new Date().toISOString() : undefined
        })
      });
      if (res.ok) {
        setCompletingApt(null);
        setCompletionNotes('');
        await fetchData();
      }
    } catch (e) {
      console.error('Error updating appointment:', e);
    } finally {
      setIsUpdatingApt(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      const res = await fetch(`/api/v1/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveAlertSubmit = async (e) => {
    e.preventDefault();
    if (!resolvingAlert) return;
    setIsSubmittingDecision(true);

    try {
      const res = await fetch(`/api/v1/alerts/${resolvingAlert._id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actionTaken,
          notes: decisionNotes
        })
      });

      if (res.ok) {
        setResolvingAlert(null);
        setDecisionNotes('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const filteredPatients = patients.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.patientId?.toLowerCase().includes(q) ||
      p.phone?.includes(q)
    );
  });

  const scheduledCount = appointments.filter(a => a.status === 'scheduled').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;

  const filteredAppointments = appointments.filter(apt => {
    if (appointmentScope === 'my') {
      const isMyApt = (profile?._id && String(apt.staff?._id) === String(profile._id)) ||
                      (profile?.name && apt.staff?.name?.toLowerCase().includes(profile.name.toLowerCase()));
      if (!isMyApt) return false;
    }

    if (appointmentStatusFilter !== 'all' && apt.status !== appointmentStatusFilter) {
      return false;
    }

    if (appointmentTypeFilter !== 'all' && apt.type !== appointmentTypeFilter) {
      return false;
    }

    if (appointmentSearch) {
      const q = appointmentSearch.toLowerCase();
      const pName = apt.patient?.name?.toLowerCase() || '';
      const pId = apt.patient?.patientId?.toLowerCase() || '';
      const phone = apt.patient?.phone || '';
      const doc = apt.staff?.name?.toLowerCase() || '';
      const notes = apt.notes?.toLowerCase() || '';
      const diag = apt.discharge?.diagnosis?.toLowerCase() || '';
      if (!pName.includes(q) && !pId.includes(q) && !phone.includes(q) && !doc.includes(q) && !notes.includes(q) && !diag.includes(q)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* Sleek Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Clinician Dashboard
            </h1>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {profile?.hospital?.name || 'District Hospital'}
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 overflow-x-auto scrollbar-none whitespace-nowrap flex-nowrap w-full sm:w-auto text-xs">
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'roster' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Roster ({patients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all relative ${
              activeTab === 'appointments' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Appointments</span>
            {scheduledCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-teal-600 text-white font-tabular">
                {scheduledCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all relative ${
              activeTab === 'alerts' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>Alerts</span>
            {alertCounts.open > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse font-tabular">
                {alertCounts.open}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'appointments' ? (
        /* PATIENT APPOINTMENTS VIEW */
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="card-premium p-3 sm:p-4 border-l-4 border-l-teal-600 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Booked</p>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{appointments.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            <div className="card-premium p-4 border-l-4 border-l-sky-500 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Scheduled / Upcoming</p>
                <p className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 mt-0.5">{scheduledCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="card-premium p-4 border-l-4 border-l-emerald-600 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Completed</p>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{completedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="card-premium p-4 border-l-4 border-l-purple-500 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hospital Visits</p>
                <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
                  {appointments.filter(a => a.type === 'in_person').length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <MapPin className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="card-premium p-4 flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="relative w-full lg:w-96">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, phone, doctor or reason..."
                value={appointmentSearch}
                onChange={(e) => setAppointmentSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Doctor Scope Toggle */}
              <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setAppointmentScope('all')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                    appointmentScope === 'all'
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All Doctors
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentScope('my')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                    appointmentScope === 'my'
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  My Appointments
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={appointmentStatusFilter}
                onChange={(e) => setAppointmentStatusFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled / Upcoming</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </select>

              {/* Visit Type Filter */}
              <select
                value={appointmentTypeFilter}
                onChange={(e) => setAppointmentTypeFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Formats</option>
                <option value="in_person">In-Person at Hospital</option>
                <option value="telephonic">Telephonic Consultation</option>
                <option value="home_visit_chw">Home Visit by CHW</option>
              </select>
            </div>
          </div>

          {/* Appointments Grid */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading booked appointments...</div>
          ) : filteredAppointments.length === 0 ? (
            <div className="card-premium p-10 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">No appointments found</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                When patients book follow-ups via their timeline or through the AI Health Assistant, their appointments will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAppointments.map((apt) => {
                const isScheduled = apt.status === 'scheduled';
                const isCompleted = apt.status === 'completed';
                const isMissed = apt.status === 'missed';
                const scheduledDate = new Date(apt.scheduledAt);
                const isToday = new Date().toDateString() === scheduledDate.toDateString();

                return (
                  <div
                    key={apt._id}
                    className={`card-premium p-5 flex flex-col justify-between border-l-4 transition-all ${
                      isScheduled
                        ? isToday
                          ? 'border-l-amber-500 ring-1 ring-amber-500/20'
                          : 'border-l-teal-600'
                        : isCompleted
                        ? 'border-l-emerald-500'
                        : 'border-l-rose-500'
                    }`}
                  >
                    <div>
                      {/* Top Row: Patient Info & Status Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                              {apt.patient?.name || 'Registered Patient'}
                            </h3>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                              {apt.patient?.patientId || 'HV-PATIENT'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>Phone: <a href={`tel:${apt.patient?.phone}`} className="text-teal-600 dark:text-teal-400 font-semibold hover:underline">{apt.patient?.phone}</a></span>
                            {apt.patient?.gender && <span>&bull; {apt.patient.gender}</span>}
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                            isScheduled
                              ? isToday
                                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse'
                                : 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
                              : isCompleted
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {isToday && isScheduled ? 'TODAY • ' : ''}{apt.status}
                        </span>
                      </div>

                      {/* Appointment Time & Location Badge */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 mb-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                            <span>
                              {scheduledDate.toLocaleDateString('en-IN', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-300 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {scheduledDate.toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                            <span>Doctor: <strong className="text-slate-800 dark:text-slate-200">{apt.staff?.name || 'Dr. Ananya Sharma'}</strong></span>
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                            {apt.type === 'in_person' && (
                              <>
                                <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                <span>In-Person at Hospital</span>
                              </>
                            )}
                            {apt.type === 'telephonic' && (
                              <>
                                <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                <span>Telephonic Consultation</span>
                              </>
                            )}
                            {apt.type === 'home_visit_chw' && (
                              <>
                                <Home className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                <span>Home Visit by CHW</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Clinical Context & Notes */}
                      {(apt.discharge?.diagnosis || apt.notes) && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 mb-3 space-y-1">
                          {apt.discharge?.diagnosis && (
                            <div className="text-slate-700 dark:text-slate-300">
                              <strong>Diagnosis:</strong> {apt.discharge.diagnosis}
                            </div>
                          )}
                          {apt.notes && (
                            <div className="italic text-slate-500 dark:text-slate-400">
                              "{apt.notes}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
                      <div className="flex items-center gap-2">
                        {isScheduled && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setCompletingApt(apt);
                                setCompletionNotes(apt.notes || '');
                              }}
                              className="btn-touch bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Complete</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateFollowupStatus(apt._id, 'missed')}
                              className="btn-touch bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 text-xs font-bold py-1.5 px-2.5 rounded-lg border border-rose-200 dark:border-rose-900"
                            >
                              Missed
                            </button>
                          </>
                        )}
                        <a
                          href={`tel:${apt.patient?.phone}`}
                          className="btn-touch bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <Link
                        to={`/clinician/patients/${apt.patient?._id || apt.patient}`}
                        className="btn-touch bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-bold py-1.5 px-3 rounded-lg border border-teal-200 dark:border-teal-800/80 flex items-center gap-1"
                      >
                        <span>Clinical Chart</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'roster' ? (
        /* PATIENT ROSTER VIEW */
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="card-premium p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient by name, ID or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-600">Risk Filter:</span>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Risk Levels</option>
                <option value="critical">Critical Only</option>
                <option value="high">High Only</option>
                <option value="medium">Medium Only</option>
                <option value="low">Low Only</option>
              </select>
            </div>
          </div>

          {/* Patient Cards Grid */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading patient records...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="card-premium p-8 text-center text-slate-500 text-sm">
              No patients found matching the selected criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map((p) => {
                const riskLevel = p.latestRisk?.riskLevel || 'low';
                const openAlert = p.openAlert;

                return (
                  <div
                    key={p._id}
                    className={`card-premium p-5 flex flex-col justify-between border-l-4 ${
                      riskLevel === 'critical'
                        ? 'border-l-red-500'
                        : riskLevel === 'high'
                        ? 'border-l-orange-500'
                        : riskLevel === 'medium'
                        ? 'border-l-amber-500'
                        : 'border-l-emerald-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            {p.patientId}
                          </span>
                          <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                            {p.name}
                          </h3>
                        </div>
                        <RiskBadge level={riskLevel} size="sm" />
                      </div>

                      <div className="text-xs text-slate-600 space-y-1 mb-3">
                        <div className="font-medium text-slate-800 line-clamp-1">
                          <strong>Diagnosis:</strong> {p.activeDischarge?.diagnosis || 'Post-discharge recovery'}
                        </div>
                        <div>
                          <strong>Phone:</strong> {p.phone} &bull; <strong>Gender:</strong> <span className="capitalize">{p.gender}</span>
                        </div>
                        {p.primaryDoctor && (
                          <div className="text-[11px] text-teal-800 font-semibold">
                            Attending: {p.primaryDoctor.name}
                          </div>
                        )}
                      </div>

                      {/* Open Alert warning banner if present */}
                      {openAlert && (
                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[11px] font-semibold flex items-center justify-between mb-3">
                          <span className="flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                            <span>Open {openAlert.riskLevel} Alert</span>
                          </span>
                          <span className="capitalize text-[10px] bg-red-200 text-red-900 px-1.5 py-0.5 rounded font-bold">
                            {openAlert.status}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Updated {new Date(p.updatedAt).toLocaleDateString()}
                      </span>
                      <Link
                        to={`/clinician/patients/${p._id}`}
                        className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                      >
                        <span>Clinical Chart</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ALERT INBOX VIEW */
        <div className="space-y-4">
          <div className="card-premium p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Hospital Emergency & Clinical Alerts</h2>
                <p className="text-xs text-slate-500">
                  Critical alerts unacknowledged for 15m escalate automatically to Senior Staff / Admin.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                  {alertCounts.critical} Critical Active
                </span>
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No active clinician alerts for this hospital facility.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {alerts.map((alert) => (
                  <div key={alert._id} className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <RiskBadge level={alert.riskLevel} size="sm" />
                        <span className="text-base font-extrabold text-slate-900">
                          {alert.patient?.name} ({alert.patient?.patientId})
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          alert.status === 'open'
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : alert.status === 'acknowledged'
                            ? 'bg-amber-100 text-amber-800'
                            : alert.status === 'escalated'
                            ? 'bg-purple-100 text-purple-800 font-extrabold'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {alert.status} {alert.escalationLevel > 0 ? `(Escalation L${alert.escalationLevel})` : ''}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 font-medium">
                        <strong>Reason:</strong> {alert.assessment?.explanation || 'Threshold exceeded'}
                      </div>

                      {alert.assessment?.redFlags && (
                        <div className="text-xs text-red-700 font-semibold">
                          Red Flags: {alert.assessment.redFlags.join(', ')}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span>Reported: {new Date(alert.createdAt).toLocaleString()}</span>
                        <span>Phone: {alert.patient?.phone}</span>
                        {alert.reviewer && (
                          <span className="text-teal-700 font-medium">Reviewer: {alert.reviewer.name}</span>
                        )}
                      </div>

                      {alert.clinicianDecision && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 mt-2">
                          <strong>Clinician Decision Recorded:</strong> {alert.clinicianDecision.actionTaken.replace('_', ' ')} &bull; {alert.clinicianDecision.notes}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {alert.status !== 'resolved' && (
                        <>
                          {alert.status === 'open' || alert.status === 'escalated' ? (
                            <button
                              onClick={() => handleAcknowledgeAlert(alert._id)}
                              className="btn-touch bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 px-3.5 shadow-sm"
                            >
                              <Check className="w-4 h-4" />
                              <span>{t('clinician.acknowledgeBtn')}</span>
                            </button>
                          ) : null}

                          <button
                            onClick={() => setResolvingAlert(alert)}
                            className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-4 shadow-sm"
                          >
                            <Send className="w-4 h-4" />
                            <span>{t('clinician.resolveBtn')}</span>
                          </button>
                        </>
                      )}

                      <Link
                        to={`/clinician/patients/${alert.patient?._id}`}
                        className="btn-touch bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 border border-slate-300"
                      >
                        Chart
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPLETE APPOINTMENT MODAL */}
      {completingApt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                Complete Appointment Consultation
              </h3>
              <button
                onClick={() => setCompletingApt(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400">
              Patient: <strong className="text-slate-900 dark:text-slate-100">{completingApt.patient?.name}</strong> ({completingApt.patient?.patientId})
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateFollowupStatus(completingApt._id, 'completed', completionNotes);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Consultation & Advice Notes
                </label>
                <textarea
                  rows="3"
                  placeholder="Record outcome of consultation, medication adjustments, or next review instructions..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCompletingApt(null)}
                  className="btn-touch bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold py-2 px-4 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingApt}
                  className="btn-touch bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-5 shadow rounded-xl"
                >
                  {isUpdatingApt ? 'Saving...' : 'Mark as Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE ALERT MODAL */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                Resolve Alert & Record Decision
              </h3>
              <button
                onClick={() => setResolvingAlert(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400">
              Patient: <strong className="text-slate-900 dark:text-slate-100">{resolvingAlert.patient?.name}</strong> ({resolvingAlert.patient?.patientId}) &bull; Alert Level: <strong className="text-red-700 dark:text-red-400 uppercase">{resolvingAlert.riskLevel}</strong>
            </div>

            <form onSubmit={handleResolveAlertSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Clinical Action Taken
                </label>
                <select
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="medication_adjusted">Medication Dosage Adjusted / Resumed</option>
                  <option value="emergency_transfer">Emergency Transfer to Hospital / ICU</option>
                  <option value="in_person_visit_scheduled">In-Person Clinical Visit Scheduled</option>
                  <option value="telephonic_reassurance">Telephonic Review & Caregiver Reassurance</option>
                  <option value="admitted">Readmitted to Hospital Ward</option>
                  <option value="other">Other Clinical Intervention</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Clinician Decision & Advice Notes
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Explain instructions given to patient, caregiver or visiting CHW..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="btn-touch bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold py-2 px-4 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDecision}
                  className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-5 shadow rounded-xl"
                >
                  {isSubmittingDecision ? 'Saving...' : 'Resolve Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClinicianDashboard;
