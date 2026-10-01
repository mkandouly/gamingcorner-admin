// src/components/Modal.jsx
import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative w-full ${maxWidth} bg-white dark:bg-[#161b22] sm:rounded-3xl shadow-2xl max-h-screen sm:max-h-[90vh] overflow-y-auto`}
      >
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-white dark:bg-[#161b22] border-b border-slate-100 dark:border-slate-800 z-10">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
