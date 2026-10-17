// src/components/inventory/ClientSaleModals.jsx
//
// Client Sales: a read-only details view (notes in full, warranty status,
// where the unit came in from) and an edit form for a recorded sale.
import { useState } from 'react';
import { Loader2, Pencil, ShieldCheck, ShieldAlert, StickyNote, ArrowDownToLine } from 'lucide-react';
import client from '../../api/client';
import Modal from '../Modal';
import { inputClass, labelClass, errorBoxClass, money, toDateInput, withDate } from './helpers';
import { ProductOrSkuPicker } from './shared';

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 dark:text-slate-200 text-right min-w-0 break-words">{children}</span>
    </div>
  );
}

export function ClientSaleDetailsModal({ sale, canEdit, onEdit, onClose }) {
  const underWarranty = sale.warranty_expires_at && new Date(sale.warranty_expires_at) > new Date();
  return (
    <Modal title={`Sale — ${sale.serial_number}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200/70 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 p-3">
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <StickyNote className="w-3 h-3" /> Notes
          </p>
          {sale.notes ? (
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">{sale.notes}</p>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">No notes on this sale.</p>
          )}
        </div>

        <div>
          <Row label="Product">
            {sale.product_name || sale.sku}
            <span className="block text-[11px] font-mono text-slate-400">{sale.sku}</span>
          </Row>
          <Row label="Serial number">
            <span className="font-mono">{sale.serial_number}</span>
          </Row>
          <Row label="Sale price">{money(sale.sale_price)}</Row>
          <Row label="Sold on">{new Date(sale.sold_at).toLocaleDateString()}</Row>
          <Row label="Warranty">
            {sale.warranty_months ? (
              <span
                className={`inline-flex items-center gap-1 ${
                  underWarranty ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {underWarranty ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                {sale.warranty_months} months · {underWarranty ? 'until' : 'ended'}{' '}
                {new Date(sale.warranty_expires_at).toLocaleDateString()}
              </span>
            ) : (
              'None'
            )}
          </Row>
          <Row label="Order">{sale.order_id ? `#${sale.order_id}` : '—'}</Row>
          <Row label="Came in from">
            {sale.stock_in_receipt_id ? (
              <span className="inline-flex items-center gap-1">
                <ArrowDownToLine className="w-3.5 h-3.5 text-slate-400" />
                {sale.stock_in_source || 'no source'} · {new Date(sale.stock_in_received_at).toLocaleDateString()} · cost{' '}
                {money(sale.stock_in_cost_price)}
              </span>
            ) : (
              <span className="text-slate-400">Not logged on a stock-in by serial</span>
            )}
          </Row>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit Sale
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function ClientSaleEditModal({ sale, products, onSaved, onClose }) {
  const [form, setForm] = useState({
    product_id: sale.product_id ? String(sale.product_id) : null,
    sku: sale.sku || '',
    serial_number: sale.serial_number || '',
    sale_price: sale.sale_price ?? '',
    warranty_months: sale.warranty_months ?? '',
    sold_date: toDateInput(sale.sold_at),
    order_id: sale.order_id ?? '',
    notes: sale.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.sku.trim()) return setError('Pick a product or type a SKU.');
    if (!form.serial_number.trim()) return setError('Serial number is required.');
    if (form.sale_price === '' || Number(form.sale_price) < 0) return setError('Sale price is required.');
    if (form.warranty_months !== '' && (!Number.isInteger(Number(form.warranty_months)) || Number(form.warranty_months) < 0)) {
      return setError('Warranty must be a whole number of months.');
    }

    const body = {
      product_id: form.product_id ? Number(form.product_id) : null,
      sku: form.sku,
      serial_number: form.serial_number,
      sale_price: Number(form.sale_price),
      warranty_months: form.warranty_months === '' ? null : Number(form.warranty_months),
      order_id: form.order_id === '' ? null : Number(form.order_id),
      notes: form.notes,
    };
    if (form.sold_date !== toDateInput(sale.sold_at)) body.sold_at = withDate(sale.sold_at, form.sold_date);

    setSaving(true);
    try {
      const res = await client.patch(`/api/admin/serials/${sale.id}`, body);
      onSaved(res.data?.data);
    } catch (err) {
      console.error('Failed to update sale:', err);
      setError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Edit sale — ${sale.serial_number}`} onClose={() => !saving && onClose()}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Product</label>
          <ProductOrSkuPicker
            products={products}
            productId={form.product_id}
            sku={form.sku}
            onProductChange={(id, sku) => set({ product_id: id, sku })}
            onSkuChange={(sku) => set({ sku })}
          />
        </div>
        <div>
          <label className={labelClass}>Serial Number</label>
          <input
            type="text"
            value={form.serial_number}
            onChange={(e) => set({ serial_number: e.target.value })}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Sale Price</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.sale_price}
              onChange={(e) => set({ sale_price: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Warranty (months)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.warranty_months}
              onChange={(e) => set({ warranty_months: e.target.value })}
              placeholder="Empty = none"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Sale Date</label>
            <input
              type="date"
              value={form.sold_date}
              max={toDateInput()}
              onChange={(e) => set({ sold_date: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Order ID (optional)</label>
          <input
            type="number"
            value={form.order_id}
            onChange={(e) => set({ order_id: e.target.value })}
            placeholder="Link to a checkout order, if any"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            rows={4}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="e.g. buyer name/phone if sold in person"
            className={inputClass}
          />
        </div>

        {error && <div className={errorBoxClass}>{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
