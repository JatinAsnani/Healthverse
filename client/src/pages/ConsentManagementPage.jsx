import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Lock,
  ArrowLeft,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  FileCheck,
} from "lucide-react";
import useAuthStore from "../store/useAuthStore.js";

export function ConsentManagementPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();

  const [consents, setConsents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);

  const [newConsent, setNewConsent] = useState({
    purpose: "caregiver_access",
    caregiverPhone: "",
  });

  const patientId = profile?._id || user?.id;

  useEffect(() => {
    fetchConsents();
  }, [patientId]);

  const fetchConsents = async () => {
    if (!patientId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/consent/patient/${patientId}`, {
        credentials: "include",
      });
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
    if (
      !window.confirm(
        "Are you sure you want to revoke this consent? Data access for this purpose will cease immediately.",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/consent/${id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reason: "Withdrawn by patient under DPDP Act 2023",
        }),
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
      const res = await fetch("/api/v1/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId,
          purpose: newConsent.purpose,
        }),
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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Timeline</span>
      </button>

      {/* Sleek Minimalist Micro-Header */}
      <div className="card-clean p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="icon-box !w-10 !h-10 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Privacy, Consent & Data Governance
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                DPDP Act 2023
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Transparent patient data sharing. You retain full control and the
              right to revoke consent anytime.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowGrantModal(true)}
          className="btn-touch min-h-[36px] bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Grant Consent</span>
        </button>
      </div>

      {/* DPDP Micro-Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
        <div className="card-clean p-2.5 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
          <span>Specific Purpose</span>
        </div>
        <div className="card-clean p-2.5 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
          <span>Right to Withdraw</span>
        </div>
        <div className="card-clean p-2.5 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
          <span>Data Minimisation</span>
        </div>
        <div className="card-clean p-2.5 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
          <span>Audit Logged</span>
        </div>
      </div>

      {/* Consents List */}
      <div className="card-clean p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Active & Historical Consents
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Records are preserved for legal accountability under health
              continuity regulations.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 font-tabular">
            {consents.length} {consents.length === 1 ? "record" : "records"}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 skeleton-shimmer rounded-xl" />
            ))}
          </div>
        ) : consents.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-500">No consent records found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {consents.map((c) => {
              const isRevoked = Boolean(c.revokedAt);
              return (
                <div
                  key={c._id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`icon-box ${
                        isRevoked
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          : "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400"
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">
                          {c.purpose.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase ${
                            isRevoked
                              ? "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                              : "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          {isRevoked ? "Revoked" : "Active"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 space-x-2">
                        <span>
                          Granted: {new Date(c.grantedAt).toLocaleDateString()}
                        </span>
                        <span>
                          &bull; Notice: {c.noticeVersion || "DPDP-2023-v1.0"}
                        </span>
                        {isRevoked && (
                          <span className="text-rose-600 dark:text-rose-400 font-medium">
                            &bull; Withdrawn:{" "}
                            {new Date(c.revokedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isRevoked && (
                    <button
                      onClick={() => handleRevokeConsent(c._id)}
                      className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors self-start sm:self-auto"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Revoke</span>
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="card-clean max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Grant Purpose Consent
              </h3>
              <button
                onClick={() => setShowGrantModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={handleGrantConsentSubmit}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Select Specific Purpose
                </label>
                <select
                  value={newConsent.purpose}
                  onChange={(e) =>
                    setNewConsent({ ...newConsent, purpose: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium text-xs"
                >
                  <option value="caregiver_access">
                    Caregiver Health Timeline & Alert Access
                  </option>
                  <option value="chw_home_monitoring">
                    CHW (ASHA) Home Visit Monitoring
                  </option>
                  <option value="telephonic_followup">
                    Telephonic Recovery Check-ins
                  </option>
                  <option value="emergency_sms_alerts">
                    Emergency Red-Flag SMS to Caregivers
                  </option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                By granting, you authorize HealthVerse to share only the minimum
                required information for this designated care purpose.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
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
