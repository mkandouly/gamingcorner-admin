// src/pages/SubcategoriesPage.jsx
import React from 'react';
import CrudManager from '../components/crud/CrudManager';

export default function SubcategoriesPage() {
  return (
    <CrudManager
      title="Subcategories"
      permissionPrefix="subcategories"
      apiPath="/api/admin/subcategories"
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'slug', label: 'Slug' },
        { key: 'parent_id', label: 'Parent Category ID' },
        { key: 'is_featured', label: 'Featured', render: (row) => (row.is_featured ? 'Yes' : 'No') },
      ]}
      fields={[
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'slug', label: 'Slug', type: 'text', required: true, placeholder: 'e.g. keyboards' },
        {
          name: 'parent_id',
          label: 'Parent Category',
          type: 'select',
          required: true,
          numeric: true,
          optionsEndpoint: '/api/admin/categories',
          optionLabel: 'name',
          optionValue: 'id',
        },
        { name: 'is_featured', label: 'Featured', type: 'checkbox', checkboxLabel: 'Show in featured subcategories' },
      ]}
    />
  );
}
