// src/pages/CategoriesPage.jsx
import React from 'react';
import CrudManager from '../components/crud/CrudManager';

export default function CategoriesPage() {
  return (
    <CrudManager
      title="Categories"
      permissionPrefix="categories"
      apiPath="/api/admin/categories"
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'slug', label: 'Slug' },
        { key: 'is_hot', label: 'Hot', render: (row) => (row.is_hot ? '🔥 Yes' : 'No') },
      ]}
      fields={[
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'slug', label: 'Slug', type: 'text', required: true, placeholder: 'e.g. peripherals' },
        {
          name: 'is_hot',
          label: 'Hot',
          type: 'checkbox',
          checkboxLabel: 'Show a "HOT" badge on this category in the header nav',
        },
      ]}
    />
  );
}
