import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Users,
  CreditCard,
  Wallet,
  Banknote,
  BarChart3,
  Settings,
  Package,
  Heart,
} from 'lucide-react';
import { SoftwareTheme } from '../../types';
import { getSoftwareTheme } from '../../utils/themeUtils';

export type NavTab =
  | 'dashboard'
  | 'invoices'
  | 'parties'
  | 'payments'
  | 'expenses'
  | 'accounts'
  | 'donations'
  | 'products'
  | 'reports'
  | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  softwareTheme?: SoftwareTheme;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  softwareTheme = 'purple',
}) => {
  const themeStyles = getSoftwareTheme(softwareTheme);

  const navItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Sales', icon: Receipt },
    { id: 'parties', label: 'Parties', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'products', label: 'Stock', icon: Package },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'expenses', label: 'Expenses', icon: Wallet },
    { id: 'accounts', label: 'Cash & Bank', icon: Banknote },
    { id: 'donations', label: 'Donations', icon: Heart },
  ];

  // Bottom bar shows the exact 7 primary tabs from the reference screenshot
  const mobileBottomItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'invoices', label: 'Sales', icon: Receipt },
    { id: 'parties', label: 'Parties', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'products', label: 'Stock', icon: Package },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Top Sticky Navigation Tabs (Desktop & Mobile) */}
      <nav className="bg-white border-b border-slate-200 sticky top-[68px] sm:top-[72px] z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 py-2.5 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-purple-100/80 text-purple-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-purple-700 stroke-[2.3]' : 'text-slate-400 stroke-[1.9]'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Fixed Bottom Navigation Bar - Exact 7 icons matching reference screenshot */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] select-none"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)',
        }}
      >
        <div className="grid grid-cols-7 items-center h-15 px-1">
          {mobileBottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-colors cursor-pointer ${
                  isActive ? 'text-purple-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.3] text-purple-700' : 'stroke-[1.8]'}`} />
                <span
                  className={`text-[10px] mt-1 tracking-tight truncate max-w-full ${
                    isActive ? 'font-bold text-purple-700' : 'font-medium text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
