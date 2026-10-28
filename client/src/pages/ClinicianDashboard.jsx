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
  X
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';
import { RiskBadge } from '../components/RiskBadge.jsx';

export function ClinicianDashboard() {
  const { t } = useTranslation();
  const { user, profile } = useAuthStore();

  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'alerts'
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertCounts, setAlertCounts] = useState({ total: 0, open: 0, critical: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

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
      const [patientsRes, alertsRes] = await Promise.all([
        fetch(`/api/v1/patients?riskLevel=${riskFilter}`, { credentials: 'include' }),
        fetch('/api/v1/alerts', { credentials: 'include' })
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
    } catch (err) {
      console.error('Error fetching clinician data:', err);
    } finally {
      setIsLoading(false);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Stethoscope className="w-7 h-7 text-teal-600" />
            <span>Clinician Care Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hospital Facility: <strong className="text-slate-700">{profile?.hospital?.name || 'District Sub-Divisional Hospital'}</strong>
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex rounded-xl bg-slate-200/80 p-1">
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'roster' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('clinician.rosterTitle')} ({patients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${
              activeTab === 'alerts' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>{t('clinician.alertInboxTitle')}</span>
            {alertCounts.open > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-red-600 text-white animate-pulse">
                {alertCounts.open}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'roster' ? (
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
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white"
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

      {/* RESOLVE ALERT MODAL */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-lg text-slate-900">
                Resolve Alert & Record Decision
              </h3>
              <button
                onClick={() => setResolvingAlert(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Patient: <strong className="text-slate-900">{resolvingAlert.patient?.name}</strong> ({resolvingAlert.patient?.patientId}) &bull; Alert Level: <strong className="text-red-700 uppercase">{resolvingAlert.riskLevel}</strong>
            </div>

            <form onSubmit={handleResolveAlertSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Clinical Action Taken
                </label>
                <select
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
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
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Clinician Decision & Advice Notes
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Explain instructions given to patient, caregiver or visiting CHW..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="btn-touch bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDecision}
                  className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-5 shadow"
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
