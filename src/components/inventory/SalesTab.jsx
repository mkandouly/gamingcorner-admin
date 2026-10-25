// src/components/inventory/SalesTab.jsx
//
// Multi-item sales, used by both the Client Sales and Distributor Sales
// tabs. One sale can hold many items (SKUs), each with many serial
// numbers. Sales can be searched, opened to read the notes and every unit,
// and edited afterwards — the header (who it went to, date, order, notes),
// a whole item line (price / warranty / product), single serials, adding
// units, and removing units. The two kinds differ only in who the sale is
// to: a registered distributor (required) or a client (optional name and
// phone) — see KINDS below.
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Loader2,
  Truck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Pencil,
  StickyNote,
  X,
  Package,
  User,
  Phone,
} from 'lucide-react';
import client, { fetchAllPages } from '../../api/client';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';
import { inputClass, labelClass, errorBoxClass, money, toDateInput, withDate, pendingSerials } from './helpers';
import { ProductOrSkuPicker, SerialChipsInput } from './shared';

const KINDS = {
  distributor: {
    api: '/api/admin/distributor-sales',
    noun: 'distributor sale',
    createLabel: 'Record Distributor Sale',
    createTitle: 'Record a Distributor Sale',
    editTitle: 'Edit Distributor Sale',
    searchPlaceholder: 'Search distributor, serial, SKU, notes or #sale...',
    icon: Truck,
    iconClass: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400',
    partyName: (sale) => sale.distributor_name,
  },
  client: {
    api: '/api/admin/client-sales',
    noun: 'client sale',
    createLabel: 'Record Sale',
    createTitle: 'Record a Client Sale',
    editTitle: 'Edit Sale',
    searchPlaceholder: 'Search customer, phone, serial, SKU, notes or #sale...',
    icon: User,
    iconClass: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    partyName: (sale) => sale.customer_name || 'Walk-in client',
  },
};

// Who the sale is to, as form values / API payload, per kind.
const partyValues = (kind, sale) =>
  kind === 'distributor'
    ? { distributor_id: sale ? String(sale.distributor_id) : '' }
    : { customer_name: sale?.customer_name ?? '', customer_phone: sale?.customer_phone ?? '' };
const partyPayload = (kind, values) =>
  kind === 'distributor'
    ? { distributor_id: Number(values.distributor_id) }
    : { customer_name: values.customer_name, customer_phone: values.customer_phone };
const partyError = (kind, values) =>
  kind === 'distributor' && !values.distributor_id ? 'Pick which distributor this sale is to.' : null;

const EMPTY_LINE = { product_id: null, sku: '', sale_price: '', warranty_months: '', serial_numbers: [] };
const newSaleForm = (kind) => ({
  ...partyValues(kind, null),
  sold_date: toDateInput(),
  order_id: '',
  notes: '',
  lines: [{ ...EMPTY_LINE, key: Date.now() }],
});

// Group a sale's units into item lines: same product/SKU = one line.
// A line normally has one price and warranty; if units were edited one by
// one they can differ, which is shown as "varies".
function groupUnits(units) {
  const lines = new Map();
  for (const u of units) {
    const key = `${u.product_id || ''}|${u.sku}`;
    if (!lines.has(key)) {
      lines.set(key, { key, product_id: u.product_id, sku: u.sku, product_name: u.product_name, units: [] });
    }
    lines.get(key).units.push(u);
  }
  return Array.from(lines.values()).map((line) => {
    const prices = new Set(line.units.map((u) => Number(u.sale_price).toFixed(2)));
    const warranties = new Set(line.units.map((u) => u.warranty_months ?? null));
    return {
      ...line,
      price: prices.size === 1 ? Number(line.units[0].sale_price) : null,
      warranty: warranties.size === 1 ? line.units[0].warranty_months ?? null : undefined,
      total: line.units.reduce((s, u) => s + Number(u.sale_price || 0), 0),
    };
  });
}

function validateLine(line, label) {
  if (!line.sku.trim()) return `${label}: pick a product or type a SKU.`;
  if (line.sale_price === '' || Number(line.sale_price) < 0) return `${label}: unit price is required.`;
  if (line.warranty_months !== '' && (!Number.isInteger(Number(line.warranty_months)) || Number(line.warranty_months) < 0)) {
    return `${label}: warranty must be a whole number of months.`;
  }
  if (line.serial_numbers.length === 0) return `${label}: add at least one serial number.`;
  return null;
}

