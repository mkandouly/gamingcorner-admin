// src/pages/SubscribersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Mail, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function SubscribersPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('subscribers.view');

  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get('/api/admin/subscribers', { params: { page, limit: 20 } });
      setSubscribers(res.data?.data || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      console.error('Failed to load subscribers:', err);
      setError(err.response?.data?.message || 'Failed to load subscribers.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (canView) fetchSubscribers();
  }, [canView, fetchSubscribers]);

  if (!canView) {
    return <p className="text-center text-slate-500 dark:text-slate-400 py-20">You don't have permission to view subscribers.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Newsletter Subscribers</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-indigo-600 dark:text-indigo-400 gap-2 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading...
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-20">{error}</p>
      ) : subscribers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-700" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">No subscribers yet.</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
            {subscribers.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">{s.email}</span>
                {s.created_at && (
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>

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
        </>
      )}
    </div>
  );
}
