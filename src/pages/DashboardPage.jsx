// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ClipboardList, BadgePercent, FolderTree, Loader2, Clock } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

function StatCard({ icon: Icon, label, value, loading, to, tint }) {
  const content = (
    <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm hover:border-indigo-500/40 transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${tint}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" /> : value}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { admin, hasPermission } = useAuth();

  const [productCount, setProductCount] = useState(null);
  const [categoryCount, setCategoryCount] = useState(null);
  const [pendingOrders, setPendingOrders] = useState(null);
  const [totalOrders, setTotalOrders] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const calls = [];

        if (hasPermission('products.view')) {
          calls.push(client.get('/api/admin/products').then((r) => setProductCount((r.data?.data || []).length)));
        }
        if (hasPermission('categories.view')) {
          calls.push(client.get('/api/admin/categories').then((r) => setCategoryCount((r.data?.data || []).length)));
        }
        if (hasPermission('orders.view')) {
          calls.push(client.get('/api/admin/orders').then((r) => setTotalOrders((r.data?.data || []).length)));
          calls.push(
            client
              .get('/api/admin/orders', { params: { status: 'pending' } })
              .then((r) => setPendingOrders((r.data?.data || []).length))
          );
        }

        await Promise.all(calls);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
        Welcome back{admin?.name ? `, ${admin.name.split(' ')[0]}` : ''}
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Here's what's going on in your store.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {hasPermission('orders.view') && (
          <StatCard icon={Clock} label="Pending Orders" value={pendingOrders ?? '—'} loading={loading} to="/orders" tint="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" />
        )}
        {hasPermission('orders.view') && (
          <StatCard icon={ClipboardList} label="Total Orders" value={totalOrders ?? '—'} loading={loading} to="/orders" tint="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
        )}
        {hasPermission('products.view') && (
          <StatCard icon={Package} label="Products" value={productCount ?? '—'} loading={loading} to="/products" tint="bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400" />
        )}
        {hasPermission('categories.view') && (
          <StatCard icon={FolderTree} label="Categories" value={categoryCount ?? '—'} loading={loading} to="/categories" tint="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        )}
      </div>

      {!hasPermission('orders.view') && !hasPermission('products.view') && !hasPermission('categories.view') && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <BadgePercent className="w-10 h-10 text-slate-300 dark:text-slate-700" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            You don't have view access to any dashboard sections yet.
          </p>
        </div>
      )}
    </div>
  );
}
