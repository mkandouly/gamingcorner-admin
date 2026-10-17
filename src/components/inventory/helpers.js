// src/components/inventory/helpers.js
//
// Non-component helpers shared by the Inventory & Warranty screens.

export const inputClass =
  'w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500';
export const labelClass = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5';
export const errorBoxClass =
  'text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3';

export const money = (v) => `$${Number(v || 0).toFixed(2)}`;

// Split pasted/scanned input into individual serials: one per line, or
// separated by commas/semicolons/tabs. Normalized the same way the server
// stores them (trimmed, uppercase) so duplicates are caught before saving.
export function parseSerials(raw) {
  return String(raw || '')
    .split(/[\n,;\t]+/)
    .map((sn) => sn.trim().toUpperCase())
    .filter(Boolean);
}

// <input type="date"> value (local calendar day) for an ISO timestamp.
export function toDateInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Apply a picked calendar day to an existing timestamp, keeping its time of
// day, so changing only the date doesn't shift the warranty by hours.
export function withDate(originalIso, ymd) {
  const d = originalIso ? new Date(originalIso) : new Date();
  const [y, m, day] = ymd.split('-').map(Number);
  d.setFullYear(y, m - 1, day);
  return d.toISOString();
}

// Serials typed into a SerialChipsInput inside `container` but not yet
// added with the Add button — counted on submit so the last scan isn't lost.
export function pendingSerials(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll('[data-pending-serial]')).flatMap((el) =>
    parseSerials(el.getAttribute('data-pending-serial'))
  );
}
