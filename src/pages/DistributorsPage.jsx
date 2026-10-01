// src/pages/DistributorsPage.jsx
import React from 'react';
import CrudManager from '../components/crud/CrudManager';

export default function DistributorsPage() {
  return (
    <CrudManager
      title="Distributor Profiles"
      permissionPrefix="distributors"
      apiPath="/api/admin/distributors"
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'contact_person', label: 'Contact' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
      ]}
      fields={[
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'contact_person', label: 'Contact Person', type: 'text' },
        { name: 'phone', label: 'Phone', type: 'text' },
        { name: 'email', label: 'Email', type: 'text' },
        { name: 'address', label: 'Address', type: 'textarea' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
    />
  );
}
