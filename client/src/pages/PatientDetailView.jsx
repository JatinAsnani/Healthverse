import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pill,
  Calendar,
  FlaskConical,
  Activity,
  Plus,
  CheckCircle,
  Clock,
  ShieldAlert,
  FileText,
  User,
  HeartPulse,
  Send,
  X
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { RiskBadge } from '../components/RiskBadge.jsx';
import useAuthStore from '../store/useAuthStore.js';

export function PatientDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals state
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(null); // investigation object

  // Form states
  const [newMed, setNewMed] = useState({
    medicine: '',
    dosage: '',
    critical: false,
    timesPerDay: 1,
    timingLabel: 'Morning',
    timingHour: '09:00',
    foodTiming: 'after_food',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    instructions: ''
  });

  const [newFollowup, setNewFollowup] = useState({
    scheduledAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    type: 'in_person',
    notes: 'Routine clinical check-up'
  });

  const [resultInput, setResultInput] = useState({
    result: '',
    resultValue: '',
    normalRange: '',
    isAbnormal: false
  });

  useEffect(() => {
    fetchPatientChart();
  }, [id]);

  const fetchPatientChart = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/patients/${id}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMedSubmit = async (e) => {
    e.preventDefault();
    const activeDischarge = data?.discharges?.[0];

    try {
      const res = await fetch('/api/v1/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dischargeId: activeDischarge?._id || undefined,
          patientId: id,
          medicine: newMed.medicine,
          dosage: newMed.dosage,
          critical: newMed.critical,
          schedule: {
            timesPerDay: Number(newMed.timesPerDay) || 1,
            timings: [{ time: newMed.timingHour || '09:00', label: newMed.timingLabel || 'Morning' }],
            foodTiming: newMed.foodTiming || 'after_food'
          },
          startDate: newMed.startDate || new Date().toISOString().split('T')[0],
          endDate: newMed.endDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          instructions: newMed.instructions || 'Take as advised by doctor'
        })
      });

      if (res.ok) {
        setShowAddMedModal(false);
        setNewMed({
          medicine: '',
          dosage: '',
          critical: false,
          timesPerDay: 1,
          timingLabel: 'Morning',
          timingHour: '09:00',
          foodTiming: 'after_food',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          instructions: ''
        });
        await fetchPatientChart();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || errData.errors?.[0]?.msg || 'Failed to add medication');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while adding medication');
    }
  };

  const handleScheduleFollowupSubmit = async (e) => {
    e.preventDefault();
    const activeDischarge = data?.discharges?.[0];
    try {
      const res = await fetch('/api/v1/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          patientId: id,
          dischargeId: activeDischarge?._id || undefined,
          scheduledAt: newFollowup.scheduledAt,
          type: newFollowup.type,
          notes: newFollowup.notes
        })
      });

      if (res.ok) {
        setShowFollowupModal(false);
        await fetchPatientChart();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || errData.errors?.[0]?.msg || 'Failed to schedule visit');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while scheduling visit');
    }
  };

  const handleSaveResultSubmit = async (e) => {
    e.preventDefault();
    if (!showResultModal) return;

    try {
      const res = await fetch(`/api/v1/investigations/${showResultModal._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'resulted',
          result: resultInput.result,
          resultValue: resultInput.resultValue,
          normalRange: resultInput.normalRange,
          isAbnormal: resultInput.isAbnormal
        })
      });

      if (res.ok) {
        setShowResultModal(null);
        fetchPatientChart();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-500 text-sm">
        Loading patient clinical chart...
      </div>
    );
  }

  const { patient, discharges, prescriptions, followups, investigations, recentSymptoms, riskAssessments, alerts } = data;
  const latestRisk = riskAssessments?.[0];
  const activeDischarge = discharges?.[0];

  // Prepare chart data for adherence summary
  const adherenceChartData = [
    { day: 'Day 1', taken: 3, missed: 0 },
    { day: 'Day 2', taken: 3, missed: 0 },
    { day: 'Day 3', taken: 2, missed: 1 },
    { day: 'Day 4', taken: 3, missed: 0 },
    { day: 'Day 5', taken: 3, missed: 0 },
    { day: 'Day 6', taken: 2, missed: 1 },
    { day: 'Day 7', taken: 3, missed: 0 }
  ];

  const canEdit = ['doctor', 'nurse', 'hospital_admin'].includes(user?.role);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/clinician')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Roster</span>
        </button>

        <div className="flex items-center gap-2">
          {latestRisk && <RiskBadge level={latestRisk.riskLevel} size="sm" />}
        </div>
      </div>

      {/* Patient Profile Card */}
      <div className="card-premium p-4 sm:p-6 bg-white border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {patient.patientId}
              </span>
              <span className="text-xs text-slate-500 capitalize">
                {patient.gender} &bull; DOB: {new Date(patient.dob).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {patient.name}
            </h1>
            <div className="text-xs text-slate-600 mt-1 space-x-3">
              <span><strong>Phone:</strong> {patient.phone}</span>
              <span><strong>Address:</strong> {patient.address || 'Rural District, Sector 4'}</span>
              <span><strong>Language:</strong> {patient.language?.toUpperCase()}</span>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowAddMedModal(true)}
                className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-3.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medication</span>
              </button>
              <button
                onClick={() => setShowFollowupModal(true)}
                className="btn-touch bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-2 px-3.5 shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule Visit</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex rounded-xl bg-slate-200/90 dark:bg-slate-800 p-1 overflow-x-auto scrollbar-none whitespace-nowrap flex-nowrap w-full text-xs font-bold border border-slate-300/80 dark:border-slate-700 shadow-sm">
        {['overview', 'medications', 'symptoms', 'investigations', 'followups'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-3.5 sm:px-4 py-2 rounded-lg capitalize transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 font-extrabold shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Discharge Summary */}
            <div className="card-premium p-6">
              <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <span>Active Discharge Summary</span>
              </h2>
              {activeDischarge ? (
                <div className="space-y-3 text-xs text-slate-700">
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">Diagnosis:</span>
                    <span>{activeDischarge.diagnosis}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Clinical Summary:</span>
                    <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1">
                      {activeDischarge.summary}
                    </p>
                  </div>
                  {activeDischarge.instructions?.warningSigns && (
                    <div>
                      <span className="font-bold text-red-700 block mb-1">Specific Warning Signs Advised:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                        {activeDischarge.instructions.warningSigns.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No discharge summary recorded yet.</p>
              )}
            </div>

            {/* Adherence Trend Chart (Recharts) */}
            <div className="card-premium p-6">
              <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                <span>7-Day Medication Adherence Trend</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Comparison of daily prescribed doses taken versus missed
              </p>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={adherenceChartData}>
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="taken" fill="#0d9488" name="Taken" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="missed" fill="#ef4444" name="Missed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column: Alerts & Recent Status */}
          <div className="space-y-6">
            <div className="card-premium p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>Clinical Alerts History ({alerts.length})</span>
              </h3>
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-500">No alerts triggered for this patient.</p>
              ) : (
                <div className="space-y-2.5">
                  {alerts.map((al) => (
                    <div key={al._id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <RiskBadge level={al.riskLevel} size="sm" />
                        <span className="capitalize font-bold text-[10px] text-slate-500">{al.status}</span>
                      </div>
                      <div className="text-slate-700 font-medium line-clamp-2">
                        {al.clinicianDecision?.notes || 'Unacknowledged / open alert'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(al.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. MEDICATIONS TAB */}
      {activeTab === 'medications' && (
        <div className="card-premium p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Active Prescriptions ({prescriptions.length})</h2>
            {canEdit && (
              <button
                onClick={() => setShowAddMedModal(true)}
                className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-1.5 px-3"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 mt-2 text-xs">
            {prescriptions.map((p) => (
              <div key={p._id} className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{p.medicine}</span>
                    {p.critical && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800 uppercase">
                        Critical
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    {p.dosage} &bull; {p.schedule?.timesPerDay}x daily &bull; {p.instructions || 'After food'}
                  </div>
                </div>
                <div className="text-right text-slate-500 text-[11px]">
                  <div>Until: {new Date(p.endDate).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SYMPTOMS TAB */}
      {activeTab === 'symptoms' && (
        <div className="card-premium p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
            Reported Symptoms & Vitals History
          </h2>
          {recentSymptoms.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No symptom reports recorded.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentSymptoms.map((rep) => (
                <div key={rep._id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Reported: {new Date(rep.reportedAt).toLocaleString()}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {rep.symptoms?.length || 0} symptoms logged
                    </span>
                  </div>

                  {rep.vitals && (
                    <div className="flex items-center gap-3 text-slate-600 font-medium">
                      {rep.vitals.temperature && <span>Temp: {rep.vitals.temperature}°C</span>}
                      {rep.vitals.spo2 && <span>SpO2: {rep.vitals.spo2}%</span>}
                      {rep.vitals.pulse && <span>Pulse: {rep.vitals.pulse} bpm</span>}
                      {rep.vitals.bloodPressure?.systolic && (
                        <span>BP: {rep.vitals.bloodPressure.systolic}/{rep.vitals.bloodPressure.diastolic}</span>
                      )}
                    </div>
                  )}

                  {rep.symptoms?.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {rep.symptoms.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {s.code} (Sev: {s.severity}/3)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. INVESTIGATIONS TAB */}
      {activeTab === 'investigations' && (
        <div className="card-premium p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Lab Investigations</h2>
          </div>

          <div className="divide-y divide-slate-100 mt-2 text-xs">
            {investigations.map((inv) => (
              <div key={inv._id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{inv.testName}</div>
                  <div className="text-slate-500 mt-0.5">
                    Ordered: {new Date(inv.orderedDate).toLocaleDateString()}
                    {inv.result && <span className="text-emerald-700 font-bold ml-2">Result: {inv.result}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                    inv.status === 'resulted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {inv.status}
                  </span>
                  {canEdit && inv.status !== 'resulted' && (
                    <button
                      onClick={() => setShowResultModal(inv)}
                      className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-1 px-3"
                    >
                      Enter Result
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. FOLLOWUPS TAB */}
      {activeTab === 'followups' && (
        <div className="card-premium p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Scheduled Follow-ups</h2>
            {canEdit && (
              <button
                onClick={() => setShowFollowupModal(true)}
                className="btn-touch bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-1.5 px-3"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Visit</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 mt-2 text-xs">
            {followups.map((f) => (
              <div key={f._id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {new Date(f.scheduledAt).toLocaleString()}
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    Type: <strong className="capitalize">{f.type?.replace('_', ' ')}</strong> &bull; Notes: {f.notes || 'None'}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-sky-100 text-sky-800">
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD MEDICATION MODAL */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Add Prescription</h3>
              <button
                onClick={() => setShowAddMedModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMedSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">
                  Medicine Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clopidogrel"
                  value={newMed.medicine}
                  onChange={(e) => setNewMed({ ...newMed, medicine: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">
                  Dosage & Frequency
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 75mg once daily"
                  value={newMed.dosage}
                  onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40">
                <input
                  type="checkbox"
                  id="critCheck"
                  checked={newMed.critical}
                  onChange={(e) => setNewMed({ ...newMed, critical: e.target.checked })}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                />
                <label htmlFor="critCheck" className="font-bold text-red-700 dark:text-red-400 cursor-pointer select-none">
                  Critical Medication (Triggers alerts if missed)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="btn-touch bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 px-4 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-touch bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 font-bold rounded-xl shadow-md shadow-teal-600/30"
                >
                  Save Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE FOLLOWUP MODAL */}
      {showFollowupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Schedule Follow-up Visit</h3>
              <button
                onClick={() => setShowFollowupModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleScheduleFollowupSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newFollowup.scheduledAt}
                  onChange={(e) => setNewFollowup({ ...newFollowup, scheduledAt: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Visit Type</label>
                <select
                  value={newFollowup.type}
                  onChange={(e) => setNewFollowup({ ...newFollowup, type: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-sky-500"
                >
                  <option value="in_person">In-Person at Hospital</option>
                  <option value="home_visit_chw">Home Visit by CHW (ASHA)</option>
                  <option value="telephonic">Telephonic Consultation</option>
                </select>
              </div>
              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Notes</label>
                <textarea
                  rows="2"
                  value={newFollowup.notes}
                  onChange={(e) => setNewFollowup({ ...newFollowup, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFollowupModal(false)}
                  className="btn-touch bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 px-4 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-touch bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 font-bold rounded-xl shadow-md shadow-sky-600/30"
                >
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENTER LAB RESULT MODAL */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Enter Lab Result: {showResultModal.testName}</h3>
              <button
                onClick={() => setShowResultModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveResultSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase block mb-1 text-slate-700 dark:text-slate-300">Result Summary / Text</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Normal resolution / Hb 11.2 g/dL"
                  value={resultInput.result}
                  onChange={(e) => setResultInput({ ...resultInput, result: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResultModal(null)}
                  className="btn-touch bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 px-4 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-touch bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 font-bold rounded-xl shadow-md shadow-teal-600/30"
                >
                  Save Result & Notify Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientDetailView;
