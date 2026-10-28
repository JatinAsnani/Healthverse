import React from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SafetyBanner() {
  const { t } = useTranslation();

  return (
    <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white px-4 py-2.5 shadow-sm text-xs md:text-sm font-medium">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-200" />
          <span>
            <strong className="font-bold tracking-wide uppercase mr-1">Safety Principle:</strong>
            {t('safetyPrinciple')}
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-full text-xs text-amber-100 flex-shrink-0">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Emergency: 108</span>
        </div>
      </div>
    </div>
  );
}

export default SafetyBanner;
