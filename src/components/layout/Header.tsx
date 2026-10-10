import React from 'react';
import { Shield, Plus } from 'lucide-react';
import { CompanySettings, AppSettings } from '../../types';
import { getSoftwareTheme } from '../../utils/themeUtils';

interface HeaderProps {
  company: CompanySettings;
  appSettings: AppSettings;
  onNewInvoice: () => void;
  onNavigateSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  company,
  appSettings,
  onNewInvoice,
}) => {
  const hasLogo = Boolean(company.logo);
  const themeStyles = getSoftwareTheme(appSettings.softwareTheme);

  return (
    <header
      className={`bg-gradient-to-r ${themeStyles.headerGradient} text-white shadow-sm sticky top-0 z-30 transition-colors`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Brand Logo/Initials & Company Name */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {hasLogo ? (
              <img
                src={company.logo}
                alt={company.businessName}
                className="w-11 h-11 rounded-2xl object-cover bg-white/15 p-0.5 border border-white/25 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0 tracking-wide">
                {company.businessName ? company.businessName.substring(0, 2).toUpperCase() : 'MY'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-white truncate leading-snug">
                  {company.businessName || 'MY BUSINESS'}
                </h1>
                {appSettings.appLockEnabled && (
                  <span
                    className={`hidden sm:inline-flex items-center gap-1 text-[10px] ${themeStyles.headerBadgeBg} ${themeStyles.headerBadgeText} px-2 py-0.5 rounded-full font-semibold shrink-0`}
                  >
                    <Shield className="w-3 h-3" />
                    Locked
                  </span>
                )}
              </div>
              {company.tagline && (
                <p className="text-xs text-purple-100/80 truncate leading-tight mt-0.5 hidden sm:block">
                  {company.tagline}
                </p>
              )}
            </div>
          </div>

          {/* Right: Prominent White "+ Invoice" Pill Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onNewInvoice}
              className={`flex items-center gap-1.5 bg-white ${themeStyles.primaryText} hover:bg-purple-50 active:bg-purple-100 font-bold px-4 py-2 rounded-full text-xs sm:text-sm shadow-sm transition-all transform active:scale-95 cursor-pointer shrink-0`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};