export default function SalesTab({ kind, canManage, products, loadProducts, onInventoryChanged, extraActions }) {
  const K = KINDS[kind];
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [distributors, setDistributors] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(() => newSaleForm(kind));
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const createFormRef = useRef(null);

  const [headerEdit, setHeaderEdit] = useState(null); // { ...party, sold_date, order_id, notes }
  const [lineEdit, setLineEdit] = useState(null); // { line, product_id, sku, sale_price, warranty_months }
  const [addUnits, setAddUnits] = useState(null); // { line|null, product_id, sku, sale_price, warranty_months, serial_numbers }
  const [unitEdit, setUnitEdit] = useState(null); // { unit, serial_number }
  const [modalError, setModalError] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const addUnitsRef = useRef(null);

  const [confirm, setConfirm] = useState(null); // { title, message, label, run }
  const [confirmBusy, setConfirmBusy] = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 20 };
      if (search) params.q = search;
      const res = await client.get(K.api, { params });
      setSales(res.data?.data || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      console.error(`Failed to load ${K.noun}s:`, err);
      setError(err.response?.data?.message || `Failed to load ${K.noun}s.`);
    } finally {
      setLoading(false);
    }
  }, [page, search, K]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const loadDistributors = useCallback(async () => {
    if (kind !== 'distributor' || distributors) return;
    try {
      setDistributors(await fetchAllPages('/api/admin/distributors'));
    } catch (err) {
      console.error('Failed to load distributors:', err);
      setDistributors([]);
    }
  }, [kind, distributors]);

  const lines = useMemo(() => (detail ? groupUnits(detail.units || []) : []), [detail]);

  // After any change: show the updated sale, refresh the list and stock.
  const applySale = (sale) => {
    if (sale) setDetail(sale);
    fetchSales();
    onInventoryChanged?.();
  };

  const toggleExpand = async (sale) => {
    setActionError(null);
    if (expandedId === sale.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(sale.id);
    setDetail(null);
    try {
      const res = await client.get(`${K.api}/${sale.id}`);
      setDetail(res.data?.data);
    } catch (err) {
      console.error('Failed to load sale:', err);
      setActionError(err.response?.data?.message || 'Failed to load this sale.');
    }
  };

  // ---------------- create
  const openCreate = () => {
    setForm(newSaleForm(kind));
    setFormError(null);
    setCreateOpen(true);
    loadProducts();
    loadDistributors();
  };

  const updateLine = (index, patch) =>
    setForm((f) => ({ ...f, lines: f.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)) }));

  const takenElsewhere = (index) => new Set(form.lines.flatMap((l, i) => (i === index ? [] : l.serial_numbers)));

  const submitCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    const whoError = partyError(kind, form);
    if (whoError) {
      setFormError(whoError);
      return;
    }

    // Count serials typed into a line but not yet added with "Add".
    const lines = form.lines.map((line, i) => {
      const box = createFormRef.current?.querySelector(`[data-line="${i}"]`);
      const extra = pendingSerials(box).filter((sn) => !line.serial_numbers.includes(sn));
      return { ...line, serial_numbers: [...line.serial_numbers, ...extra] };
    });
    for (const [i, line] of lines.entries()) {
      const problem = validateLine(line, `Item ${i + 1}`);
      if (problem) {
        setFormError(problem);
        return;
      }
    }
    const seen = new Set();
    for (const sn of lines.flatMap((l) => l.serial_numbers)) {
      if (seen.has(sn)) {
        setFormError(`Serial number "${sn}" is entered on more than one item.`);
        return;
      }
      seen.add(sn);
    }

    setSaving(true);
    try {
      const today = toDateInput();
      const res = await client.post(K.api, {
        ...partyPayload(kind, form),
        order_id: form.order_id ? Number(form.order_id) : null,
        notes: form.notes,
        sold_at: form.sold_date && form.sold_date !== today ? withDate(null, form.sold_date) : undefined,
        lines: lines.map((l) => ({
          product_id: l.product_id ? Number(l.product_id) : null,
          sku: l.sku,
          sale_price: Number(l.sale_price),
          warranty_months: l.warranty_months === '' ? null : Number(l.warranty_months),
          serial_numbers: l.serial_numbers,
        })),
      });
      setCreateOpen(false);
      setSearch('');
      setSearchInput('');
      setPage(1);
      const created = res.data?.data;
      setExpandedId(created?.id ?? null);
      setDetail(created || null);
      await fetchSales();
      onInventoryChanged?.();
    } catch (err) {
      console.error(`Failed to record ${K.noun}:`, err);
      setFormError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------- shared runner for the edit modals
  const runModal = async (request, close) => {
    setModalError(null);
    setModalSaving(true);
    try {
      const res = await request();
      close();
      applySale(res.data?.data);
    } catch (err) {
      console.error(`${K.noun} update failed:`, err);
      setModalError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setModalSaving(false);
    }
  };

  const openHeaderEdit = () => {
    loadDistributors();
    setModalError(null);
    setHeaderEdit({
      ...partyValues(kind, detail),
      sold_date: toDateInput(detail.sold_at),
      order_id: detail.order_id ?? '',
      notes: detail.notes ?? '',
    });
  };

  const submitHeaderEdit = (e) => {
    e.preventDefault();
    const whoError = partyError(kind, headerEdit);
    if (whoError) {
      setModalError(whoError);
      return;
    }
    const body = {
      ...partyPayload(kind, headerEdit),
      order_id: headerEdit.order_id === '' ? null : Number(headerEdit.order_id),
      notes: headerEdit.notes,
    };
    if (headerEdit.sold_date !== toDateInput(detail.sold_at)) body.sold_at = withDate(detail.sold_at, headerEdit.sold_date);
    runModal(() => client.patch(`${K.api}/${detail.id}`, body), () => setHeaderEdit(null));
  };

  const openLineEdit = (line) => {
    loadProducts();
    setModalError(null);
    setLineEdit({
      line,
      product_id: line.product_id ? String(line.product_id) : null,
      sku: line.sku,
      sale_price: line.price ?? '',
      warranty_months: line.warranty === undefined ? '' : line.warranty ?? '',
    });
  };

  const submitLineEdit = (e) => {
    e.preventDefault();
    const { line, product_id, sku, sale_price, warranty_months } = lineEdit;
    if (!sku.trim()) {
      setModalError('Pick a product or type a SKU.');
      return;
    }
    const body = { unit_ids: line.units.map((u) => u.id), product_id: product_id ? Number(product_id) : null, sku };
    // Leave price / warranty untouched when they vary across units and the
    // field was left blank — only overwrite what the user actually set.
    if (sale_price !== '') {
      if (Number(sale_price) < 0) {
        setModalError('Unit price must be a non-negative number.');
        return;
      }
      body.sale_price = Number(sale_price);
    } else if (line.price !== null) {
      setModalError('Unit price is required.');
      return;
    }
    if (warranty_months !== '' || line.warranty !== undefined) {
      if (warranty_months !== '' && (!Number.isInteger(Number(warranty_months)) || Number(warranty_months) < 0)) {
        setModalError('Warranty must be a whole number of months.');
        return;
      }
      body.warranty_months = warranty_months === '' ? null : Number(warranty_months);
    }
    runModal(() => client.patch(`${K.api}/${detail.id}/units`, body), () => setLineEdit(null));
  };

  const openAddUnits = (line) => {
    loadProducts();
    setModalError(null);
    setAddUnits(
      line
        ? {
            line,
            product_id: line.product_id ? String(line.product_id) : null,
            sku: line.sku,
            sale_price: line.price ?? '',
            warranty_months: line.warranty === undefined ? '' : line.warranty ?? '',
            serial_numbers: [],
          }
        : { line: null, ...EMPTY_LINE }
    );
  };

  const submitAddUnits = (e) => {
    e.preventDefault();
    const extra = pendingSerials(addUnitsRef.current).filter((sn) => !addUnits.serial_numbers.includes(sn));
    const draft = { ...addUnits, serial_numbers: [...addUnits.serial_numbers, ...extra] };
    const problem = validateLine(draft, addUnits.line ? 'This item' : 'New item');
    if (problem) {
      setModalError(problem);
      return;
    }
    runModal(
      () =>
        client.post(`${K.api}/${detail.id}/units`, {
          product_id: draft.product_id ? Number(draft.product_id) : null,
          sku: draft.sku,
          sale_price: Number(draft.sale_price),
          warranty_months: draft.warranty_months === '' ? null : Number(draft.warranty_months),
          serial_numbers: draft.serial_numbers,
        }),
      () => setAddUnits(null)
    );
  };

  const submitUnitEdit = (e) => {
    e.preventDefault();
    if (!unitEdit.serial_number.trim()) {
      setModalError('Serial number is required.');
      return;
    }
    runModal(
      () =>
        client.patch(`${K.api}/${detail.id}/units/${unitEdit.unit.id}`, {
          serial_number: unitEdit.serial_number,
        }),
      () => setUnitEdit(null)
    );
  };

  // ---------------- removals (confirmed)
  const askConfirm = (opts) => {
    setActionError(null);
    setConfirm(opts);
  };

  const runConfirm = async () => {
    setConfirmBusy(true);
    try {
      await confirm.run();
      setConfirm(null);
    } catch (err) {
      console.error('Action failed:', err);
      setConfirm(null);
      setActionError(err.response?.data?.message || 'That didn’t work — please try again.');
    } finally {
      setConfirmBusy(false);
    }
  };

  const removeUnit = (unit) =>
    askConfirm({
      title: `Remove serial ${unit.serial_number} from this sale?`,
      message: 'Its sale and warranty record will be deleted.',
      label: 'Remove',
      run: async () => {
        const res = await client.delete(`${K.api}/${detail.id}/units/${unit.id}`);
        applySale(res.data?.data);
      },
    });

  const removeLine = (line) =>
    askConfirm({
      title: `Remove ${line.product_name || line.sku} (${line.units.length} unit${line.units.length !== 1 ? 's' : ''}) from this sale?`,
      message: 'Every serial on this item and its warranty records will be deleted.',
      label: 'Remove Item',
      run: async () => {
        const res = await client.delete(`${K.api}/${detail.id}/units`, {
          data: { unit_ids: line.units.map((u) => u.id) },
        });
        applySale(res.data?.data);
      },
    });

  const deleteSale = (sale) =>
    askConfirm({
      title: `Delete ${K.noun} #${sale.id}?`,
      message: `This deletes the sale to ${K.partyName(sale)} and all ${sale.unit_count} unit${
        sale.unit_count !== 1 ? 's' : ''
      } in it, including their warranty records. This can't be undone.`,
      label: 'Delete Sale',
      run: async () => {
        await client.delete(`${K.api}/${sale.id}`);
        setExpandedId(null);
        setDetail(null);
        await fetchSales();
        onInventoryChanged?.();
      },
    });

  const canRemoveFromSale = (count) => (detail?.units?.length || 0) > count;

  // ---------------- render
  const formTotal = form.lines.reduce((s, l) => s + (Number(l.sale_price) || 0) * l.serial_numbers.length, 0);
  const formUnits = form.lines.reduce((s, l) => s + l.serial_numbers.length, 0);

  // Who the sale is to: a distributor picker, or the client's name + phone.
  const partyFields = (values, setValues) =>
    kind === 'distributor' ? (
      <div>
        <label className={labelClass}>Distributor</label>
        <select
          value={values.distributor_id}
          onChange={(e) => setValues((v) => ({ ...v, distributor_id: e.target.value }))}
          className={inputClass}
        >
          <option value="">{distributors === null ? 'Loading distributors…' : 'Select distributor'}</option>
          {(distributors || []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {distributors?.length === 0 && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
            No distributors registered yet — add one under "Distributor Profiles" first.
          </p>
        )}
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Customer Name (optional)</label>
          <input
            type="text"
            value={values.customer_name}
            onChange={(e) => setValues((v) => ({ ...v, customer_name: e.target.value }))}
            placeholder="e.g. Rami Khalil"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone (optional)</label>
          <input
            type="tel"
            value={values.customer_phone}
            onChange={(e) => setValues((v) => ({ ...v, customer_phone: e.target.value }))}
            placeholder="e.g. 70 123 456"
            className={inputClass}
          />
        </div>
      </div>
    );

  const KindIcon = K.icon;

  return (
    <div>
      <div className="flex justify-between items-center gap-2 mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
          className="flex gap-2 flex-1 max-w-md"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={K.searchPlaceholder}
              className="w-full bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 transition-colors shrink-0"
          >
            Search
          </button>
        </form>
        {canManage && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <Plus className="w-4 h-4" /> {K.createLabel}
            </button>
            {extraActions}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-indigo-600 dark:text-indigo-400 gap-2 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading...
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-20">{error}</p>
      ) : sales.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400 py-20">
          {search ? `No ${K.noun}s match "${search}".` : `No ${K.noun}s recorded yet.`}
        </p>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => {
            const isExpanded = expandedId === sale.id;
            return (
              <div
                key={sale.id}
                className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm"
              >
                <button onClick={() => toggleExpand(sale)} className="w-full flex items-center justify-between gap-4 p-4 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${K.iconClass}`}>
                      <KindIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        #{sale.id} · {K.partyName(sale)}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(sale.sold_at).toLocaleDateString()} · {sale.unit_count} unit{sale.unit_count !== 1 ? 's' : ''} ·{' '}
                        {sale.sku_count} item{sale.sku_count !== 1 ? 's' : ''}
                        {sale.order_id && ` · Order #${sale.order_id}`}
                        {sale.customer_phone && (
                          <span className="inline-flex items-center gap-0.5 ml-1">
                            · <Phone className="w-3 h-3" /> {sale.customer_phone}
                          </span>
                        )}
                      </p>
                      {sale.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 min-w-0">
                          <StickyNote className="w-3 h-3 shrink-0 text-amber-500" />
                          <span className="truncate">{sale.notes}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{money(sale.total)}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4 bg-slate-50/50 dark:bg-[#0d1117]/50">
                    {!detail ? (
                      actionError ? (
                        <p className="text-xs text-red-600 dark:text-red-400">{actionError}</p>
                      ) : (
                        <div className="flex items-center justify-center py-4 text-indigo-600 dark:text-indigo-400 gap-2 text-xs">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                        </div>
                      )
                    ) : (
                      <>
                        <div className="rounded-xl border border-amber-200/70 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 p-3">
                          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <StickyNote className="w-3 h-3" /> Notes
                          </p>
                          {detail.notes ? (
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">{detail.notes}</p>
                          ) : (
                            <p className="text-xs text-slate-400 dark:text-slate-500">No notes on this sale.</p>
                          )}
                        </div>

                        <div className="space-y-3">
                          {lines.map((line) => (
                            <div key={line.key} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161b22] p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    {line.product_name || line.sku}
                                    {!line.product_name && (
                                      <span className="ml-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">not listed</span>
                                    )}
                                  </p>
                                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                    <span className="font-mono">{line.sku}</span> · {line.units.length} unit{line.units.length !== 1 ? 's' : ''} ×{' '}
                                    {line.price === null ? 'varying prices' : money(line.price)} ·{' '}
                                    {line.warranty === undefined
                                      ? 'varying warranty'
                                      : line.warranty === null
                                      ? 'no warranty'
                                      : `${line.warranty}mo warranty`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white mr-2">{money(line.total)}</span>
                                  {canManage && (
                                    <>
                                      <button
                                        onClick={() => openLineEdit(line)}
                                        title="Edit item (product, price, warranty)"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => openAddUnits(line)}
                                        title="Add serials to this item"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      {canRemoveFromSale(line.units.length) && (
                                        <button
                                          onClick={() => removeLine(line)}
                                          title="Remove this item from the sale"
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {line.units.map((u) => {
                                  const underWarranty = u.warranty_expires_at && new Date(u.warranty_expires_at) > new Date();
                                  const tip = [
                                    u.stock_in_receipt_id
                                      ? `IN: ${u.stock_in_source || 'no source'} · ${new Date(u.stock_in_received_at).toLocaleDateString()} · cost ${money(u.stock_in_cost_price)}`
                                      : 'Not logged on a stock-in by serial',
                                    line.price === null ? `Price ${money(u.sale_price)}` : null,
                                    u.warranty_expires_at
                                      ? `Warranty until ${new Date(u.warranty_expires_at).toLocaleDateString()}`
                                      : 'No warranty',
                                  ]
                                    .filter(Boolean)
                                    .join('\n');
                                  return (
                                    <span
                                      key={u.id}
                                      title={tip}
                                      className={`inline-flex items-center gap-1 font-mono text-[11px] pl-2 pr-1 py-0.5 rounded-md border ${
                                        underWarranty
                                          ? 'text-slate-700 dark:text-slate-300 bg-emerald-50/70 dark:bg-emerald-500/5 border-emerald-200/70 dark:border-emerald-500/20'
                                          : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-transparent'
                                      }`}
                                    >
                                      {u.serial_number}
                                      {canManage && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setModalError(null);
                                              setUnitEdit({ unit: u, serial_number: u.serial_number });
                                            }}
                                            title="Fix this serial number"
                                            className="p-0.5 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                          {canRemoveFromSale(1) && (
                                            <button
                                              type="button"
                                              onClick={() => removeUnit(u)}
                                              title="Remove this unit"
                                              className="p-0.5 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        {actionError && <p className="text-xs text-red-600 dark:text-red-400">{actionError}</p>}

                        {canManage && (
                          <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                            <button
                              onClick={() => openAddUnits(null)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              <Package className="w-3.5 h-3.5" /> Add Item
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={openHeaderEdit}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit Sale
                              </button>
                              <button
                                onClick={() => deleteSale(sale)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Sale
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- Record a sale ---------------- */}
      {createOpen && (
        <Modal title={K.createTitle} onClose={() => !saving && setCreateOpen(false)} maxWidth="max-w-3xl">
          <form ref={createFormRef} onSubmit={submitCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {partyFields(form, setForm)}
              <div>
                <label className={labelClass}>Sale Date</label>
                <input
                  type="date"
                  value={form.sold_date}
                  max={toDateInput()}
                  onChange={(e) => setForm((f) => ({ ...f, sold_date: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-3">
              {form.lines.map((line, index) => (
                <div
                  key={line.key}
                  data-line={index}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Item {index + 1}</p>
                    {form.lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }))}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                        title="Remove this item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <ProductOrSkuPicker
                    products={products}
                    productId={line.product_id}
                    sku={line.sku}
                    onProductChange={(id, sku) => updateLine(index, { product_id: id, sku })}
                    onSkuChange={(sku) => updateLine(index, { sku })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Unit Price</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.sale_price}
                        onChange={(e) => updateLine(index, { sale_price: e.target.value })}
                        placeholder="Price per unit"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Warranty (months)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={line.warranty_months}
                        onChange={(e) => updateLine(index, { warranty_months: e.target.value })}
                        placeholder="e.g. 12"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Serial Numbers</label>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {line.serial_numbers.length} unit{line.serial_numbers.length !== 1 ? 's' : ''}
                        {line.sale_price !== '' && ` · ${money(Number(line.sale_price) * line.serial_numbers.length)}`}
                      </span>
                    </div>
                    <SerialChipsInput
                      value={line.serial_numbers}
                      onChange={(serial_numbers) => updateLine(index, { serial_numbers })}
                      taken={takenElsewhere(index)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, { ...EMPTY_LINE, key: Date.now() }] }))}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Item
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className={labelClass}>Order ID (optional)</label>
                <input
                  type="number"
                  value={form.order_id}
                  onChange={(e) => setForm((f) => ({ ...f, order_id: e.target.value }))}
                  placeholder="Link to a checkout order"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Notes (optional)</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. invoice number, payment terms, who picked it up"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                {formUnits} unit{formUnits !== 1 ? 's' : ''} across {form.lines.length} item{form.lines.length !== 1 ? 's' : ''}
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">Total {money(formTotal)}</span>
            </div>

            {formError && <div className={errorBoxClass}>{formError}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
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
                {K.createLabel}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------------- Edit sale header ---------------- */}
      {headerEdit && (
        <Modal title={`${K.editTitle} #${detail?.id}`} onClose={() => !modalSaving && setHeaderEdit(null)}>
          <form onSubmit={submitHeaderEdit} className="space-y-4">
            {partyFields(headerEdit, setHeaderEdit)}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Sale Date</label>
                <input
                  type="date"
                  value={headerEdit.sold_date}
                  max={toDateInput()}
                  onChange={(e) => setHeaderEdit((h) => ({ ...h, sold_date: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Order ID (optional)</label>
                <input
                  type="number"
                  value={headerEdit.order_id}
                  onChange={(e) => setHeaderEdit((h) => ({ ...h, order_id: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 -mt-2">
              Every unit's warranty is counted from the sale date, so changing it moves their warranty end dates too.
            </p>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                rows={4}
                value={headerEdit.notes}
                onChange={(e) => setHeaderEdit((h) => ({ ...h, notes: e.target.value }))}
                className={inputClass}
              />
            </div>
            {modalError && <div className={errorBoxClass}>{modalError}</div>}
            <ModalButtons busy={modalSaving} onCancel={() => setHeaderEdit(null)} label="Save Changes" />
          </form>
        </Modal>
      )}

      {/* ---------------- Edit an item line ---------------- */}
      {lineEdit && (
        <Modal title={`Edit item — ${lineEdit.line.product_name || lineEdit.line.sku}`} onClose={() => !modalSaving && setLineEdit(null)}>
          <form onSubmit={submitLineEdit} className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Applies to all {lineEdit.line.units.length} unit{lineEdit.line.units.length !== 1 ? 's' : ''} of this item in the sale.
              To fix one serial number, use the pencil on that serial.
            </p>
            <div>
              <label className={labelClass}>Product</label>
              <ProductOrSkuPicker
                products={products}
                productId={lineEdit.product_id}
                sku={lineEdit.sku}
                onProductChange={(id, sku) => setLineEdit((l) => ({ ...l, product_id: id, sku }))}
                onSkuChange={(sku) => setLineEdit((l) => ({ ...l, sku }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Unit Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={lineEdit.sale_price}
                  onChange={(e) => setLineEdit((l) => ({ ...l, sale_price: e.target.value }))}
                  placeholder={lineEdit.line.price === null ? 'Varies — leave blank to keep' : ''}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Warranty (months)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={lineEdit.warranty_months}
                  onChange={(e) => setLineEdit((l) => ({ ...l, warranty_months: e.target.value }))}
                  placeholder={lineEdit.line.warranty === undefined ? 'Varies — leave blank to keep' : 'Empty = no warranty'}
                  className={inputClass}
                />
              </div>
            </div>
            {modalError && <div className={errorBoxClass}>{modalError}</div>}
            <ModalButtons busy={modalSaving} onCancel={() => setLineEdit(null)} label="Save Item" />
          </form>
        </Modal>
      )}

      {/* ---------------- Add serials / add an item ---------------- */}
      {addUnits && (
        <Modal
          title={addUnits.line ? `Add serials — ${addUnits.line.product_name || addUnits.line.sku}` : 'Add an item to this sale'}
          onClose={() => !modalSaving && setAddUnits(null)}
        >
          <form ref={addUnitsRef} onSubmit={submitAddUnits} className="space-y-4">
            {!addUnits.line && (
              <div>
                <label className={labelClass}>Product</label>
                <ProductOrSkuPicker
                  products={products}
                  productId={addUnits.product_id}
                  sku={addUnits.sku}
                  onProductChange={(id, sku) => setAddUnits((a) => ({ ...a, product_id: id, sku }))}
                  onSkuChange={(sku) => setAddUnits((a) => ({ ...a, sku }))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Unit Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addUnits.sale_price}
                  onChange={(e) => setAddUnits((a) => ({ ...a, sale_price: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Warranty (months)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={addUnits.warranty_months}
                  onChange={(e) => setAddUnits((a) => ({ ...a, warranty_months: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Serial Numbers ({addUnits.serial_numbers.length})</label>
              <SerialChipsInput
                autoFocus
                value={addUnits.serial_numbers}
                onChange={(serial_numbers) => setAddUnits((a) => ({ ...a, serial_numbers }))}
                taken={new Set((detail?.units || []).map((u) => u.serial_number))}
              />
            </div>
            {modalError && <div className={errorBoxClass}>{modalError}</div>}
            <ModalButtons busy={modalSaving} onCancel={() => setAddUnits(null)} label={addUnits.line ? 'Add Serials' : 'Add Item'} />
          </form>
        </Modal>
      )}

      {/* ---------------- Fix one serial ---------------- */}
      {unitEdit && (
        <Modal title="Fix serial number" onClose={() => !modalSaving && setUnitEdit(null)}>
          <form onSubmit={submitUnitEdit} className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {unitEdit.unit.product_name || unitEdit.unit.sku} — currently{' '}
              <span className="font-mono">{unitEdit.unit.serial_number}</span>
            </p>
            <input
              type="text"
              autoFocus
              value={unitEdit.serial_number}
              onChange={(e) => setUnitEdit((u) => ({ ...u, serial_number: e.target.value }))}
              className={`${inputClass} font-mono`}
            />
            {modalError && <div className={errorBoxClass}>{modalError}</div>}
            <ModalButtons busy={modalSaving} onCancel={() => setUnitEdit(null)} label="Save Serial" />
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.label}
          busy={confirmBusy}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function ModalButtons({ busy, onCancel, label }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-60"
      >
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {label}
      </button>
    </div>
  );
}
