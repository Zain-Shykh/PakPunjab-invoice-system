import React, { useState } from 'react';
import { Building2, Phone, MapPin, Receipt, Sparkles, Image, Check } from 'lucide-react';
import { CompanySettings, InvoiceSettings, InvoiceTheme } from '../../types';

interface FirstTimeSetupProps {
  initialCompany: CompanySettings;
  initialInvoiceSettings: InvoiceSettings;
  onComplete: (company: CompanySettings, invoiceSettings: InvoiceSettings) => void;
}

export const FirstTimeSetup: React.FC<FirstTimeSetupProps> = ({
  initialCompany,
  initialInvoiceSettings,
  onComplete,
}) => {
  const [businessName, setBusinessName] = useState(initialCompany.businessName || 'MY BUSINESS');
  const [phone, setPhone] = useState(initialCompany.phone || '0300-1234567');
  const [address, setAddress] = useState(initialCompany.address || '');
  const [city, setCity] = useState(initialCompany.city || 'Lahore');
  const [currency, setCurrency] = useState(initialCompany.currency || 'Rs.');
  const [invoicePrefix, setInvoicePrefix] = useState(initialCompany.invoicePrefix || 'INV-');
  const [startingInvoiceNo, setStartingInvoiceNo] = useState(
    initialCompany.startingInvoiceNo || 1001
  );
  const [theme, setTheme] = useState<InvoiceTheme>(
    initialInvoiceSettings.theme || 'purple'
  );
  const [logo, setLogo] = useState(initialCompany.logo || '');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Please choose an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      alert('Business name is required.');
      return;
    }

    const updatedCompany: CompanySettings = {
      ...initialCompany,
      businessName: businessName.trim(),
      phone: phone.trim(),
      whatsapp: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      currency: currency.trim() || 'Rs.',
      invoicePrefix: invoicePrefix.trim() || 'INV-',
      startingInvoiceNo: Number(startingInvoiceNo) || 1001,
      logo,
    };

    const updatedInvoiceSettings: InvoiceSettings = {
      ...initialInvoiceSettings,
      theme,
    };

    onComplete(updatedCompany, updatedInvoiceSettings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 my-auto">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-purple-700 shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to Veloce Ledger</h2>
          <p className="text-sm text-slate-500 mt-1">
            Let&apos;s set up your business profile. You can change these anytime in Settings.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Business Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business / Shop Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Al-Rehman Garments"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Phone & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone / WhatsApp Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Lahore / Karachi / Faisalabad"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Shop Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop #, Market, Area"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>
          </div>

          {/* Invoice Prefix, Starting No & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV-"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start No.</label>
              <input
                type="number"
                value={startingInvoiceNo}
                onChange={(e) => setStartingInvoiceNo(Number(e.target.value))}
                placeholder="1001"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="Rs."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>
          </div>

          {/* Theme selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Primary Theme</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTheme('purple')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
                  theme === 'purple'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-200'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                Premium Purple
              </button>
              <button
                type="button"
                onClick={() => setTheme('blue')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
                  theme === 'blue'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                Modern Blue
              </button>
              <button
                type="button"
                onClick={() => setTheme('green')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
                  theme === 'green'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                Classic Green
              </button>
            </div>
          </div>

          {/* Optional Logo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company Logo (Optional)</label>
            <div className="flex items-center gap-3">
              {logo ? (
                <img
                  src={logo}
                  alt="Logo"
                  className="w-12 h-12 rounded-xl object-contain bg-slate-50 border border-slate-200 p-1"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                  <Image className="w-5 h-5" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-3 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" /> Complete Setup & Enter Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
