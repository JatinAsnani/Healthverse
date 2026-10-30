import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HeartHandshake,
  UserPlus,
  Users,
  Activity,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Search,
  X
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';
import { RiskBadge, SyncStatusBadge } from '../components/RiskBadge.jsx';
import { savePatientOffline } from '../db/offlineDb.js';

export function CHWView() {
  const { t } = useTranslation();
  const { user, profile, isOnline, updatePendingCount } = useAuthStore();

  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const [newPatient, setNewPatient] = useState({
    name: '',
    phone: '',
    dob: '1985-05-15',
    gender: 'female',
    language: 'gu',
    address: 'Sector 2, Village Mandvi',
    password: '',
    medicalHistoryNotes: ''
  });

  useEffect(() => {
    fetchAssignedPatients();
  }, []);

  const fetchAssignedPatients = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/patients', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setPatients(json.data || []);
      }
    } catch (e) {
      console.warn('Network error loading assigned patients:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPatientSubmit = async (e) => {
    e?.preventDefault();
    try {
      if (isOnline) {
        const res = await fetch('/api/v1/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: newPatient.name,
            phone: newPatient.phone,
            dob: newPatient.dob,
            gender: newPatient.gender,
            language: newPatient.language,
            address: newPatient.address,
            password: newPatient.password || undefined,
            medicalHistory: [newPatient.medicalHistoryNotes || 'Field registration']
          })
        });

        if (res.ok) {
          setShowRegisterModal(false);
          fetchAssignedPatients();
        }
      } else {
        // Offline registration into IndexedDB
        await savePatientOffline({
          name: newPatient.name,
          phone: newPatient.phone,
          dob: newPatient.dob,
          gender: newPatient.gender,
          language: newPatient.language,
          address: newPatient.address,
          medicalHistory: [newPatient.medicalHistoryNotes || 'Offline field registration']
        });

        setShowRegisterModal(false);
        await updatePendingCount();
        alert('Patient registered offline into local IndexedDB. Will auto-sync when network returns.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = patients.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.patientId?.toLowerCase().includes(q) || p.phone?.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="card-premium p-6 bg-gradient-to-r from-purple-800 to-indigo-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-purple-100 uppercase">
              Community Health Worker (ASHA)
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Field Continuity & Home Monitoring
          </h1>
          <p className="text-purple-200 text-xs mt-1">
            Worker: <strong className="text-white">{profile?.name || user?.phone}</strong> &bull; Assigned to Rural Taluka Sub-Centre
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="btn-touch bg-white text-purple-900 hover:bg-purple-50 shadow-lg text-xs font-bold"
        >
          <UserPlus className="w-4 h-4 text-purple-600" />
          <span>Register Patient (Offline Ready)</span>
        </button>
      </div>

      {/* Patient Search & List */}
      <div className="space-y-4">
        <div className="card-premium p-4 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search assigned patient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-medium"
            />
          </div>
          <span className="text-xs font-bold text-slate-500">
            {filtered.length} Assigned Patients
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const riskLevel = p.latestRisk?.riskLevel || 'low';

            return (
              <div key={p._id} className="card-premium p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {p.patientId}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                        {p.name}
                      </h3>
                    </div>
                    <RiskBadge level={riskLevel} size="sm" />
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 mb-3">
                    <div><strong>Phone:</strong> {p.phone}</div>
                    <div><strong>Diagnosis:</strong> {p.activeDischarge?.diagnosis || 'Recovery'}</div>
                    <div><strong>Village/Address:</strong> {p.address || 'Rural Cluster'}</div>
                  </div>

                  {p.latestRisk && (
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 mb-3">
                      <strong>Recent Check:</strong> {p.latestRisk.explanation}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/clinician/patients/${p._id}`}
                    className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1"
                  >
                    <span>View Health Chart</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REGISTER PATIENT MODAL (OFFLINE READY) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                Register Patient ({isOnline ? 'Online' : 'Offline Mode'})
              </h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatientSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Patient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Contact Phone</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">DOB</label>
                  <input
                    type="date"
                    required
                    value={newPatient.dob}
                    onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Gender</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Password</label>
                <input
                  type="password"
                  placeholder="Create patient password (min 6 chars)"
                  value={newPatient.password || ''}
                  onChange={(e) => setNewPatient({ ...newPatient, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>



              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Village / Ward Address</label>
                <input
                  type="text"
                  placeholder="e.g. Village Gadhada, House 12"
                  value={newPatient.address}
                  onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="btn-touch bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 px-4 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-touch bg-purple-700 hover:bg-purple-800 text-white py-2 px-4 font-bold rounded-xl shadow-md shadow-purple-700/30"
                >
                  Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CHWView;
