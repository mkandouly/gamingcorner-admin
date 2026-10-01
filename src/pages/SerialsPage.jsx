// src/pages/SerialsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Truck,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ScanBarcode,
  Package,
  X,
} from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const TABS = [
  { key: 'in', label: 'Stock In', icon: ArrowDownToLine },
  { key: 'out-client', label: 'Client Sales', icon: ArrowUpFromLine },
  { key: 'out-distributor', label: 'Distributor Sales', icon: Truck },
  { key: 'offers', label: 'PC Offers', icon: Package },
];

// Shared control for "pick a listed product, or type a SKU that isn't
// listed on the site yet" - used by both the Stock In and Sale forms.
function ProductOrSkuPicker({ products, productId, sku, onProductChange, onSkuChange }) {
  const [useManualSku, setUseManualSku] = useState(!productId);

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
          className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
        />
      ) : (
        <select
          value={productId || ''}
          onChange={(e) => {
            const id = e.target.value;
            const product = products.find((p) => String(p.id) === id);
            onProductChange(id || null, product?.sku || '');
          }}
          className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
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

const EMPTY_IN = { product_id: null, sku: '', quantity: '', cost_price: '', source: '', notes: '' };
const EMPTY_OUT = { product_id: null, sku: '', serial_number: '', warranty_months: '', sale_price: '', order_id: '', distributor_id: '', notes: '' };
const EMPTY_OFFER_ITEM = { product_id: null, sku: '', serial_number: '' };
const EMPTY_OFFER = { items: [{ ...EMPTY_OFFER_ITEM }], sale_price: '', warranty_months: '', order_id: '', notes: '' };

export default function SerialsPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('serials.view');
  const canManage = hasPermission('serials.manage');

  const [tab, setTab] = useState('in');
  const [products, setProducts] = useState([]);
  const [distributors, setDistributors] = useState([]);

  const [receipts, setReceipts] = useState([]);
  const [inventorySummary, setInventorySummary] = useState([]);
  const [inventorySummaryLoading, setInventorySummaryLoading] = useState(true);
  const [receiptsLoading, setReceiptsLoading] = useState(true);
  const [receiptsError, setReceiptsError] = useState(null);
  const [receiptsPage, setReceiptsPage] = useState(1);
  const [receiptsPagination, setReceiptsPagination] = useState(null);
  const [sourceSearchInput, setSourceSearchInput] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');
  const [inFormOpen, setInFormOpen] = useState(false);
  const [inForm, setInForm] = useState(EMPTY_IN);
  const [inError, setInError] = useState(null);
  const [inSaving, setInSaving] = useState(false);
  const [deleteReceiptTarget, setDeleteReceiptTarget] = useState(null);
  const [deletingReceipt, setDeletingReceipt] = useState(false);

  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState(null);
  const [salesPage, setSalesPage] = useState(1);
  const [salesPagination, setSalesPagination] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [outFormOpen, setOutFormOpen] = useState(false);
  const [outForm, setOutForm] = useState(EMPTY_OUT);
  const [outError, setOutError] = useState(null);
  const [outSaving, setOutSaving] = useState(false);
  const [deleteSaleTarget, setDeleteSaleTarget] = useState(null);
  const [deletingSale, setDeletingSale] = useState(false);

  // PC Offers state
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState(null);
  const [offersPage, setOffersPage] = useState(1);
  const [offersPagination, setOffersPagination] = useState(null);
  const [expandedOfferId, setExpandedOfferId] = useState(null);
  const [expandedOfferDetail, setExpandedOfferDetail] = useState(null);
  const [offerFormOpen, setOfferFormOpen] = useState(false);
  const [offerForm, setOfferForm] = useState(EMPTY_OFFER);
  const [offerError, setOfferError] = useState(null);
  const [offerSaving, setOfferSaving] = useState(false);
  const [deleteOfferTarget, setDeleteOfferTarget] = useState(null);
  const [deletingOffer, setDeletingOffer] = useState(false);

  const loadProducts = useCallback(async () => {
    if (products.length > 0) return;
    try {
      const res = await client.get('/api/admin/products', { params: { limit: 200 } });
      setProducts(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  }, [products.length]);

  const loadDistributors = useCallback(async () => {
    if (distributors.length > 0) return;
    try {
      const res = await client.get('/api/admin/distributors', { params: { limit: 200 } });
      setDistributors(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load distributors:', err);
    }
  }, [distributors.length]);

  const fetchInventorySummary = useCallback(async () => {
    setInventorySummaryLoading(true);
    try {
      const res = await client.get('/api/admin/inventory-summary', { params: { limit: 100 } });
      setInventorySummary(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load inventory summary:', err);
    } finally {
      setInventorySummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView && tab === 'in') fetchInventorySummary();
  }, [canView, tab, fetchInventorySummary]);

  const fetchReceipts = useCallback(async () => {
    setReceiptsLoading(true);
    setReceiptsError(null);
    try {
      const params = { page: receiptsPage, limit: 20 };
      if (sourceSearch) params.source = sourceSearch;
      const res = await client.get('/api/admin/stock-receipts', { params });
      setReceipts(res.data?.data || []);
      setReceiptsPagination(res.data?.pagination || null);
    } catch (err) {
      console.error('Failed to load stock receipts:', err);
      setReceiptsError(err.response?.data?.message || 'Failed to load.');
    } finally {
      setReceiptsLoading(false);
    }
  }, [receiptsPage, sourceSearch]);

  const fetchSales = useCallback(async () => {
    setSalesLoading(true);
    setSalesError(null);
    try {
      const params = { page: salesPage, limit: 20, type: tab === 'out-distributor' ? 'distributor' : 'client' };
      if (search) params.search = search;
      const res = await client.get('/api/admin/serials', { params });
      setSales(res.data?.data || []);
      setSalesPagination(res.data?.pagination || null);
    } catch (err) {
      console.error('Failed to load sales:', err);
      setSalesError(err.response?.data?.message || 'Failed to load.');
    } finally {
      setSalesLoading(false);
    }
  }, [salesPage, search, tab]);

  useEffect(() => {
    if (canView && tab === 'in') fetchReceipts();
  }, [canView, tab, fetchReceipts]);

  useEffect(() => {
    if (canView && (tab === 'out-client' || tab === 'out-distributor')) fetchSales();
  }, [canView, tab, fetchSales]);

  useEffect(() => {
    setSalesPage(1);
  }, [tab]);

  useEffect(() => {
    setSalesPage(1);
  }, [search]);

  const fetchOffers = useCallback(async () => {
    setOffersLoading(true);
    setOffersError(null);
    try {
      const res = await client.get('/api/admin/pc-offers', { params: { page: offersPage, limit: 20 } });
      setOffers(res.data?.data || []);
      setOffersPagination(res.data?.pagination || null);
    } catch (err) {
      console.error('Failed to load PC offers:', err);
      setOffersError(err.response?.data?.message || 'Failed to load.');
    } finally {
      setOffersLoading(false);
    }
  }, [offersPage]);

  useEffect(() => {
    if (canView && tab === 'offers') fetchOffers();
  }, [canView, tab, fetchOffers]);

  useEffect(() => {
    setReceiptsPage(1);
  }, [sourceSearch]);

  const toggleExpandOffer = async (offer) => {
    if (expandedOfferId === offer.id) {
      setExpandedOfferId(null);
      setExpandedOfferDetail(null);
      return;
    }
    setExpandedOfferId(offer.id);
    try {
      const res = await client.get(`/api/admin/pc-offers/${offer.id}`);
      setExpandedOfferDetail(res.data?.data);
    } catch (err) {
      console.error('Failed to load offer detail:', err);
    }
  };

  const openOfferForm = () => {
    setOfferForm(EMPTY_OFFER);
    setOfferError(null);
    setOfferFormOpen(true);
    loadProducts();
  };

  const updateOfferItem = (index, field, value) => {
    setOfferForm((p) => {
      const items = [...p.items];
      items[index] = { ...items[index], [field]: value };
      return { ...p, items };
    });
  };

  const addOfferItem = () => {
    setOfferForm((p) => ({ ...p, items: [...p.items, { ...EMPTY_OFFER_ITEM }] }));
  };

  const removeOfferItem = (index) => {
    setOfferForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
  };

  const submitOffer = async (e) => {
    e.preventDefault();
    setOfferError(null);

    const cleanItems = offerForm.items.filter((it) => it.sku.trim());
    if (cleanItems.length === 0) {
      setOfferError('Add at least one item with a product or SKU.');
      return;
    }
    if (offerForm.sale_price === '' || Number(offerForm.sale_price) < 0) {
      setOfferError('Sale price for the whole offer is required.');
      return;
    }

    setOfferSaving(true);
    try {
      await client.post('/api/admin/pc-offers', {
        items: cleanItems.map((it) => ({
          product_id: it.product_id ? Number(it.product_id) : null,
          sku: it.sku,
          serial_number: it.serial_number || undefined,
        })),
        sale_price: Number(offerForm.sale_price),
        warranty_months: offerForm.warranty_months ? Number(offerForm.warranty_months) : null,
        order_id: offerForm.order_id ? Number(offerForm.order_id) : null,
        notes: offerForm.notes,
      });
      setOfferFormOpen(false);
      setTab('offers');
      setOffersPage(1);
      await fetchOffers();
      fetchInventorySummary();
    } catch (err) {
      console.error('Failed to save PC offer:', err);
      setOfferError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setOfferSaving(false);
    }
  };

  const confirmDeleteOffer = async () => {
    setDeletingOffer(true);
    try {
      await client.delete(`/api/admin/pc-offers/${deleteOfferTarget.id}`);
      setDeleteOfferTarget(null);
      if (expandedOfferId === deleteOfferTarget.id) {
        setExpandedOfferId(null);
        setExpandedOfferDetail(null);
      }
      await fetchOffers();
      fetchInventorySummary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete.');
    } finally {
      setDeletingOffer(false);
    }
  };

  const openInForm = () => {
    setInForm(EMPTY_IN);
    setInError(null);
    setInFormOpen(true);
    loadProducts();
  };

  const submitIn = async (e) => {
    e.preventDefault();
    setInError(null);

    if (!inForm.sku.trim()) {
      setInError('Pick a product or type a SKU.');
      return;
    }
    if (!inForm.quantity || Number(inForm.quantity) <= 0) {
      setInError('Quantity must be a positive number.');
      return;
    }
    if (inForm.cost_price === '' || Number(inForm.cost_price) < 0) {
      setInError('Cost price is required.');
      return;
    }

    setInSaving(true);
    try {
      await client.post('/api/admin/stock-receipts', {
        ...inForm,
        product_id: inForm.product_id ? Number(inForm.product_id) : null,
        quantity: Number(inForm.quantity),
        cost_price: Number(inForm.cost_price),
      });
      setInFormOpen(false);
      setReceiptsPage(1);
      await fetchReceipts();
      fetchInventorySummary();
    } catch (err) {
      console.error('Failed to save stock receipt:', err);
      setInError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setInSaving(false);
    }
  };

  const confirmDeleteReceipt = async () => {
    setDeletingReceipt(true);
    try {
      await client.delete(`/api/admin/stock-receipts/${deleteReceiptTarget.id}`);
      setDeleteReceiptTarget(null);
      await fetchReceipts();
      fetchInventorySummary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete.');
    } finally {
      setDeletingReceipt(false);
    }
  };

  const openOutForm = () => {
    setOutForm(EMPTY_OUT);
    setOutError(null);
    setOutFormOpen(true);
    loadProducts();
    if (tab === 'out-distributor') loadDistributors();
  };

  const submitOut = async (e) => {
    e.preventDefault();
    setOutError(null);

    const isDistributorSale = tab === 'out-distributor';

    if (!outForm.sku.trim()) {
      setOutError('Pick a product or type a SKU.');
      return;
    }
    if (!outForm.serial_number.trim()) {
      setOutError('Serial number is required.');
      return;
    }
    if (outForm.sale_price === '' || Number(outForm.sale_price) < 0) {
      setOutError('Sale price is required.');
      return;
    }
    if (isDistributorSale && !outForm.distributor_id) {
      setOutError('Pick which distributor this sale is to.');
      return;
    }

    setOutSaving(true);
    try {
      await client.post('/api/admin/serials', {
        ...outForm,
        product_id: outForm.product_id ? Number(outForm.product_id) : null,
        warranty_months: outForm.warranty_months ? Number(outForm.warranty_months) : null,
        sale_price: Number(outForm.sale_price),
        order_id: outForm.order_id ? Number(outForm.order_id) : null,
        distributor_id: isDistributorSale && outForm.distributor_id ? Number(outForm.distributor_id) : null,
      });
      setOutFormOpen(false);
      setSalesPage(1);
      await fetchSales();
      fetchInventorySummary();
    } catch (err) {
      console.error('Failed to save sale:', err);
      setOutError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setOutSaving(false);
    }
  };

  const confirmDeleteSale = async () => {
    setDeletingSale(true);
    try {
      await client.delete(`/api/admin/serials/${deleteSaleTarget.serial_number}`);
      setDeleteSaleTarget(null);
      await fetchSales();
      fetchInventorySummary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete.');
    } finally {
      setDeletingSale(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  if (!canView) {
    return <p className="text-center text-slate-500 dark:text-slate-400 py-20">You don't have permission to view this.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
        <ScanBarcode className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Inventory & Warranty
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Log stock as it comes in, and capture each unit's serial number and warranty at the moment it sells.
      </p>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-colors ${
                tab === t.key
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white dark:bg-[#161b22] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-500/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'in' && (
        <div>
          {inventorySummaryLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-6">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading stock summary...
            </div>
          ) : (
            inventorySummary.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Remaining Stock by SKU
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">
                Computed live — total received minus everything sold (including PC Offer items). Not a stored
                counter, so it can never drift out of sync with the two logs below.
              </p>
              <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">SKU / Product</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Received</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Sold</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventorySummary.map((row) => (
                        <tr key={row.sku} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 dark:text-white">{row.product_name || row.sku}</span>
                            {row.product_name && <span className="block text-[10px] text-slate-400 font-mono">{row.sku}</span>}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.total_received}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.total_sold}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span
                              className={`font-mono font-bold ${
                                row.remaining <= 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : row.remaining <= 2
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {row.remaining}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            )
          )}

          <div className="flex justify-between items-center gap-2 mb-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSourceSearch(sourceSearchInput.trim());
              }}
              className="flex gap-2 flex-1 max-w-md"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={sourceSearchInput}
                  onChange={(e) => setSourceSearchInput(e.target.value)}
                  placeholder="Search by source (e.g. supplier name)..."
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
              <button
                onClick={openInForm}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" /> Log Stock In
              </button>
            )}
          </div>

          {receiptsLoading ? (
            <div className="flex items-center justify-center py-20 text-indigo-600 dark:text-indigo-400 gap-2 text-sm font-medium">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading...
            </div>
          ) : receiptsError ? (
            <p className="text-center text-red-500 py-20">{receiptsError}</p>
          ) : receipts.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-20">
              {sourceSearch ? `No stock received from "${sourceSearch}".` : 'No stock received yet.'}
            </p>
          ) : (
            <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">SKU / Product</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Qty</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Cost / Unit</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Source</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Notes</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Received</th>
                      {canManage && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 dark:text-white">{r.product_name || r.sku}</span>
                          {r.product_name && <span className="block text-[10px] text-slate-400 font-mono">{r.sku}</span>}
                          {!r.product_name && (
                            <span className="inline-block text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-full mt-0.5">
                              not listed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{r.quantity}</td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">${Number(r.cost_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[160px] truncate">{r.source || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{r.notes || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(r.received_at).toLocaleDateString()}
                        </td>
                        {canManage && (
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => setDeleteReceiptTarget(r)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {receiptsPagination && receiptsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Page {receiptsPagination.page} of {receiptsPagination.totalPages} · {receiptsPagination.total} total
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setReceiptsPage((p) => Math.max(1, p - 1))}
                      disabled={receiptsPagination.page <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setReceiptsPage((p) => Math.min(receiptsPagination.totalPages, p + 1))}
                      disabled={receiptsPagination.page >= receiptsPagination.totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(tab === 'out-client' || tab === 'out-distributor') && (
        <div>
          <div className="flex justify-between items-center gap-2 mb-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Look up a serial number..."
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
                  onClick={openOutForm}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  <Plus className="w-4 h-4" /> {tab === 'out-distributor' ? 'Record Distributor Sale' : 'Record Sale'}
                </button>
                {tab === 'out-client' && (
                  <button
                    onClick={openOfferForm}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                  >
                    <Package className="w-4 h-4" /> Record PC Offer
                  </button>
                )}
              </div>
            )}
          </div>

          {salesLoading ? (
            <div className="flex items-center justify-center py-20 text-indigo-600 dark:text-indigo-400 gap-2 text-sm font-medium">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading...
            </div>
          ) : salesError ? (
            <p className="text-center text-red-500 py-20">{salesError}</p>
          ) : sales.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-20">
              {search
                ? `No results for "${search}".`
                : tab === 'out-distributor'
                ? 'No distributor sales recorded yet.'
                : 'No client sales recorded yet.'}
            </p>
          ) : (
            <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Serial</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">SKU / Product</th>
                      {tab === 'out-distributor' && (
                        <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Distributor</th>
                      )}
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Sale Price</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Warranty</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Sold</th>
                      {canManage && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s) => {
                      const isUnderWarranty = s.warranty_expires_at && new Date(s.warranty_expires_at) > new Date();
                      return (
                        <tr key={s.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">{s.serial_number}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {s.product_name || s.sku}
                            <span className="block text-[10px] text-slate-400 font-mono">{s.sku}</span>
                          </td>
                          {tab === 'out-distributor' && (
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {s.distributor_name || '—'}
                            </td>
                          )}
                          <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">${Number(s.sale_price).toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {s.warranty_months ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  isUnderWarranty
                                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                                    : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                                }`}
                              >
                                {isUnderWarranty ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                {s.warranty_months}mo
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                            {s.order_id && <span className="block text-[10px] text-slate-400 mt-0.5">Order #{s.order_id}</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(s.sold_at).toLocaleDateString()}
                          </td>
                          {canManage && (
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => setDeleteSaleTarget(s)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {salesPagination && salesPagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Page {salesPagination.page} of {salesPagination.totalPages} · {salesPagination.total} total
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                      disabled={salesPagination.page <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSalesPage((p) => Math.min(salesPagination.totalPages, p + 1))}
                      disabled={salesPagination.page >= salesPagination.totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'offers' && (
        <div>
          {offersLoading ? (
            <div className="flex items-center justify-center py-20 text-indigo-600 dark:text-indigo-400 gap-2 text-sm font-medium">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading...
            </div>
          ) : offersError ? (
            <p className="text-center text-red-500 py-20">{offersError}</p>
          ) : offers.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-20">
              No PC offers recorded yet. Use "Record PC Offer" from the Sales & Warranty tab.
            </p>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => {
                const isExpanded = expandedOfferId === offer.id;
                return (
                  <div
                    key={offer.id}
                    className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm"
                  >
                    <button
                      onClick={() => toggleExpandOffer(offer)}
                      className="w-full flex items-center justify-between gap-4 p-4 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            PC Offer #{offer.id} · {offer.item_count} item{offer.item_count !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {new Date(offer.sold_at).toLocaleDateString()}
                            {offer.order_id && ` · Order #${offer.order_id}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          ${Number(offer.sale_price).toFixed(2)}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-[#0d1117]/50">
                        {!expandedOfferDetail ? (
                          <div className="flex items-center justify-center py-4 text-indigo-600 dark:text-indigo-400 gap-2 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                          </div>
                        ) : (
                          <>
                            {expandedOfferDetail.notes && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">{expandedOfferDetail.notes}</p>
                            )}
                            <div className="space-y-1.5">
                              {expandedOfferDetail.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                  <span className="text-slate-700 dark:text-slate-300">
                                    {item.product_name || item.sku}
                                    {item.serial_number && (
                                      <span className="ml-2 font-mono text-xs text-slate-400">{item.serial_number}</span>
                                    )}
                                  </span>
                                  {item.warranty_months && (
                                    <span className="text-[11px] text-slate-400">{item.warranty_months}mo warranty</span>
                                  )}
                                </div>
                              ))}
                            </div>
                            {canManage && (
                              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                                <button
                                  onClick={() => setDeleteOfferTarget(offer)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete Offer
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {offersPagination && offersPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Page {offersPagination.page} of {offersPagination.totalPages} · {offersPagination.total} total
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setOffersPage((p) => Math.max(1, p - 1))}
                      disabled={offersPagination.page <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setOffersPage((p) => Math.min(offersPagination.totalPages, p + 1))}
                      disabled={offersPagination.page >= offersPagination.totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {inFormOpen && (
        <Modal title="Log Stock In" onClose={() => !inSaving && setInFormOpen(false)}>
          <form onSubmit={submitIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Product</label>
              <ProductOrSkuPicker
                products={products}
                productId={inForm.product_id}
                sku={inForm.sku}
                onProductChange={(id, sku) => setInForm((p) => ({ ...p, product_id: id, sku }))}
                onSkuChange={(sku) => setInForm((p) => ({ ...p, sku }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={inForm.quantity}
                  onChange={(e) => setInForm((p) => ({ ...p, quantity: e.target.value }))}
                  placeholder="e.g. 10"
                  className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Cost Price (per unit)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={inForm.cost_price}
                  onChange={(e) => setInForm((p) => ({ ...p, cost_price: e.target.value }))}
                  placeholder="e.g. 60.50"
                  className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Source (optional)</label>
              <input
                type="text"
                value={inForm.source}
                onChange={(e) => setInForm((p) => ({ ...p, source: e.target.value }))}
                placeholder="e.g. AliExpress, Local Distributor X"
                className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Notes (optional)</label>
              <textarea
                rows={2}
                value={inForm.notes}
                onChange={(e) => setInForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. supplier, batch number"
                className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {inError && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3">
                {inError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInFormOpen(false)}
                disabled={inSaving}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-60"
              >
                {inSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Log Stock In
              </button>
            </div>
          </form>
        </Modal>
      )}

      {outFormOpen && (
        <Modal title={tab === 'out-distributor' ? 'Record a Distributor Sale' : 'Record a Sale'} onClose={() => !outSaving && setOutFormOpen(false)}>
          <form onSubmit={submitOut} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Product</label>
              <ProductOrSkuPicker
                products={products}
                productId={outForm.product_id}
                sku={outForm.sku}
                onProductChange={(id, sku) => setOutForm((p) => ({ ...p, product_id: id, sku }))}
                onSkuChange={(sku) => setOutForm((p) => ({ ...p, sku }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Serial Number</label>
              <input
                type="text"
                value={outForm.serial_number}
                onChange={(e) => setOutForm((p) => ({ ...p, serial_number: e.target.value }))}
                placeholder="e.g. SN-ABC123456"
                className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Warranty (months)</label>
                <input
                  type="number"
                  min="0"
                  value={outForm.warranty_months}
                  onChange={(e) => setOutForm((p) => ({ ...p, warranty_months: e.target.value }))}
                  placeholder="e.g. 12"
                  className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Sale Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={outForm.sale_price}
                  onChange={(e) => setOutForm((p) => ({ ...p, sale_price: e.target.value }))}
                  placeholder="e.g. 129.99"
                  className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Order ID (optional)</label>
              <input
                type="number"
                value={outForm.order_id}
                onChange={(e) => setOutForm((p) => ({ ...p, order_id: e.target.value }))}
                placeholder="Link to a checkout order, if any"
                className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Notes (optional)</label>
              <textarea
                rows={2}
                value={outForm.notes}
                onChange={(e) => setOutForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. buyer name/phone if sold in person"
                className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {tab === 'out-distributor' && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Distributor</label>
                <select
                  value={outForm.distributor_id || ''}
                  onChange={(e) => setOutForm((p) => ({ ...p, distributor_id: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select distributor</option>
                  {distributors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {distributors.length === 0 && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                    No distributors registered yet — add one under "Distributor Profiles" first.
                  </p>
                )}
              </div>
            )}

            {outError && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3">
                {outError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOutFormOpen(false)}
                disabled={outSaving}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={outSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-60"
              >
                {outSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {tab === 'out-distributor' ? 'Record Distributor Sale' : 'Record Sale'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {offerFormOpen && (
        <Modal title="Record a PC Offer" onClose={() => !offerSaving && setOfferFormOpen(false)} maxWidth="max-w-2xl">
          <form onSubmit={submitOffer} className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add every item in the build — a serial number is optional per item (not every peripheral has one). One
              combined price covers the whole offer below.
            </p>

            <div className="space-y-3">
              {offerForm.items.map((item, index) => (
                <div
                  key={index}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2 relative"
                >
                  {offerForm.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOfferItem(index)}
                      className="absolute top-2 right-2 p-1 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    Item {index + 1}
                  </p>
                  <ProductOrSkuPicker
                    products={products}
                    productId={item.product_id}
                    sku={item.sku}
                    onProductChange={(id, sku) => {
                      updateOfferItem(index, 'product_id', id);
                      updateOfferItem(index, 'sku', sku);
                    }}
                    onSkuChange={(sku) => updateOfferItem(index, 'sku', sku)}
                  />
                  <input
                    type="text"
                    value={item.serial_number}
                    onChange={(e) => updateOfferItem(index, 'serial_number', e.target.value)}
                    placeholder="Serial number (optional)"
                    className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addOfferItem}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Item
            </button>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Warranty (months)
                </label>
                <input
                  type="number"
                  min="0"
                  value={offerForm.warranty_months}
                  onChange={(e) => setOfferForm((p) => ({ ...p, warranty_months: e.target.value }))}
                  placeholder="e.g. 12"
                  className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Total Sale Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={offerForm.sale_price}
                  onChange={(e) => setOfferForm((p) => ({ ...p, sale_price: e.target.value }))}
                  placeholder="e.g. 1499.99"
                  className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Order ID (optional)</label>
              <input
                type="number"
                value={offerForm.order_id}
                onChange={(e) => setOfferForm((p) => ({ ...p, order_id: e.target.value }))}
                placeholder="Link to a checkout order, if any"
                className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Notes (optional)</label>
              <textarea
                rows={2}
                value={offerForm.notes}
                onChange={(e) => setOfferForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. buyer name/phone, build description"
                className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {offerError && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3">
                {offerError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOfferFormOpen(false)}
                disabled={offerSaving}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={offerSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-60"
              >
                {offerSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Record PC Offer
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteReceiptTarget && (
        <ConfirmDialog
          title="Delete this stock receipt?"
          message="This can't be undone."
          confirmLabel="Delete"
          busy={deletingReceipt}
          onConfirm={confirmDeleteReceipt}
          onCancel={() => setDeleteReceiptTarget(null)}
        />
      )}

      {deleteSaleTarget && (
        <ConfirmDialog
          title={`Delete sale record "${deleteSaleTarget.serial_number}"?`}
          message="This removes its warranty record entirely. This can't be undone."
          confirmLabel="Delete"
          busy={deletingSale}
          onConfirm={confirmDeleteSale}
          onCancel={() => setDeleteSaleTarget(null)}
        />
      )}

      {deleteOfferTarget && (
        <ConfirmDialog
          title={`Delete PC Offer #${deleteOfferTarget.id}?`}
          message="This deletes the offer and all of its items, including any serial numbers recorded for them. This can't be undone."
          confirmLabel="Delete"
          busy={deletingOffer}
          onConfirm={confirmDeleteOffer}
          onCancel={() => setDeleteOfferTarget(null)}
        />
      )}
    </div>
  );
}
