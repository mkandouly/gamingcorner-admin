// src/pages/OrdersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ChefHat,
  Truck,
  PackageCheck,
  XCircle,
  Save,
} from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_META = {
  pending: { label: 'Pending', icon: ClipboardList, className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
  in_preparation: { label: 'In Preparation', icon: ChefHat, className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
  out_for_delivery: { label: 'Out for Delivery', icon: Truck, className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' },
  delivered: { label: 'Delivered', icon: PackageCheck, className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' },
};

const NEXT_STATUS = { pending: 'in_preparation', in_preparation: 'out_for_delivery', out_for_delivery: 'delivered' };
const NEXT_LABEL = {
  pending: 'Start Preparing',
  in_preparation: 'Send Out for Delivery',
  out_for_delivery: 'Mark Delivered',
};
const CANCELLABLE = new Set(['pending', 'in_preparation', 'out_for_delivery']);
const FILTERS = ['all', 'pending', 'in_preparation', 'out_for_delivery', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('orders.view');
  const canUpdateStatus = hasPermission('orders.update_status');
  const canSetDeliveryPrice = hasPermission('orders.set_delivery_price');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [deliveryDrafts, setDeliveryDrafts] = useState({});
  const [busyOrderId, setBusyOrderId] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 20 };
      if (filter !== 'all') params.status = filter;
      const res = await client.get('/api/admin/orders', { params });
      setOrders(res.data?.data || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError(err.response?.data?.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    if (canView) fetchOrders();
  }, [canView, fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const toggleExpand = async (order) => {
    if (expandedId === order.id) {
      setExpandedId(null);
      setExpandedOrder(null);
      return;
    }
    setExpandedId(order.id);
    try {
      const res = await client.get(`/api/admin/orders/${order.id}`);
      setExpandedOrder(res.data?.data);
    } catch (err) {
      console.error('Failed to load order detail:', err);
    }
  };

  const refreshExpanded = async (id) => {
    const res = await client.get(`/api/admin/orders/${id}`);
    setExpandedOrder(res.data?.data);
  };

  const updateStatus = async (order, status) => {
    setBusyOrderId(order.id);
    try {
      await client.patch(`/api/admin/orders/${order.id}/status`, { status });
      await fetchOrders();
      if (expandedId === order.id) await refreshExpanded(order.id);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.message || 'Failed to update order status.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const saveDeliveryPrice = async (order) => {
    const draft = deliveryDrafts[order.id];
    const price = Number(draft);
    if (draft === undefined || Number.isNaN(price) || price < 0) return;

    setBusyOrderId(order.id);
    try {
      await client.patch(`/api/admin/orders/${order.id}/delivery-price`, { delivery_price: price });
      await fetchOrders();
      if (expandedId === order.id) await refreshExpanded(order.id);
    } catch (err) {
      console.error('Failed to set delivery price:', err);
      alert(err.response?.data?.message || 'Failed to set delivery price.');
    } finally {
      setBusyOrderId(null);
    }
  };

  if (!canView) {
    return <p className="text-center text-slate-500 dark:text-slate-400 py-20">You don't have permission to view orders.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Orders</h1>
        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#161b22] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl border transition-colors capitalize ${
              filter === f
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white dark:bg-[#161b22] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-500/40'
            }`}
          >
            {f === 'all' ? 'All' : STATUS_META[f]?.label || f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-indigo-600 dark:text-indigo-400 gap-2 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading orders...
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-20">{error}</p>
      ) : orders.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400 py-20">No orders found.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const meta = STATUS_META[order.status] || STATUS_META.pending;
            const StatusIcon = meta.icon;
            const isExpanded = expandedId === order.id;
            const isBusy = busyOrderId === order.id;
            const nextStatus = NEXT_STATUS[order.status];
            const canCancel = CANCELLABLE.has(order.status);

            return (
              <div key={order.id} className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                <button onClick={() => toggleExpand(order)} className="w-full flex items-center justify-between gap-4 p-4 text-left">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">#{order.id}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {order.first_name} {order.last_name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {order.item_count} item{order.item_count !== '1' ? 's' : ''} · ${Number(order.total).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.className}`}>
                      <StatusIcon className="w-3 h-3" /> {meta.label}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4 bg-slate-50/50 dark:bg-[#0d1117]/50">
                    {!expandedOrder ? (
                      <div className="flex items-center justify-center py-6 text-indigo-600 dark:text-indigo-400 gap-2 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading details...
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Contact</p>
                            <p className="text-slate-700 dark:text-slate-300">
                              {expandedOrder.phone_country_code} {expandedOrder.phone_number}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Address</p>
                            <p className="text-slate-700 dark:text-slate-300">
                              {expandedOrder.address_line}, {expandedOrder.area}, {expandedOrder.city}, {expandedOrder.governorate}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">Items</p>
                          <div className="space-y-1.5">
                            {(expandedOrder.items || []).map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-sm">
                                <span className="text-slate-700 dark:text-slate-300">
                                  {item.product_name} <span className="text-slate-400">× {item.quantity}</span>
                                </span>
                                <span className="font-mono text-slate-900 dark:text-white">${Number(item.line_total).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-end justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <div>
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Delivery Price</p>
                            {canSetDeliveryPrice ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500 dark:text-slate-400">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder={expandedOrder.delivery_price != null ? Number(expandedOrder.delivery_price).toFixed(2) : 'Not set'}
                                  value={deliveryDrafts[order.id] ?? ''}
                                  onChange={(e) => setDeliveryDrafts((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                  className="w-28 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                  onClick={() => saveDeliveryPrice(order)}
                                  disabled={isBusy || deliveryDrafts[order.id] === undefined}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-40 transition-opacity"
                                >
                                  <Save className="w-3 h-3" /> Save
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {expandedOrder.delivery_price != null ? `$${Number(expandedOrder.delivery_price).toFixed(2)}` : 'Not set'}
                              </p>
                            )}
                          </div>

                          {canUpdateStatus && (
                            <div className="flex items-center gap-2">
                              {canCancel && (
                                <button
                                  onClick={() => updateStatus(order, 'cancelled')}
                                  disabled={isBusy}
                                  className="text-xs font-semibold px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                                >
                                  Cancel Order
                                </button>
                              )}
                              {nextStatus && (
                                <button
                                  onClick={() => updateStatus(order, nextStatus)}
                                  disabled={isBusy}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
                                >
                                  {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                  {NEXT_LABEL[order.status]}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
