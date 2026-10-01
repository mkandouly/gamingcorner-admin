// src/pages/AdminAccountsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Sparkles,
} from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

function PermissionCheckboxes({ groups, value, onChange }) {
  const toggle = (key) => {
    onChange({ ...value, [key]: !value[key] });
  };

  const toggleGroup = (group, allOn) => {
    const next = { ...value };
    for (const p of group.permissions) next[p.key] = !allOn;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const allOn = group.permissions.every((p) => value[p.key]);
        return (
          <div key={group.key} className="border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{group.label}</span>
              <button
                type="button"
                onClick={() => toggleGroup(group, allOn)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {allOn ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {group.permissions.map((p) => (
                <label key={p.key} className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer py-0.5">
                  <input
                    type="checkbox"
                    checked={Boolean(value[p.key])}
                    onChange={() => toggle(p.key)}
                    className="w-3.5 h-3.5 rounded accent-indigo-600"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'admin',
  permissions: {},
};

export default function AdminAccountsPage() {
  const { admin: currentAdmin } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [passwordTarget, setPasswordTarget] = useState(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, permsRes] = await Promise.all([
        client.get('/api/admin/accounts'),
        client.get('/api/admin/accounts/permissions'),
      ]);
      setAccounts(accountsRes.data?.data || []);
      setPermissionGroups(permsRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load admin accounts:', err);
      setError(err.response?.data?.message || 'Failed to load admin accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setEditingAccount(null);
    setFormData(emptyForm);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      email: account.email,
      password: '',
      role: account.role,
      permissions: account.permissions || {},
      is_active: account.is_active,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    if (!editingAccount && (!formData.password || formData.password.length < 8)) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    try {
      if (editingAccount) {
        await client.put(`/api/admin/accounts/${editingAccount.id}`, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          permissions: formData.permissions,
          is_active: formData.is_active,
        });
      } else {
        await client.post('/api/admin/accounts', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          permissions: formData.permissions,
        });
      }

      setFormOpen(false);
      await fetchAll();
    } catch (err) {
      console.error('Failed to save account:', err);
      setFormError(err.response?.data?.message || 'Failed to save account.');
    } finally {
      setSaving(false);
    }
  };

  const submitPasswordReset = async (e) => {
    e.preventDefault();
    setPasswordError(null);

    if (!passwordValue || passwordValue.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    setResettingPassword(true);
    try {
      await client.put(`/api/admin/accounts/${passwordTarget.id}/password`, { password: passwordValue });
      setPasswordTarget(null);
      setPasswordValue('');
    } catch (err) {
      console.error('Failed to reset password:', err);
      setPasswordError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await client.delete(`/api/admin/accounts/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchAll();
    } catch (err) {
      console.error('Failed to delete account:', err);
      alert(err.response?.data?.message || 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Accounts</h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <Plus className="w-4 h-4" /> New Account
        </button>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Root accounts have full access to everything. Admin accounts only get the permissions you grant below.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-indigo-600 dark:text-indigo-400 gap-2 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading...
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-20">{error}</p>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => {
            const isSelf = account.id === currentAdmin?.id;
            const permCount = Object.values(account.permissions || {}).filter(Boolean).length;

            return (
              <div
                key={account.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      account.role === 'root'
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {account.role === 'root' ? <Crown className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{account.name}</p>
                      {isSelf && <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">(you)</span>}
                      {account.is_seed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.5 rounded-full">
                          <Sparkles className="w-2.5 h-2.5" /> seed account
                        </span>
                      )}
                      {!account.is_active && (
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-full">
                          deactivated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {account.email} · {account.role === 'root' ? 'Full access' : `${permCount} permission${permCount !== 1 ? 's' : ''} granted`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => openEdit(account)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setPasswordTarget(account);
                      setPasswordValue('');
                      setPasswordError(null);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                    title="Reset password"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                  {!isSelf && (
                    <button
                      onClick={() => setDeleteTarget(account)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit form */}
      {formOpen && (
        <Modal
          title={editingAccount ? `Edit ${editingAccount.name}` : 'New Admin Account'}
          onClose={() => !saving && setFormOpen(false)}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {!editingAccount && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  placeholder="At least 8 characters"
                  className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Role</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, role: 'admin' }))}
                  className={`flex-1 text-xs font-semibold px-3.5 py-2.5 rounded-xl border transition-colors ${
                    formData.role === 'admin'
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white dark:bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Admin (limited by permissions below)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, role: 'root' }))}
                  className={`flex-1 text-xs font-semibold px-3.5 py-2.5 rounded-xl border transition-colors ${
                    formData.role === 'root'
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-white dark:bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Root (full access)
                </button>
              </div>
              {formData.role === 'root' && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Root accounts bypass all permission checks — grant this only to
                  someone fully trusted.
                </p>
              )}
            </div>

            {formData.role === 'admin' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Permissions</label>
                <PermissionCheckboxes
                  groups={permissionGroups}
                  value={formData.permissions}
                  onChange={(next) => setFormData((p) => ({ ...p, permissions: next }))}
                />
              </div>
            )}

            {editingAccount && (
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.is_active)}
                  onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">Account is active</span>
              </label>
            )}

            {formError && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
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
                {editingAccount ? 'Save Changes' : 'Create Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Password reset */}
      {passwordTarget && (
        <Modal title={`Reset password for ${passwordTarget.name}`} onClose={() => !resettingPassword && setPasswordTarget(null)}>
          <form onSubmit={submitPasswordReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">New Password</label>
              <input
                type="password"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            {passwordError && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3">
                {passwordError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPasswordTarget(null)}
                disabled={resettingPassword}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resettingPassword}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-60"
              >
                {resettingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Reset Password
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete ${deleteTarget.name}?`}
          message="This account will lose access immediately. This can't be undone."
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
