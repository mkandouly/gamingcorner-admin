// src/pages/ProductsPage.jsx
import React, { useState } from 'react';
import { ListTree } from 'lucide-react';
import CrudManager, { resolveImg } from '../components/crud/CrudManager';
import ProductSpecsModal from '../components/ProductSpecsModal';
import { useAuth } from '../context/AuthContext';

export default function ProductsPage() {
  const { hasPermission } = useAuth();
  const [specsProduct, setSpecsProduct] = useState(null);

  return (
    <>
      <CrudManager
        title="Products"
        permissionPrefix="products"
        apiPath="/api/admin/products"
        columns={[
          {
            key: 'image_url',
            label: '',
            render: (row) =>
              row.image_url ? (
                <img src={resolveImg(row.image_url)} alt="" className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
              ),
          },
          { key: 'name', label: 'Name' },
          { key: 'sku', label: 'SKU' },
          {
            key: 'price',
            label: 'Price',
            render: (row) => (row.sale_price ? `$${row.sale_price} (was $${row.price})` : `$${row.price}`),
          },
          { key: 'category_slug', label: 'Subcategory' },
          {
            key: 'out_of_stock',
            label: 'Stock',
            render: (row) =>
              row.out_of_stock ? (
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">
                  Out of Stock
                </span>
              ) : (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  In Stock
                </span>
              ),
          },
        ]}
        fields={[
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'sku', label: 'SKU', type: 'text', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'price', label: 'Price', type: 'number', step: '0.01', required: true },
          { name: 'sale_price', label: 'Sale Price', type: 'number', step: '0.01' },
          {
            name: 'brand_id',
            label: 'Brand',
            type: 'select',
            required: true,
            numeric: true,
            optionsEndpoint: '/api/admin/brands',
            optionLabel: 'name',
            optionValue: 'id',
          },
          {
            name: 'category_slug',
            label: 'Subcategory',
            type: 'select',
            optionsEndpoint: '/api/admin/subcategories',
            optionLabel: 'name',
            optionValue: 'slug',
          },
          { name: 'image_url', label: 'Main Image', type: 'image' },
          { name: 'images', label: 'Gallery Images', type: 'multi-image' },
          {
            name: 'out_of_stock',
            label: 'Stock',
            type: 'checkbox',
            checkboxLabel: 'Mark as out of stock (hides "Add to Cart" and shows a badge on the storefront)',
          },
        ]}
        extraActions={
          hasPermission('products.edit')
            ? (row) => (
                <button
                  key="specs"
                  onClick={() => setSpecsProduct(row)}
                  title="Manage specifications"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                >
                  <ListTree className="w-3.5 h-3.5" />
                </button>
              )
            : undefined
        }
      />

      {specsProduct && <ProductSpecsModal product={specsProduct} onClose={() => setSpecsProduct(null)} />}
    </>
  );
}
