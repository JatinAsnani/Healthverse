import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  ArrowLeft,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Plus,
  X
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';

export function ConsentManagementPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();

  const [consents, setConsents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  const [newConsent, setNewConsent] = useState({
    purpose: 'caregiver_access',
    caregiverPhone: ''
  });

  const patientId = profile?._id || user?.id;

  useEffect(() => {
    fetchConsents();
  }, [patientId]);

  const fetchConsents = async () => {
    if (!patientId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/consent/patient/${patientId}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setConsents(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeConsent = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this consent? Data access for this purpose will cease immediately.')) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/consent/${id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'Withdrawn by patient under DPDP Act 2023' })
      });

      if (res.ok) {
        fetchConsents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGrantConsentSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          patientId,
          purpose: newConsent.purpose
        })
      });

      if (res.ok) {
        setShowGrantModal(false);
        fetchConsents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Timeline</span>
      </button>

      {/* Header Banner */}
      <div className="card-premium p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center flex-shrink-0">
            <Lock className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Privacy, Consent & Data Governance
            </h1>
            <p className="text-slate-300 text-xs mt-1">
              Aligned with India's Digital Personal Data Protection (DPDP) Act 2023. You have full transparency and the right to withdraw consent at any time.
            </p>
          </div>
        </div>

        {/* DPDP Principles pill grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-[11px] font-semibold text-teal-200">
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">1. Specific Purpose</div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">2. Right to Withdraw</div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">3. Data Minimisation</div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">4. Immutable Audit Trail</div>
        </div>
      </div>

      {/* Consents List */}
      <div className="card-premium p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Active & Historical Consents</h2>
            <p className="text-xs text-slate-500">Consents are never deleted; revoked items are kept for legal accountability.</p>
          </div>
          <button
            onClick={() => setShowGrantModal(true)}
            className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-3.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Grant New Consent</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-slate-500 text-sm">Loading consent records...</div>
        ) : consents.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">No consent records found.</div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {consents.map((c) => {
              const isRevoked = Boolean(c.revokedAt);
              return (
                <div key={c._id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 capitalize">
                        {c.purpose.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        isRevoked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isRevoked ? 'Revoked' : 'Active'}
                      </span>
                    </div>

                    <div className="text-slate-500 mt-1 space-x-2">
                      <span>Granted: {new Date(c.grantedAt).toLocaleDateString()}</span>
                      <span>&bull; Notice: {c.noticeVersion || 'DPDP-2023-v1.0'}</span>
                      {isRevoked && (
                        <span className="text-rose-700 font-semibold">
                          &bull; Revoked on {new Date(c.revokedAt).toLocaleDateString()}: {c.revokedReason}
                        </span>
                      )}
                    </div>
                  </div>

                  {!isRevoked && (
                    <button
                      onClick={() => handleRevokeConsent(c._id)}
                      className="btn-touch bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold py-1.5 px-3"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Revoke Consent</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grant Consent Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Grant Purpose Consent</h3>
              <button
                onClick={() => setShowGrantModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGrantConsentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Select Specific Purpose</label>
                <select
                  value={newConsent.purpose}
                  onChange={(e) => setNewConsent({ ...newConsent, purpose: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="caregiver_access">Caregiver Health Timeline & Alert Access</option>
                  <option value="chw_home_monitoring">CHW (ASHA) Home Visit Monitoring</option>
                  <option value="telephonic_followup">Telephonic Recovery Check-ins</option>
                  <option value="emergency_sms_alerts">Emergency Red-Flag SMS to Caregivers</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 leading-relaxed">
                By clicking grant, you authorize HealthVerse to share only the necessary minimum health information required for this designated care purpose.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="btn-touch bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 px-4 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-touch bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 font-bold rounded-xl shadow-md shadow-teal-600/30"
                >
                  Confirm & Grant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConsentManagementPage;
