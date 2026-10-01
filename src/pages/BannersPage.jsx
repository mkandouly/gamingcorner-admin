// src/pages/BannersPage.jsx
import React from 'react';
import CrudManager, { resolveImg } from '../components/crud/CrudManager';

export default function BannersPage() {
  return (
    <CrudManager
      title="Banners"
      permissionPrefix="banners"
      apiPath="/api/admin/banners"
      columns={[
        {
          key: 'image_url',
          label: '',
          render: (row) =>
            row.image_url ? (
              <img src={resolveImg(row.image_url)} alt="" className="w-16 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
            ),
        },
        { key: 'title', label: 'Title' },
        { key: 'link', label: 'Link' },
        { key: 'is_active', label: 'Active', render: (row) => (row.is_active ? 'Yes' : 'No') },
      ]}
      fields={[
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'image_url', label: 'Banner Image', type: 'image', required: true },
        { name: 'link', label: 'Link (where it goes when clicked)', type: 'text', required: true, placeholder: '/category/peripherals' },
        { name: 'is_active', label: 'Active', type: 'checkbox', checkboxLabel: 'Show this banner on the storefront' },
      ]}
    />
  );
}
