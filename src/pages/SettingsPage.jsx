// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { Loader2, Save, Plus, Trash2, Settings as SettingsIcon } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('settings.view');
  const canEdit = hasPermission('settings.edit');

  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [addingNew, setAddingNew] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get('/api/admin/settings');
      setSettings(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err.response?.data?.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const saveKey = async (key) => {
    const value = drafts[key];
    if (value === undefined) return;

    setSavingKey(key);
    try {
      await client.put(`/api/admin/settings/${key}`, { value });
      await fetchSettings();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      console.error('Failed to save setting:', err);
      alert(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSavingKey(null);
    }
  };

  const addNewSetting = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    setAddingNew(true);
    try {
      await client.put(`/api/admin/settings/${newKey.trim()}`, { value: newValue });
      setNewKey('');
      setNewValue('');
      await fetchSettings();
    } catch (err) {
      console.error('Failed to add setting:', err);
      alert(err.response?.data?.message || 'Failed to add setting.');
    } finally {
      setAddingNew(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`/api/admin/settings/${deleteTarget}`);
      setDeleteTarget(null);
      await fetchSettings();
    } catch (err) {
      console.error('Failed to delete setting:', err);
      alert(err.response?.data?.message || 'Failed to delete setting.');
    } finally {
      setDeleting(false);
    }
  };

  if (!canView) {
    return <p className="text-center text-slate-500 dark:text-slate-400 py-20">You don't have permission to view settings.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Site Settings</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Small pieces of storefront content, like the announcement bar text, edited directly.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-indigo-600 dark:text-indigo-400 gap-2 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading...
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-20">{error}</p>
      ) : (
        <div className="space-y-3">
          {settings.map((s) => {
            const draft = drafts[s.key];
            const hasDraft = draft !== undefined && draft !== s.value;

            return (
              <div key={s.key} className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                  <code className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">{s.key}</code>
                </div>
                <div className="flex items-start gap-2">
                  <textarea
                    rows={2}
                    value={draft ?? s.value ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [s.key]: e.target.value }))}
                    disabled={!canEdit}
                    className="flex-1 bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-colors disabled:opacity-60"
                  />
                  {canEdit && (
                    <>
                      <button
                        onClick={() => saveKey(s.key)}
                        disabled={!hasDraft || savingKey === s.key}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors shrink-0"
                      >
                        {savingKey === s.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s.key)}
                        title="Delete this setting"
                        className="inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {canEdit && (
            <form onSubmit={addNewSetting} className="bg-white dark:bg-[#161b22] border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Add a new setting</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="key (e.g. support_phone)"
                  className="bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="value"
                  className="sm:col-span-1 bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newKey.trim() || addingNew}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-40 transition-colors"
                >
                  {addingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete "${deleteTarget}"?`}
          message="This can't be undone. Any storefront code reading this key will fall back to whatever default it has (or show nothing, if it has none)."
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
