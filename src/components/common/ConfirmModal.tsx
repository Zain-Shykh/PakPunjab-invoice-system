import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  requireTypingWord?: string; // e.g. "DELETE"
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDestructive = true,
  requireTypingWord,
}) => {
  const [typedInput, setTypedInput] = useState('');

  const isConfirmedAllowed = requireTypingWord
    ? typedInput.trim().toUpperCase() === requireTypingWord.toUpperCase()
    : true;

  const handleConfirm = () => {
    if (!isConfirmedAllowed) return;
    onConfirm();
    setTypedInput('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setTypedInput('');
        onClose();
      }}
      title={title}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-3 rounded-xl shrink-0 ${
              isDestructive ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{message}</p>
          </div>
        </div>

        {requireTypingWord && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Please type <span className="text-red-600 font-bold select-all">{requireTypingWord}</span> to confirm:
            </label>
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={`Type "${requireTypingWord}" here`}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500 font-mono"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setTypedInput('');
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={!isConfirmedAllowed}
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300 disabled:cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-purple-300 disabled:cursor-not-allowed'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
