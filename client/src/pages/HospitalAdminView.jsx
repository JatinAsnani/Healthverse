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
  X
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building className="w-7 h-7 text-teal-600" />
            <span>Hospital Administration & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuity-of-Care Health Oversight & DPDP Act 2023 Compliance
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'analytics' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Clinical Analytics
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'staff' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff Management ({staffList.length})
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'audits' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            DPDP Audit Logs ({audits.length})
          </button>
        </div>
      </div>

      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Metrics Top Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card-premium p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Adherence Rate</span>
              <div className="text-2xl font-black text-teal-700 mt-1">{analytics.adherenceRate}%</div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                <div
                  className="bg-teal-600 h-1.5 rounded-full"
                  style={{ width: `${analytics.adherenceRate}%` }}
                ></div>
              </div>
            </div>

            <div className="card-premium p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Open Alerts</span>
              <div className="text-2xl font-black text-rose-600 mt-1">{analytics.openAlerts}</div>
              <span className="text-[10px] text-red-500 font-semibold">{analytics.criticalAlerts} Critical</span>
            </div>

            <div className="card-premium p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Monitored Patients</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{analytics.totalPatients}</div>
              <span className="text-[10px] text-slate-500 font-medium">{analytics.totalDischarges} Discharges</span>
            </div>

            <div className="card-premium p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Missed Follow-ups</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{analytics.missedFollowups}</div>
              <span className="text-[10px] text-slate-500">Requires CHW outreach</span>
            </div>

            <div className="card-premium p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Offline Sync Health</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {analytics.syncHealth?.totalRecordsUploaded || 0}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                {analytics.syncHealth?.totalConflicts || 0} Conflicts Merged
              </span>
            </div>
          </div>

          {/* Readmission Risk & Alerts Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-premium p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-600" />
                <span>Readmission Risk Stratification</span>
              </h3>
              <div className="space-y-3">
                {Object.entries(analytics.readmissionRiskCounts || {}).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between text-xs">
                    <RiskBadge level={level} size="sm" />
                    <span className="font-extrabold text-slate-800 text-sm">{count} Patients</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-premium p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <span>Alerts by Severity Level</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-red-50 border border-red-200">
                  <span className="font-bold text-red-800 uppercase">Critical (15m Escalation)</span>
                  <span className="font-black text-red-900 text-sm">{analytics.alertsByLevel?.critical || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-orange-50 border border-orange-200">
                  <span className="font-bold text-orange-800 uppercase">High (60m Escalation)</span>
                  <span className="font-black text-orange-900 text-sm">{analytics.alertsByLevel?.high || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="font-bold text-amber-800 uppercase">Medium Advisory</span>
                  <span className="font-black text-amber-900 text-sm">{analytics.alertsByLevel?.medium || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAFF MANAGEMENT TAB */}
      {activeTab === 'staff' && (
        <div className="card-premium p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Hospital Staff & Clinicians Roster</h2>
              <p className="text-xs text-slate-500">Doctors, Nurses, CHWs and Administrators</p>
            </div>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-3.5 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {staffList.map((st) => (
              <div key={st._id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{st.name}</div>
                  <div className="text-slate-500 mt-0.5">
                    Phone: {st.phone} &bull; Spec: {st.specialization || 'General Care'}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-teal-50 text-teal-800 border border-teal-200">
                  {st.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DPDP AUDIT LOGS TAB */}
      {activeTab === 'audits' && (
        <div className="card-premium p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-teal-600" />
                <span>India DPDP Act 2023 Health Data Audit Trail</span>
              </h2>
              <p className="text-xs text-slate-500">
                Immutable chronological log of every read and write of protected patient health information
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600">{audits.length} Events Logged</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {audits.map((a) => (
              <div key={a._id} className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      a.action === 'read' ? 'bg-sky-100 text-sky-800' :
                      a.action === 'create' ? 'bg-emerald-100 text-emerald-800' :
                      a.action === 'update' ? 'bg-amber-100 text-amber-800' :
                      a.action === 'revoke_consent' ? 'bg-red-100 text-red-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {a.action}
                    </span>
                    <span className="font-bold text-slate-800">{a.resourceType}</span>
                    {a.patient && <span className="text-slate-500">for {a.patient.name}</span>}
                  </div>
                  <p className="text-slate-600 mt-1">{a.details}</p>
                </div>
                <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                  <div>{new Date(a.timestamp).toLocaleTimeString()}</div>
                  <div>{new Date(a.timestamp).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-slate-900">Add Staff Member</h3>
              <button onClick={() => setShowAddStaffModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddStaffSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  placeholder="e.g. Dr. Harish Shah"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold uppercase block mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    placeholder="9876500000"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase block mb-1">Role</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="chw">CHW (ASHA)</option>
                    <option value="hospital_admin">Hospital Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold uppercase block mb-1">Specialization / Department</label>
                <input
                  type="text"
                  value={newStaff.specialization}
                  onChange={(e) => setNewStaff({ ...newStaff, specialization: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  placeholder="e.g. General Surgery"
                />
              </div>
              <div>
                <label className="font-bold uppercase block mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="btn-touch bg-slate-100 py-1.5 px-3 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-touch bg-teal-600 text-white py-1.5 px-4 font-bold shadow"
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
