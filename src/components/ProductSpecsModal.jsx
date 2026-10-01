// src/components/ProductSpecsModal.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Save, X } from 'lucide-react';
import client from '../api/client';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';

export default function ProductSpecsModal({ product, onClose }) {
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingId, setEditingId] = useState(null); // null = not editing, 'new' = adding
  const [draftKey, setDraftKey] = useState('');
  const [draftValue, setDraftValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSpecs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get(`/api/admin/products/${product.id}/specifications`);
      setSpecs(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load specifications:', err);
      setError(err.response?.data?.message || 'Failed to load specifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const startAdd = () => {
    setEditingId('new');
    setDraftKey('');
    setDraftValue('');
    setSaveError(null);
  };

  const startEdit = (spec) => {
    setEditingId(spec.id);
    setDraftKey(spec.specification);
    setDraftValue(spec.details);
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSaveError(null);
  };

  const saveDraft = async () => {
    if (!draftKey.trim() || !draftValue.trim()) {
      setSaveError('Both fields are required.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      if (editingId === 'new') {
        await client.post(`/api/admin/products/${product.id}/specifications`, {
          specification: draftKey,
          details: draftValue,
        });
      } else {
        await client.put(`/api/admin/specifications/${editingId}`, {
          specification: draftKey,
          details: draftValue,
        });
      }
      setEditingId(null);
      await fetchSpecs();
    } catch (err) {
      console.error('Failed to save specification:', err);
      setSaveError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await client.delete(`/api/admin/specifications/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchSpecs();
    } catch (err) {
      console.error('Failed to delete specification:', err);
      alert(err.response?.data?.message || 'Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  const rowInputClass =
    'w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500';

  return (
    <Modal title={`Specifications — ${product.name}`} onClose={onClose} maxWidth="max-w-xl">
      {loading ? (
        <div className="flex items-center justify-center py-10 text-indigo-600 dark:text-indigo-400 gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : error ? (
        <p className="text-center text-red-500 text-sm py-10">{error}</p>
      ) : (
        <div className="space-y-2">
          {specs.length === 0 && editingId !== 'new' && (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
              No specifications yet. Add one below.
            </p>
          )}

          {specs.map((spec) =>
            editingId === spec.id ? (
              <div key={spec.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-[#0d1117] rounded-xl">
                <input
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                  placeholder="e.g. Processor"
                  className={rowInputClass}
                />
                <input
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  placeholder="e.g. Intel Core i9-14900K"
                  className={rowInputClass}
                />
                <button
                  onClick={saveDraft}
                  disabled={saving}
                  className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shrink-0"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                </button>
                <button onClick={cancelEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                key={spec.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60"
              >
                <div className="min-w-0 flex-1 flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">{spec.specification}</span>
                  <span className="text-slate-300 dark:text-slate-700">—</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate">{spec.details}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(spec)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(spec)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          )}

          {editingId === 'new' && (
            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-[#0d1117] rounded-xl">
              <input
                autoFocus
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                placeholder="e.g. Processor"
                className={rowInputClass}
              />
              <input
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                placeholder="e.g. Intel Core i9-14900K"
                className={rowInputClass}
              />
              <button
                onClick={saveDraft}
                disabled={saving}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shrink-0"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
              <button onClick={cancelEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {saveError && <p className="text-[11px] text-red-500 px-1">{saveError}</p>}

          {editingId !== 'new' && (
            <button
              onClick={startAdd}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Specification
            </button>
          )}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete "${deleteTarget.specification}"?`}
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Modal>
  );
}
