import { SoftwareTheme } from '../types';

export interface SoftwareThemeStyles {
  headerGradient: string;
  headerBorder: string;
  headerBadgeBg: string;
  headerBadgeText: string;
  navActiveBg: string;
  navActiveText: string;
  navActiveIcon: string;
  primaryButton: string;
  primaryButtonHover: string;
  primaryText: string;
  primaryBg: string;
  primaryBorder: string;
  cardBorderHover: string;
  accentBadge: string;
}

export const SOFTWARE_THEMES: Record<SoftwareTheme, { name: string; styles: SoftwareThemeStyles }> = {
  purple: {
    name: 'Premium Purple',
    styles: {
      headerGradient: 'from-purple-900 via-purple-800 to-indigo-950',
      headerBorder: 'border-purple-600/30',
      headerBadgeBg: 'bg-white/15',
      headerBadgeText: 'text-purple-100',
      navActiveBg: 'bg-purple-100/80',
      navActiveText: 'text-purple-900',
      navActiveIcon: 'text-purple-700',
      primaryButton: 'bg-purple-700',
      primaryButtonHover: 'hover:bg-purple-800 active:bg-purple-900',
      primaryText: 'text-purple-700',
      primaryBg: 'bg-purple-50',
      primaryBorder: 'border-purple-200',
      cardBorderHover: 'hover:border-purple-300',
      accentBadge: 'bg-purple-100 text-purple-800',
    },
  },
  blue: {
    name: 'Modern Blue',
    styles: {
      headerGradient: 'from-blue-900 via-blue-800 to-slate-900',
      headerBorder: 'border-blue-600/30',
      headerBadgeBg: 'bg-white/15',
      headerBadgeText: 'text-blue-100',
      navActiveBg: 'bg-blue-100/80',
      navActiveText: 'text-blue-900',
      navActiveIcon: 'text-blue-700',
      primaryButton: 'bg-blue-600',
      primaryButtonHover: 'hover:bg-blue-700 active:bg-blue-800',
      primaryText: 'text-blue-600',
      primaryBg: 'bg-blue-50',
      primaryBorder: 'border-blue-200',
      cardBorderHover: 'hover:border-blue-300',
      accentBadge: 'bg-blue-100 text-blue-800',
    },
  },
  green: {
    name: 'Classic Green',
    styles: {
      headerGradient: 'from-emerald-900 via-emerald-800 to-teal-950',
      headerBorder: 'border-emerald-600/30',
      headerBadgeBg: 'bg-white/15',
      headerBadgeText: 'text-emerald-100',
      navActiveBg: 'bg-emerald-100/80',
      navActiveText: 'text-emerald-900',
      navActiveIcon: 'text-emerald-700',
      primaryButton: 'bg-emerald-600',
      primaryButtonHover: 'hover:bg-emerald-700 active:bg-emerald-800',
      primaryText: 'text-emerald-700',
      primaryBg: 'bg-emerald-50',
      primaryBorder: 'border-emerald-200',
      cardBorderHover: 'hover:border-emerald-300',
      accentBadge: 'bg-emerald-100 text-emerald-800',
    },
  },
  black: {
    name: 'Professional Black',
    styles: {
      headerGradient: 'from-neutral-950 via-neutral-900 to-stone-900',
      headerBorder: 'border-neutral-700',
      headerBadgeBg: 'bg-white/15',
      headerBadgeText: 'text-neutral-100',
      navActiveBg: 'bg-neutral-200',
      navActiveText: 'text-neutral-950',
      navActiveIcon: 'text-neutral-900',
      primaryButton: 'bg-neutral-900',
      primaryButtonHover: 'hover:bg-neutral-800 active:bg-black',
      primaryText: 'text-neutral-900',
      primaryBg: 'bg-neutral-100',
      primaryBorder: 'border-neutral-300',
      cardBorderHover: 'hover:border-neutral-400',
      accentBadge: 'bg-neutral-200 text-neutral-900',
    },
  },
  minimal: {
    name: 'Light Minimal',
    styles: {
      headerGradient: 'from-slate-800 via-slate-700 to-slate-900',
      headerBorder: 'border-slate-600/40',
      headerBadgeBg: 'bg-white/15',
      headerBadgeText: 'text-slate-100',
      navActiveBg: 'bg-slate-200/90',
      navActiveText: 'text-slate-900',
      navActiveIcon: 'text-slate-700',
      primaryButton: 'bg-slate-800',
      primaryButtonHover: 'hover:bg-slate-900 active:bg-slate-950',
      primaryText: 'text-slate-800',
      primaryBg: 'bg-slate-100',
      primaryBorder: 'border-slate-300',
      cardBorderHover: 'hover:border-slate-400',
      accentBadge: 'bg-slate-200 text-slate-800',
    },
  },
};

export function getSoftwareTheme(themeKey?: SoftwareTheme): SoftwareThemeStyles {
  return SOFTWARE_THEMES[themeKey || 'purple']?.styles || SOFTWARE_THEMES.purple.styles;
}
