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
  Send
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
    setRuralCriteria(prev =>
      prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
    );
  };

  const toggleUrban = (val) => {
    setUrbanCriteria(prev =>
      prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Timeline</span>
      </button>

      {/* Header Banner */}
      <div className="card-premium p-6 bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-7 h-7 text-emerald-200" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {t('pmjay.title')}
            </h1>
            <p className="text-emerald-100 text-xs mt-1">
              Screen your household's eligibility for ₹5 Lakh cashless coverage and free 15-day post-discharge medicines.
            </p>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <div className="mt-4 p-3 rounded-xl bg-black/20 text-emerald-200 text-xs border border-emerald-500/30 flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{t('pmjay.disclaimer')}</span>
        </div>
      </div>

      {!resultData ? (
        <form onSubmit={handleScreenSubmit} className="space-y-6">
          {/* Question 1: Existing Card */}
          <div className="card-premium p-6">
            <span className="text-xs font-bold uppercase text-teal-700 tracking-wider block mb-1">
              Step 1 of 4
            </span>
            <h2 className="text-base font-extrabold text-slate-900 mb-3">
              Do you or any family member already hold an Ayushman Golden Card?
            </h2>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setHasCard(true)}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                  hasCard ? 'bg-teal-700 text-white border-teal-800 shadow-md' : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Yes, Already Have Golden Card
              </button>
              <button
                type="button"
                onClick={() => setHasCard(false)}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                  !hasCard ? 'bg-teal-700 text-white border-teal-800 shadow-md' : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                No / Not Sure
              </button>
            </div>
          </div>

          {/* Question 2: Ration Card Category */}
          <div className="card-premium p-6">
            <span className="text-xs font-bold uppercase text-teal-700 tracking-wider block mb-1">
              Step 2 of 4
            </span>
            <h2 className="text-base font-extrabold text-slate-900 mb-3">
              What type of Ration Card does your family possess?
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { val: 'bpl_antyodaya', label: 'Antyodaya Anna Yojana (AAY / Yellow Card)' },
                { val: 'state_bpl', label: 'State BPL / Priority Household (PHH)' },
                { val: 'apl', label: 'APL Card (Above Poverty Line)' },
                { val: 'none', label: 'No Ration Card currently' }
              ].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRationCardType(val)}
                  className={`p-3.5 rounded-xl border text-left font-bold transition-all ${
                    rationCardType === val
                      ? 'border-teal-700 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Question 3: Rural SECC Criteria */}
          <div className="card-premium p-6">
            <span className="text-xs font-bold uppercase text-teal-700 tracking-wider block mb-1">
              Step 3 of 4
            </span>
            <h2 className="text-base font-extrabold text-slate-900 mb-1">
              Rural Deprivation & Household Criteria
            </h2>
            <p className="text-xs text-slate-500 mb-3">Select all conditions that apply to your living situation:</p>

            <div className="space-y-2 text-xs">
              {[
                { val: 'one_room_kuccha', label: 'Only one room with kuccha walls and roof' },
                { val: 'female_headed', label: 'Female headed household with no adult male member (16-59)' },
                { val: 'sc_st', label: 'Belongs to Scheduled Caste (SC) or Scheduled Tribe (ST)' },
                { val: 'landless_manual', label: 'Landless household deriving income mainly from manual casual labor' }
              ].map(({ val, label }) => {
                const checked = ruralCriteria.includes(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleRural(val)}
                    className={`w-full p-3 rounded-xl border text-left font-semibold flex items-center justify-between transition-colors ${
                      checked ? 'border-teal-600 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      checked ? 'bg-teal-700 border-teal-700 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {checked && '✓'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question 4: Disqualifying exclusions */}
          <div className="card-premium p-6">
            <span className="text-xs font-bold uppercase text-teal-700 tracking-wider block mb-1">
              Step 4 of 4
            </span>
            <h2 className="text-base font-extrabold text-slate-900 mb-3">
              Government Employment & Tax Status
            </h2>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="govCheck"
                checked={isGovEmployee}
                onChange={(e) => setIsGovEmployee(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600"
              />
              <label htmlFor="govCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Household contains a regular government employee, motorized 4-wheeler, or income tax payer.
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isEvaluating}
            className="w-full btn-touch bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-lg shadow-teal-700/20"
          >
            {isEvaluating ? 'Evaluating PM-JAY Rules...' : 'Submit & Check Eligibility Guidance'}
            <Send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        /* Result Screen */
        <div className="card-premium p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                resultData.result === 'likely_eligible'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : resultData.result === 'needs_verification'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {resultData.result.replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-500">Evaluated on {new Date(resultData.checkedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900">
              {resultData.result === 'likely_eligible'
                ? 'Your Household is Likely Eligible for PM-JAY Scheme Benefits'
                : resultData.result === 'needs_verification'
                ? 'Verification Needed with Panchayat / Taluka Office'
                : 'Not Eligible Under Standard PM-JAY Inclusion Criteria'}
            </h2>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <strong className="block text-xs uppercase font-bold text-slate-500">Reasons for Assessment:</strong>
              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                {resultData.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 space-y-2">
              <strong className="block text-xs uppercase font-bold text-teal-800">Recommended Next Steps:</strong>
              <ul className="list-disc list-inside text-xs text-teal-900 space-y-1">
                {resultData.nextSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>

            {/* Official Disclaimer */}
            <div className="p-3.5 rounded-xl bg-slate-100 text-slate-600 text-xs border border-slate-200 flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 text-slate-500 mt-0.5" />
              <span>{resultData.disclaimer}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex gap-3">
            <button
              onClick={() => setResultData(null)}
              className="btn-touch bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              Re-take Questionnaire
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-touch bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold"
            >
              Return to Timeline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PmjayScreeningPage;
