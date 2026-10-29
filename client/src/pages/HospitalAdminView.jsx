import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Building,
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  Lock,
  X,
  Search,
  Filter
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';
import { RiskBadge } from '../components/RiskBadge.jsx';

export function HospitalAdminView() {
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'staff' | 'audits'
  const [analytics, setAnalytics] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [audits, setAudits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state for DPDP Audit Logs
  const [searchAudit, setSearchAudit] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');

  // Search & Filter state for Staff Management
  const [searchStaff, setSearchStaff] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('all');

  // New staff modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'doctor',
    specialization: 'General Medicine',
    password: 'password123'
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      const [analyticsRes, staffRes, auditsRes] = await Promise.all([
        fetch('/api/v1/admin/analytics', { credentials: 'include' }),
        fetch('/api/v1/admin/staff', { credentials: 'include' }),
        fetch('/api/v1/admin/audits', { credentials: 'include' })
      ]);

      if (analyticsRes.ok) {
        const aJson = await analyticsRes.json();
        setAnalytics(aJson.analytics);
      }
      if (staffRes.ok) {
        const sJson = await staffRes.json();
        setStaffList(sJson.data || []);
      }
      if (auditsRes.ok) {
        const auJson = await auditsRes.json();
        setAudits(auJson.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newStaff)
      });

      if (res.ok) {
        setShowAddStaffModal(false);
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered DPDP Audit Logs
  const filteredAudits = audits.filter((a) => {
    if (auditActionFilter !== 'all' && a.action !== auditActionFilter) {
      return false;
    }
    if (!searchAudit.trim()) return true;

    const q = searchAudit.toLowerCase().trim();
    const patientName = a.patient?.name ? a.patient.name.toLowerCase() : '';
    const patientId = a.patient?.patientId ? a.patient.patientId.toLowerCase() : '';
    const details = a.details ? a.details.toLowerCase() : '';
    const resource = a.resourceType ? a.resourceType.toLowerCase() : '';
    const action = a.action ? a.action.toLowerCase() : '';
    const userRole = a.user?.role ? a.user.role.toLowerCase() : '';
    const userPhone = a.user?.phone ? a.user.phone.toLowerCase() : '';

    return (
      patientName.includes(q) ||
      patientId.includes(q) ||
      details.includes(q) ||
      resource.includes(q) ||
      action.includes(q) ||
      userRole.includes(q) ||
      userPhone.includes(q)
    );
  });

  // Filtered Staff Members
  const filteredStaff = staffList.filter((st) => {
    if (staffRoleFilter !== 'all' && st.role !== staffRoleFilter) {
      return false;
    }
    if (!searchStaff.trim()) return true;

    const q = searchStaff.toLowerCase().trim();
    const name = st.name ? st.name.toLowerCase() : '';
    const phone = st.phone ? st.phone.toLowerCase() : '';
    const role = st.role ? st.role.toLowerCase() : '';
    const spec = st.specialization ? st.specialization.toLowerCase() : '';

    return name.includes(q) || phone.includes(q) || role.includes(q) || spec.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Building className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            <span>Hospital Administration & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Continuity-of-Care Health Oversight & DPDP Act 2023 Compliance
          </p>
        </div>

        {/* High-Contrast Dark-Mode Aware Tab Switcher */}
        <div className="flex rounded-xl bg-slate-200/90 dark:bg-slate-800 p-1 overflow-x-auto scrollbar-none whitespace-nowrap flex-nowrap w-full sm:w-auto text-xs font-bold border border-slate-300/80 dark:border-slate-700 shadow-sm">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow font-extrabold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Clinical Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'staff'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow font-extrabold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Management ({staffList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'audits'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow font-extrabold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>DPDP Audit Logs ({audits.length})</span>
          </button>
        </div>
      </div>

      {/* CLINICAL ANALYTICS TAB */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Metrics Top Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="card-premium p-4">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Adherence Rate</span>
              <div className="text-2xl font-black text-teal-700 dark:text-teal-400 mt-1">{analytics.adherenceRate}%</div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2">
                <div
                  className="bg-teal-600 h-1.5 rounded-full"
                  style={{ width: `${analytics.adherenceRate}%` }}
                ></div>
              </div>
            </div>

            <div className="card-premium p-4">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Open Alerts</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{analytics.openAlerts}</div>
              <span className="text-[10px] text-red-500 dark:text-red-400 font-semibold">{analytics.criticalAlerts} Critical</span>
            </div>

            <div className="card-premium p-4">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Monitored Patients</span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{analytics.totalPatients}</div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{analytics.totalDischarges} Discharges</span>
            </div>

            <div className="card-premium p-4">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Missed Follow-ups</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{analytics.missedFollowups}</div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Requires CHW outreach</span>
            </div>

            <div className="card-premium p-4">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Offline Sync Health</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {analytics.syncHealth?.totalRecordsUploaded || 0}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {analytics.syncHealth?.totalConflicts || 0} Conflicts Merged
              </span>
            </div>
          </div>

          {/* Readmission Risk & Alerts Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-premium p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Readmission Risk Stratification</span>
              </h3>
              <div className="space-y-3">
                {Object.entries(analytics.readmissionRiskCounts || {}).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between text-xs">
                    <RiskBadge level={level} size="sm" />
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">{count} Patients</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-premium p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Alerts by Severity Level</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60">
                  <span className="font-bold text-red-800 dark:text-red-300 uppercase">Critical (15m Escalation)</span>
                  <span className="font-black text-red-900 dark:text-red-200 text-sm">{analytics.alertsByLevel?.critical || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60">
                  <span className="font-bold text-orange-800 dark:text-orange-300 uppercase">High (60m Escalation)</span>
                  <span className="font-black text-orange-900 dark:text-orange-200 text-sm">{analytics.alertsByLevel?.high || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                  <span className="font-bold text-amber-800 dark:text-amber-300 uppercase">Medium Advisory</span>
                  <span className="font-black text-amber-900 dark:text-amber-200 text-sm">{analytics.alertsByLevel?.medium || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAFF MANAGEMENT TAB */}
      {activeTab === 'staff' && (
        <div className="card-premium p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Hospital Staff & Clinicians Roster</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Doctors, Nurses, CHWs and Administrators</p>
            </div>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-3.5 shadow-sm inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff</span>
            </button>
          </div>

          {/* Search & Role Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search staff by name, role, phone, or specialization..."
                value={searchStaff}
                onChange={(e) => setSearchStaff(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
              {searchStaff && (
                <button
                  onClick={() => setSearchStaff('')}
                  className="absolute right-2.5 top-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">Role:</span>
              {['all', 'doctor', 'nurse', 'chw', 'hospital_admin'].map((r) => (
                <button
                  key={r}
                  onClick={() => setStaffRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all shrink-0 ${
                    staffRoleFilter === r
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {r === 'hospital_admin' ? 'Admin' : r}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Indicator */}
          {(searchStaff || staffRoleFilter !== 'all') && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>
                Showing <strong className="text-teal-700 dark:text-teal-300 font-bold">{filteredStaff.length}</strong> of {staffList.length} staff members
                {searchStaff && <span> for &ldquo;{searchStaff}&rdquo;</span>}
              </span>
              <button
                onClick={() => {
                  setSearchStaff('');
                  setStaffRoleFilter('all');
                }}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-bold"
              >
                Reset filters
              </button>
            </div>
          )}

          {/* Staff List */}
          {filteredStaff.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No staff members found</p>
              <p className="text-xs mt-1">Try adjusting your search query or role filter</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredStaff.map((st) => (
                <div key={st._id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{st.name}</div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Phone: <span className="font-mono text-slate-700 dark:text-slate-300">{st.phone}</span> &bull; Spec: {st.specialization || 'General Care'}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {st.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DPDP AUDIT LOGS TAB */}
      {activeTab === 'audits' && (
        <div className="card-premium p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>India DPDP Act 2023 Health Data Audit Trail</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable chronological log of every read and write of protected patient health information
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg shrink-0">
              {audits.length} Events Logged
            </span>
          </div>

          {/* Search & Action Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search patient name, ID, user, action, or details..."
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
              {searchAudit && (
                <button
                  onClick={() => setSearchAudit('')}
                  className="absolute right-2.5 top-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">Action:</span>
              {['all', 'read', 'create', 'update', 'revoke_consent'].map((act) => (
                <button
                  key={act}
                  onClick={() => setAuditActionFilter(act)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all shrink-0 ${
                    auditActionFilter === act
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {act === 'revoke_consent' ? 'Revoke' : act}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Indicator */}
          {(searchAudit || auditActionFilter !== 'all') && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>
                Showing <strong className="text-teal-700 dark:text-teal-300 font-bold">{filteredAudits.length}</strong> of {audits.length} events
                {searchAudit && <span> for &ldquo;{searchAudit}&rdquo;</span>}
              </span>
              <button
                onClick={() => {
                  setSearchAudit('');
                  setAuditActionFilter('all');
                }}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-bold"
              >
                Reset filters
              </button>
            </div>
          )}

          {/* Audit Logs List */}
          {filteredAudits.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <Lock className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No audit logs found</p>
              <p className="text-xs mt-1">Try searching a different patient name or resetting filters</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredAudits.map((a) => (
                <div key={a._id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                        a.action === 'read' ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800' :
                        a.action === 'create' ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                        a.action === 'update' ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                        a.action === 'revoke_consent' ? 'bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800' :
                        'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                      }`}>
                        {a.action}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{a.resourceType}</span>
                      {a.patient && (
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          for <strong className="text-slate-900 dark:text-slate-100 font-bold">{a.patient.name}</strong>
                          {a.patient.patientId && <span className="font-mono text-slate-400 ml-1">({a.patient.patientId})</span>}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-1">{a.details}</p>
                  </div>
                  <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                    <div>{new Date(a.timestamp).toLocaleTimeString()}</div>
                    <div>{new Date(a.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Add Staff Member</h3>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddStaffSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 dark:placeholder-slate-500"
                  placeholder="e.g. Dr. Harish Shah"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Phone</label>
                  <input
                    type="tel"
                    required
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 dark:placeholder-slate-500"
                    placeholder="9876500000"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Role</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="chw">CHW (ASHA)</option>
                    <option value="hospital_admin">Hospital Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Specialization / Department</label>
                <input
                  type="text"
                  value={newStaff.specialization}
                  onChange={(e) => setNewStaff({ ...newStaff, specialization: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 dark:placeholder-slate-500"
                  placeholder="e.g. General Surgery"
                />
              </div>
              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="btn-touch bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 px-4 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-touch bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 font-bold rounded-xl shadow-md shadow-teal-600/30"
                >
                  Register Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HospitalAdminView;
