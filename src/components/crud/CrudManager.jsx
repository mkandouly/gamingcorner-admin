// src/components/crud/CrudManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import client, { API_BASE_URL } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';
import { SingleImageUpload, MultiImageUpload } from '../ImageUploadField';

const PAGE_SIZE = 20;

const resolveImg = (url) => (url?.startsWith('http') ? url : `${API_BASE_URL}${url}`);

function emptyFormFromFields(fields) {
  const obj = {};
  for (const f of fields) {
    if (f.type === 'checkbox') obj[f.name] = false;
    else if (f.type === 'multi-image') obj[f.name] = [];
    else obj[f.name] = '';
  }
  return obj;
}

export default function CrudManager({ title, permissionPrefix, apiPath, idKey = 'id', columns, fields, extraActions }) {
  const { hasPermission } = useAuth();
  const canView = hasPermission(`${permissionPrefix}.view`);
  const canCreate = hasPermission(`${permissionPrefix}.create`);
  const canEdit = hasPermission(`${permissionPrefix}.edit`);
  const canDelete = hasPermission(`${permissionPrefix}.delete`);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [selectOptions, setSelectOptions] = useState({});

  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState(() => emptyFormFromFields(fields));
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get(apiPath, { params: { page, limit: PAGE_SIZE } });
      setRows(res.data?.data || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      console.error(`Failed to load ${title}:`, err);
      setError(err.response?.data?.message || `Failed to load ${title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [apiPath, title, page]);

  useEffect(() => {
    if (canView) fetchRows();
  }, [canView, fetchRows]);

  // Jump back to page 1 whenever a different resource is mounted (e.g.
  // navigating from Products to Categories) so stale page state doesn't
  // carry over.
  useEffect(() => {
    setPage(1);
  }, [apiPath]);

  useEffect(() => {
    if (!loading && rows.length === 0 && page > 1) {
      setPage((p) => p - 1);
    }
  }, [loading, rows.length, page]);

  // Fetch options for any select fields backed by another resource
  // (e.g. a product's brand dropdown pulling from /api/admin/brands).
  useEffect(() => {
    const selectFields = fields.filter((f) => f.type === 'select' && f.optionsEndpoint);
    if (selectFields.length === 0) return;

    let cancelled = false;
    (async () => {
      const results = {};
      for (const f of selectFields) {
        try {
          const res = await client.get(f.optionsEndpoint);
          results[f.name] = res.data?.data || [];
        } catch (err) {
          console.error(`Failed to load options for ${f.name}:`, err);
          results[f.name] = [];
        }
      }
      if (!cancelled) setSelectOptions(results);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateForm = () => {
    setEditingRow(null);
    setFormData(emptyFormFromFields(fields));
    setFormErrors({});
    setSaveError(null);
    setFormOpen(true);
  };

  const openEditForm = (row) => {
    setEditingRow(row);
    const initial = emptyFormFromFields(fields);
    for (const f of fields) {
      if (row[f.name] !== undefined && row[f.name] !== null) {
        initial[f.name] = row[f.name];
      }
    }
    setFormData(initial);
    setFormErrors({});
    setSaveError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
  };

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const errors = {};
    for (const f of fields) {
      if (f.required) {
        const val = formData[f.name];
        const isEmpty = val === '' || val === null || val === undefined;
        if (isEmpty) errors[f.name] = 'Required';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);

    if (!validate()) return;

    setSaving(true);
    try {
      const payload = { ...formData };
      // Coerce numeric fields, since inputs/selects hand back strings.
      for (const f of fields) {
        if ((f.type === 'number' || (f.type === 'select' && f.numeric)) && payload[f.name] !== '') {
          payload[f.name] = Number(payload[f.name]);
        }
        if ((f.type === 'number' || (f.type === 'select' && f.numeric)) && payload[f.name] === '') {
          payload[f.name] = null;
        }
      }

      if (editingRow) {
        await client.put(`${apiPath}/${editingRow[idKey]}`, payload);
      } else {
        await client.post(apiPath, payload);
      }

      setFormOpen(false);
      await fetchRows();
    } catch (err) {
      console.error('Save failed:', err);
      setSaveError(err.response?.data?.message || err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`${apiPath}/${deleteTarget[idKey]}`);
      setDeleteTarget(null);
      await fetchRows();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  const renderField = (f) => {
    const value = formData[f.name];
    const error = formErrors[f.name];

    const baseInputClass = `w-full bg-slate-50 dark:bg-[#0d1117] border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors ${
      error ? 'border-red-400 dark:border-red-500/60' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500'
    }`;

    switch (f.type) {
      case 'textarea':
        return (
          <textarea
            rows={f.rows || 3}
            value={value}
            onChange={(e) => setField(f.name, e.target.value)}
            placeholder={f.placeholder}
            className={baseInputClass}
          />
        );
      case 'checkbox':
        return (
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => setField(f.name, e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">{f.checkboxLabel || 'Enabled'}</span>
          </label>
        );
      case 'select': {
        const options = f.options || selectOptions[f.name] || [];
        return (
          <select value={value} onChange={(e) => setField(f.name, e.target.value)} className={baseInputClass}>
            <option value="">Select {f.label.toLowerCase()}</option>
            {options.map((opt) => (
              <option key={opt[f.optionValue || 'id']} value={opt[f.optionValue || 'id']}>
                {opt[f.optionLabel || 'name']}
              </option>
            ))}
          </select>
        );
      }
      case 'number':
        return (
          <input
            type="number"
            step={f.step || 'any'}
            value={value}
            onChange={(e) => setField(f.name, e.target.value)}
            placeholder={f.placeholder}
            className={baseInputClass}
          />
        );
      case 'image':
        return <SingleImageUpload value={value} onChange={(url) => setField(f.name, url)} />;
      case 'multi-image':
        return <MultiImageUpload value={value} onChange={(urls) => setField(f.name, urls)} />;
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setField(f.name, e.target.value)}
            placeholder={f.placeholder}
            className={baseInputClass}
          />
        );
    }
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-700" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          You don't have permission to view {title.toLowerCase()}.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        {canCreate && (
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-indigo-600 dark:text-indigo-400 gap-2 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading...
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-20">{error}</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-700" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">No {title.toLowerCase()} yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                  {(canEdit || canDelete || extraActions) && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row[idKey]} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                    {(canEdit || canDelete || extraActions) && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {extraActions && extraActions(row)}
                          {canEdit && (
                            <button
                              onClick={() => openEditForm(row)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(row)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
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
      )}

      {formOpen && (
        <Modal title={editingRow ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`} onClose={closeForm}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                {renderField(f)}
                {formErrors[f.name] && <p className="text-[11px] text-red-500 mt-1">{formErrors[f.name]}</p>}
              </div>
            ))}

            {saveError && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3">
                {saveError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeForm}
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
                {editingRow ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete this ${title.slice(0, -1).toLowerCase()}?`}
          message="This can't be undone."
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export { resolveImg };
