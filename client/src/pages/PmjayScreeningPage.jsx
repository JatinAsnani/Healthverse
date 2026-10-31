import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  FileText,
  Building,
  Info,
  Send,
  Check
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';

export function PmjayScreeningPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();

  const [hasCard, setHasCard] = useState(false);
  const [rationCardType, setRationCardType] = useState('state_bpl');
  const [ruralCriteria, setRuralCriteria] = useState(['one_room_kuccha']);
  const [urbanCriteria, setUrbanCriteria] = useState([]);
  const [isLowIncome, setIsLowIncome] = useState(true);
  const [isGovEmployee, setIsGovEmployee] = useState(false);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [resultData, setResultData] = useState(null);

  const toggleRural = (val) => {
    setRuralCriteria((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    );
  };

  const handleScreenSubmit = async (e) => {
    e.preventDefault();
    setIsEvaluating(true);

    const responses = {
      hasAyushmanCard: hasCard,
      rationCardType,
      ruralDeprivationCriteria: ruralCriteria,
      urbanOccupationCriteria: urbanCriteria,
      isIncomeUnderThreshold: isLowIncome,
      isGovernmentEmployeeOrTaxpayer: isGovEmployee
    };

    try {
      const patientId = profile?._id || user?.id;
      const res = await fetch('/api/v1/eligibility/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          patientId,
          responses
        })
      });

      if (res.ok) {
        const json = await res.json();
        setResultData(json.data);
      } else {
        throw new Error('Screening evaluation failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
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
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {t('pmjay.title', 'Ayushman Bharat (PM-JAY) Eligibility')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Screen your household for ₹5 Lakh cashless hospital care and 15-day post-discharge medicines.
            </p>
          </div>
        </div>
      </div>

      {!resultData ? (
        <form onSubmit={handleScreenSubmit} className="space-y-3.5">
          {/* Question 1: Existing Card */}
          <div className="card-clean p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                1. Do you already hold an Ayushman Card?
              </h2>
              <span className="label-micro">Step 1 of 4</span>
            </div>

            <div className="pill-track">
              <button
                type="button"
                onClick={() => setHasCard(true)}
                className={`pill-item flex-1 py-1.5 text-center ${
                  hasCard ? 'pill-item-active' : ''
                }`}
              >
                Yes, Already Have Card
              </button>
              <button
                type="button"
                onClick={() => setHasCard(false)}
                className={`pill-item flex-1 py-1.5 text-center ${
                  !hasCard ? 'pill-item-active' : ''
                }`}
              >
                No / Not Sure
              </button>
            </div>
          </div>

          {/* Question 2: Ration Card Category */}
          <div className="card-clean p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                2. What Ration Card does your family hold?
              </h2>
              <span className="label-micro">Step 2 of 4</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { val: 'bpl_antyodaya', label: 'Antyodaya (AAY / Yellow)' },
                { val: 'state_bpl', label: 'BPL / Priority Household (PHH)' },
                { val: 'apl', label: 'APL Card' },
                { val: 'none', label: 'No Ration Card' }
              ].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRationCardType(val)}
                  className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                    rationCardType === val
                      ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 font-bold'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Question 3: Deprivation Criteria */}
          <div className="card-clean p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                3. Rural Deprivation & Household Conditions
              </h2>
              <span className="label-micro">Step 3 of 4</span>
            </div>

            <div className="space-y-1.5 text-xs">
              {[
                { val: 'one_room_kuccha', label: 'Only one room with kuccha walls and roof' },
                { val: 'female_headed', label: 'Female-headed household with no adult male member' },
                { val: 'sc_st', label: 'Belongs to Scheduled Caste (SC) or Scheduled Tribe (ST)' },
                { val: 'landless_manual', label: 'Landless household deriving income from casual labor' }
              ].map(({ val, label }) => {
                const checked = ruralCriteria.includes(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleRural(val)}
                    className={`w-full p-2.5 rounded-xl border text-left font-medium flex items-center justify-between transition-colors ${
                      checked
                        ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 font-semibold'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] ${
                        checked
                          ? 'bg-teal-600 border-teal-600 text-white font-bold'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question 4: Disqualifying exclusions */}
          <div className="card-clean p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                4. Exclusions (Tax & Government Service)
              </h2>
              <span className="label-micro">Step 4 of 4</span>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                id="govCheck"
                checked={isGovEmployee}
                onChange={(e) => setIsGovEmployee(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 border-slate-300 dark:border-slate-700 focus:ring-teal-500"
              />
              <span>
                Household includes a regular government employee, motorized 4-wheeler, or income tax payer.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isEvaluating}
            className="w-full btn-touch min-h-[42px] bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
          >
            {isEvaluating ? 'Checking Guidelines...' : 'Evaluate Eligibility'}
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        /* Result Screen */
        <div className="card-clean p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                resultData.result === 'likely_eligible'
                  ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : resultData.result === 'needs_verification'
                  ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {resultData.result.replace('_', ' ')}
            </span>
            <span className="text-[11px] text-slate-400 font-tabular">
              Checked on {new Date(resultData.checkedAt).toLocaleDateString()}
            </span>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {resultData.result === 'likely_eligible'
                ? 'Your Household is Likely Eligible for PM-JAY Benefits'
                : resultData.result === 'needs_verification'
                ? 'Verification Needed with Taluka / Panchayat Office'
                : 'Not Eligible Under Standard PM-JAY Criteria'}
            </h2>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <strong className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Basis for Assessment:
              </strong>
              <ul className="list-disc list-inside space-y-1">
                {resultData.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-900/60 space-y-1.5 text-xs text-teal-900 dark:text-teal-200">
              <strong className="block text-[11px] uppercase tracking-wider text-teal-800 dark:text-teal-300 font-bold">
                Recommended Actions:
              </strong>
              <ul className="list-disc list-inside space-y-1">
                {resultData.nextSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>

            {/* Official Disclaimer */}
            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] border border-slate-200/80 dark:border-slate-700 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
              <span>{resultData.disclaimer}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <button
              onClick={() => setResultData(null)}
              className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              Re-check
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PmjayScreeningPage;
