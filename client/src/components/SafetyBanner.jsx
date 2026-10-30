import React, { useState } from 'react';
import { ShieldAlert, AlertCircle, PhoneCall, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SafetyBanner() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white shadow-sm border-b border-amber-600/30">
      <div className="max-w-7xl mx-auto px-4 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
          {/* Main Statement */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-amber-500/40 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-200" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs text-amber-200 block sm:inline sm:mr-2">
                Safety Principle:
              </span>
              <span className="hidden sm:inline text-amber-50 font-medium">
                {t('safetyPrinciple')}
              </span>
              <span className="inline sm:hidden text-amber-50 font-medium truncate">
                AI decision-support only. Clinician review required.
              </span>
            </div>
          </div>

          {/* Right Action / 108 Hotline & Mobile Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="tel:108"
              className="flex items-center gap-1.5 bg-black/25 hover:bg-black/40 px-2.5 py-1 rounded-full text-[11px] sm:text-xs text-amber-100 font-bold transition-colors"
              title="Emergency Ambulance Hotline"
            >
              <PhoneCall className="w-3.5 h-3.5 text-amber-300" />
              <span>Call 108</span>
            </a>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="sm:hidden p-1 rounded-md hover:bg-white/10 text-amber-200"
              aria-label={isExpanded ? 'Collapse safety principle' : 'Expand safety principle'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Expanded Drawer */}
        {isExpanded && (
          <div className="sm:hidden mt-2 pt-2 border-t border-amber-500/30 text-xs text-amber-100 leading-relaxed animate-in fade-in duration-150">
            {t('safetyPrinciple')}
          </div>
        )}
      </div>
    </div>
  );
}

export default SafetyBanner;
