// src/components/inventory/shared.jsx
//
// Form controls shared by the Inventory & Warranty screens (stock in,
// client sales, distributor sales, PC offers).
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { inputClass, parseSerials } from './helpers';

// "Pick a listed product, or type a SKU that isn't listed on the site yet".
export function ProductOrSkuPicker({ products, productId, sku, onProductChange, onSkuChange }) {
  // Start on "Listed Product" for a blank form; only start in manual mode
  // when there's already a typed SKU with no product behind it.
  const [useManualSku, setUseManualSku] = useState(Boolean(sku) && !productId);

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => {
            setUseManualSku(false);
            onSkuChange('');
          }}
          className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
            !useManualSku
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white dark:bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          Listed Product
        </button>
        <button
          type="button"
          onClick={() => {
            setUseManualSku(true);
            onProductChange(null, '');
          }}
          className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
            useManualSku
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white dark:bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          Not Listed (type SKU)
        </button>
      </div>

      {useManualSku ? (
        <input
          type="text"
          value={sku}
          onChange={(e) => onSkuChange(e.target.value)}
          placeholder="e.g. UNLISTED-SKU-01"
          className={`${inputClass} font-mono`}
        />
      ) : (
        <select
          value={productId || ''}
          onChange={(e) => {
            const id = e.target.value;
            const product = products.find((p) => String(p.id) === id);
            onProductChange(id || null, product?.sku || '');
          }}
          className={inputClass}
        >
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// Type or scan a serial and press Add (or Enter — what barcode scanners
// send), or paste a list. Shows the serials as removable chips. `taken`
// is the set of serials already used elsewhere in the same form (e.g. other
// item lines), so the same unit can't be entered twice.
export function SerialChipsInput({ value, onChange, taken, autoFocus = false, placeholder }) {
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState(null);

  const add = (raw) => {
    const incoming = parseSerials(raw);
    if (incoming.length === 0) return;
    const mine = new Set(value);
    const added = [];
    const skipped = [];
    for (const sn of incoming) {
      if (mine.has(sn) || taken?.has(sn)) skipped.push(sn);
      else {
        mine.add(sn);
        added.push(sn);
      }
    }
    if (added.length) onChange([...value, ...added]);
    setDraft('');
    setMessage(skipped.length ? `Already entered: ${skipped.join(', ')}` : null);
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          autoFocus={autoFocus}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setMessage(null);
          }}
          // Picked up by forms on submit so a serial typed but not yet
          // added isn't lost (see pendingSerials()).
          data-pending-serial={draft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (parseSerials(text).length > 1) {
              e.preventDefault();
              add(text);
            }
          }}
          placeholder={placeholder || 'Type or scan a serial, then press Add'}
          className={`${inputClass} flex-1 font-mono`}
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-40 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      {message && <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">{message}</p>}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-2.5 max-h-40 overflow-y-auto">
          {value.map((sn) => (
            <span
              key={sn}
              className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 pl-2 pr-1 py-0.5 rounded-md"
            >
              {sn}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== sn))}
                className="p-0.5 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
          You can also paste a list (one serial per line, or comma-separated).
        </p>
      )}
    </div>
  );
}
