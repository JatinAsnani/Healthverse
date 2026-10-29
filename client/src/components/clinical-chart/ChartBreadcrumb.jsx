import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export function ChartBreadcrumb({ patientName = 'Patient' }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Link
          to="/clinician"
          className="flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-bold transition-colors focus:outline-none focus:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Discharged Patient Roster</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-500" />
        <span className="text-slate-900 dark:text-slate-200 font-extrabold truncate max-w-[200px] sm:max-w-none">
          {patientName}
        </span>
      </div>

      <Link
        to="/clinician"
        className="hidden sm:inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <span>Back to Dashboard</span>
      </Link>
    </nav>
  );
}

export default ChartBreadcrumb;

