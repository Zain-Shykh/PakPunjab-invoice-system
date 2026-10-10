import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert } from 'lucide-react';
import { CompanySettings } from '../../types';

interface LockScreenProps {
  company: CompanySettings;
  expectedPin: string;
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ company, expectedPin, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === expectedPin) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-950 p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-center border border-purple-200">
        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-700 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-900">{company.businessName}</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">Enter your security PIN to access the software</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              value={pin}
              onChange={(e) => {
                setError(false);
                setPin(e.target.value);
              }}
              placeholder="Enter PIN"
              className={`w-full text-center text-2xl tracking-widest font-mono py-3 px-4 rounded-xl border ${
                error
                  ? 'border-red-500 ring-2 ring-red-200 bg-red-50'
                  : 'border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200'
              } outline-hidden transition-all`}
            />
            {error && (
              <p className="text-xs text-red-600 mt-2 font-medium flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Incorrect PIN. Please try again.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" /> Unlock Software
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-slate-400 text-[11px]">
          Local offline security lock
        </div>
      </div>
    </div>
  );
};
