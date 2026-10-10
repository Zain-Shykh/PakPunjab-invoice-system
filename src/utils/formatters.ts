import { InvoiceSettings } from '../types';

/**
 * Format currency amount with commas, e.g. "Rs. 126,050" or "126,050"
 */
export function formatCurrency(
  amount: number,
  currencySymbol: string = 'Rs.',
  priceFormat: InvoiceSettings['priceFormat'] = 'symbol_space'
): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Format with thousands separator
  const formattedNumber = new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(absAmount);

  let result = '';
  switch (priceFormat) {
    case 'symbol_tight':
      result = `${currencySymbol}${formattedNumber}`;
      break;
    case 'no_symbol':
      result = formattedNumber;
      break;
    case 'symbol_space':
    default:
      result = `${currencySymbol} ${formattedNumber}`;
      break;
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Format date to standard DD-MM-YYYY
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Get yesterday's date in YYYY-MM-DD
 */
export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get start of current week date in YYYY-MM-DD
 */
export function getStartOfWeekString(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

/**
 * Get start of current month date in YYYY-MM-DD
 */
export function getStartOfMonthString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Get today's date in YYYY-MM-DD for form inputs
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current time in HH:mm
 */
export function getCurrentTimeString(): string {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Generate unique IDs
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}
