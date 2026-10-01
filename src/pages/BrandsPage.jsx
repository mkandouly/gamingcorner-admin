// src/pages/BrandsPage.jsx
import React from 'react';
import CrudManager, { resolveImg } from '../components/crud/CrudManager';

export default function BrandsPage() {
  return (
    <CrudManager
      title="Brands"
      permissionPrefix="brands"
      apiPath="/api/admin/brands"
      columns={[
        {
          key: 'logo_url',
          label: '',
          render: (row) =>
            row.logo_url ? (
              <img src={resolveImg(row.logo_url)} alt="" className="w-10 h-10 rounded-lg object-contain bg-slate-50 dark:bg-slate-800" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
            ),
        },
        { key: 'name', label: 'Name' },
        { key: 'is_featured', label: 'Featured', render: (row) => (row.is_featured ? 'Yes' : 'No') },
        { key: 'is_popular', label: 'Popular', render: (row) => (row.is_popular ? 'Yes' : 'No') },
      ]}
      fields={[
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'logo_url', label: 'Logo', type: 'image' },
        { name: 'is_featured', label: 'Featured', type: 'checkbox', checkboxLabel: 'Show as featured brand' },
        { name: 'is_popular', label: 'Popular', type: 'checkbox', checkboxLabel: 'Show in popular brands / ticker' },
      ]}
    />
  );
}
