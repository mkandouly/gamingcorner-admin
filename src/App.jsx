import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  Tags, 
  ShoppingBag, 
  Award, 
  Image as ImageIcon, 
  Users, 
  Mail, 
  Plus, 
  Trash2, 
  Search,
  Sparkles,
  ChevronRight,
  Loader2,
  Upload,
  CheckCircle2,
  Pencil,
  X
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api/admin';
const SERVER_BASE_URL = 'http://localhost:3000';

export default function App() {
  const [activeTab, setActiveTab] = useState('products');
  const [data, setData] = useState({
    categories: [],
    subcategories: [],
    brands: [],
    products: [],
    banners: [],
    admins: [],
    subscribers: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const navigation = [
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'subcategories', label: 'Subcategories', icon: Tags },
    { id: 'brands', label: 'Brands', icon: Award },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'admins', label: 'Admins', icon: Users },
    { id: 'subscribers', label: 'Subscribers', icon: Mail },
  ];

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const endpoints = ['categories', 'subcategories', 'brands', 'products', 'banners', 'admins', 'subscribers'];
      const responses = await Promise.all(
        endpoints.map(ep => fetch(`${API_BASE_URL}/${ep}`).then(res => res.json()))
      );

      const updatedData = {};
      endpoints.forEach((key, index) => {
        updatedData[key] = responses[index].data || [];
      });

      setData(updatedData);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSaveItem = async (section, item, editingId = null) => {
    try {
      const isEdit = Boolean(editingId);
      const url = isEdit ? `${API_BASE_URL}/${section}/${editingId}` : `${API_BASE_URL}/${section}`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const result = await res.json();

      if (result.success) {
        setData((prev) => {
          if (isEdit) {
            return {
              ...prev,
              [section]: prev[section].map((i) => (i.id === editingId ? result.data : i)),
            };
          }
          return {
            ...prev,
            [section]: [result.data, ...prev[section]],
          };
        });
      }
    } catch (err) {
      console.error(`Failed to save ${section}:`, err);
    }
  };

  const handleDeleteItem = async (section, id) => {
    if (!window.confirm(`Delete record #${id}?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${section}/${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        setData((prev) => ({
          ...prev,
          [section]: prev[section].filter((item) => item.id !== id),
        }));
      }
    } catch (err) {
      console.error(`Failed to delete item ${id} from ${section}:`, err);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0d1117] text-slate-200 font-sans antialiased">
      {/* Sidebar */}
      <aside className="w-64 bg-[#161b22] border-r border-slate-800/80 p-5 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-wide leading-none">Console</h1>
              <span className="text-[11px] text-slate-500 font-medium">Store Management</span>
            </div>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    {item.label}
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3 bg-[#0d1117] rounded-xl border border-slate-800/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700">
            SA
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-white truncate">Super Admin</p>
            <p className="text-[10px] text-slate-500 truncate">admin@system.io</p>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 min-w-0 p-8 overflow-y-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight capitalize">{activeTab}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Manage database records for {activeTab}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 bg-[#161b22] border border-slate-800 text-xs text-white pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
            <span className="text-xs font-mono bg-slate-800/60 text-slate-400 border border-slate-700/50 px-2.5 py-1.5 rounded-lg">
              {data[activeTab]?.length || 0} items
            </span>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-indigo-400 gap-2 text-xs font-medium">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading data...
          </div>
        ) : (
          <>
            {activeTab === 'categories' && (
              <CategoriesTab items={data.categories} onSave={(i, id) => handleSaveItem('categories', i, id)} onDelete={(id) => handleDeleteItem('categories', id)} search={searchTerm} />
            )}
            {activeTab === 'subcategories' && (
              <SubcategoriesTab items={data.subcategories} categories={data.categories} onSave={(i, id) => handleSaveItem('subcategories', i, id)} onDelete={(id) => handleDeleteItem('subcategories', id)} search={searchTerm} />
            )}
            {activeTab === 'brands' && (
              <BrandsTab items={data.brands} onSave={(i, id) => handleSaveItem('brands', i, id)} onDelete={(id) => handleDeleteItem('brands', id)} search={searchTerm} />
            )}
            {activeTab === 'products' && (
              <ProductsTab items={data.products} brands={data.brands} subcategories={data.subcategories} onSave={(i, id) => handleSaveItem('products', i, id)} onDelete={(id) => handleDeleteItem('products', id)} search={searchTerm} />
            )}
            {activeTab === 'banners' && (
              <BannersTab items={data.banners} onSave={(i, id) => handleSaveItem('banners', i, id)} onDelete={(id) => handleDeleteItem('banners', id)} search={searchTerm} />
            )}
            {activeTab === 'admins' && (
              <AdminsTab items={data.admins} onSave={(i, id) => handleSaveItem('admins', i, id)} onDelete={(id) => handleDeleteItem('admins', id)} search={searchTerm} />
            )}
            {activeTab === 'subscribers' && (
              <SubscribersTab items={data.subscribers} onDelete={(id) => handleDeleteItem('subscribers', id)} search={searchTerm} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function CategoriesTab({ items, onSave, onDelete, search }) {
  const [form, setForm] = useState({ name: '', slug: '' });
  const [editingId, setEditingId] = useState(null);

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.slug.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, slug: cat.slug });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ name: '', slug: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.slug) return;
    onSave(form, editingId);
    handleCancel();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <form onSubmit={handleSubmit} className="lg:col-span-4 bg-[#161b22] p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{editingId ? 'Edit Category' : 'New Category'}</h3>
          {editingId && (
            <button type="button" onClick={handleCancel} className="text-slate-500 hover:text-white text-xs flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Name</label>
          <input
            type="text"
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Peripherals"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Slug</label>
          <input
            type="text"
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="peripherals"
          />
        </div>
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
          <Plus className="w-3.5 h-3.5" /> {editingId ? 'Update Category' : 'Save Category'}
        </button>
      </form>

      <div className="lg:col-span-8 bg-[#161b22] rounded-2xl border border-slate-800/80 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0d1117]/50 text-slate-400 border-b border-slate-800/80 font-medium uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Name</th>
              <th className="p-4">Slug</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map((cat) => (
              <tr key={cat.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="p-4 text-slate-500 font-mono text-[11px]">#{cat.id}</td>
                <td className="p-4 font-medium text-white">{cat.name}</td>
                <td className="p-4 text-slate-400 font-mono">{cat.slug}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(cat)} className="text-slate-500 hover:text-indigo-400 p-1 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(cat.id)} className="text-slate-500 hover:text-red-400 p-1 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubcategoriesTab({ items, categories, onSave, onDelete, search }) {
  const [form, setForm] = useState({ name: '', slug: '', parent_id: '', is_featured: false });
  const [editingId, setEditingId] = useState(null);

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (sub) => {
    setEditingId(sub.id);
    setForm({
      name: sub.name,
      slug: sub.slug,
      parent_id: sub.parent_id,
      is_featured: Boolean(sub.is_featured)
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ name: '', slug: '', parent_id: '', is_featured: false });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.parent_id) return;
    onSave({ ...form, parent_id: Number(form.parent_id) }, editingId);
    handleCancel();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <form onSubmit={handleSubmit} className="lg:col-span-4 bg-[#161b22] p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{editingId ? 'Edit Subcategory' : 'New Subcategory'}</h3>
          {editingId && (
            <button type="button" onClick={handleCancel} className="text-slate-500 hover:text-white text-xs flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Parent Category</label>
          <select
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.parent_id}
            onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
          >
            <option value="">Select Parent</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Name</label>
          <input
            type="text"
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Slug</label>
          <input
            type="text"
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="sub_featured"
            checked={form.is_featured}
            onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
            className="rounded border-slate-800 bg-[#0d1117] text-indigo-600 focus:ring-0"
          />
          <label htmlFor="sub_featured" className="text-xs text-slate-300">Featured</label>
        </div>
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
          <Plus className="w-3.5 h-3.5" /> {editingId ? 'Update Subcategory' : 'Save Subcategory'}
        </button>
      </form>

      <div className="lg:col-span-8 bg-[#161b22] rounded-2xl border border-slate-800/80 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0d1117]/50 text-slate-400 border-b border-slate-800/80 font-medium uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Parent Category</th>
              <th className="p-4">Featured</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map((sub) => {
              const parent = categories.find((c) => c.id === sub.parent_id);
              return (
                <tr key={sub.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-4 font-medium text-white">{sub.name}</td>
                  <td className="p-4 text-slate-400 font-mono">{sub.slug}</td>
                  <td className="p-4 text-slate-300">{parent?.name || `#${sub.parent_id}`}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sub.is_featured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800/50 text-slate-500'}`}>
                      {sub.is_featured ? 'Featured' : 'Standard'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(sub)} className="text-slate-500 hover:text-indigo-400 p-1 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(sub.id)} className="text-slate-500 hover:text-red-400 p-1 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BrandsTab({ items, onSave, onDelete, search }) {
  const [form, setForm] = useState({ name: '', logo_url: '', is_featured: false });
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (brand) => {
    setEditingId(brand.id);
    setForm({
      name: brand.name,
      logo_url: brand.logo_url,
      is_featured: Boolean(brand.is_featured)
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ name: '', logo_url: '', is_featured: false });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/upload/single`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({ ...prev, logo_url: data.imageUrl }));
      }
    } catch (err) {
      console.error('Failed to upload brand logo:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.logo_url) return;
    onSave(form, editingId);
    handleCancel();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <form onSubmit={handleSubmit} className="lg:col-span-4 bg-[#161b22] p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{editingId ? 'Edit Brand' : 'New Brand'}</h3>
          {editingId && (
            <button type="button" onClick={handleCancel} className="text-slate-500 hover:text-white text-xs flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Brand Name</label>
          <input
            type="text"
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Brand Logo</label>
          <div className="relative border-2 border-dashed border-slate-800 rounded-xl p-3 text-center bg-[#0d1117]">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            {form.logo_url ? (
              <div className="flex items-center justify-center gap-2">
                <img src={`${SERVER_BASE_URL}${form.logo_url}`} alt="Logo" className="w-8 h-8 object-contain rounded" />
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                </span>
              </div>
            ) : (
              <div className="text-slate-400 text-xs flex items-center justify-center gap-2">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>{uploading ? 'Uploading...' : 'Upload Logo'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="brand_featured"
            checked={form.is_featured}
            onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
            className="rounded border-slate-800 bg-[#0d1117] text-indigo-600 focus:ring-0"
          />
          <label htmlFor="brand_featured" className="text-xs text-slate-300">Featured Brand</label>
        </div>
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
          <Plus className="w-3.5 h-3.5" /> {editingId ? 'Update Brand' : 'Save Brand'}
        </button>
      </form>

      <div className="lg:col-span-8 bg-[#161b22] rounded-2xl border border-slate-800/80 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0d1117]/50 text-slate-400 border-b border-slate-800/80 font-medium uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">Logo</th>
              <th className="p-4">Brand</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map((brand) => (
              <tr key={brand.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="p-4">
                  {brand.logo_url ? (
                    <img src={`${SERVER_BASE_URL}${brand.logo_url}`} alt={brand.name} className="w-8 h-8 object-contain rounded bg-slate-900/50 p-1 border border-slate-800" />
                  ) : (
                    <div className="w-8 h-8 bg-slate-800/50 rounded flex items-center justify-center text-[10px] text-slate-500">N/A</div>
                  )}
                </td>
                <td className="p-4 font-medium text-white">{brand.name}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${brand.is_featured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800/50 text-slate-500'}`}>
                    {brand.is_featured ? 'Featured' : 'Standard'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(brand)} className="text-slate-500 hover:text-indigo-400 p-1 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(brand.id)} className="text-slate-500 hover:text-red-400 p-1 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductsTab({ items, brands, subcategories, onSave, onDelete, search }) {
  const [form, setForm] = useState({
    sku: '', name: '', price: '', sale_price: '', brand_id: '', category_slug: '', is_featured: false
  });
  const [images, setImages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (p) => {
    setEditingId(p.id);
    setForm({
      sku: p.sku || '',
      name: p.name || '',
      price: p.price || '',
      sale_price: p.sale_price || '',
      brand_id: p.brand_id || '',
      category_slug: p.category_slug || '',
      is_featured: Boolean(p.is_featured),
    });
    setImages(p.images || []);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ sku: '', name: '', price: '', sale_price: '', brand_id: '', category_slug: '', is_featured: false });
    setImages([]);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/upload/multiple`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        const newImages = data.imageUrls.map((url, index) => ({
          url,
          is_primary: images.length === 0 && index === 0,
        }));
        setImages((prev) => [...prev, ...newImages]);
      }
    } catch (err) {
      console.error('Failed to upload product images:', err);
    } finally {
      setUploading(false);
    }
  };

  const setPrimaryImage = (targetUrl) => {
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        is_primary: img.url === targetUrl,
      }))
    );
  };

  const removeImage = (url) => {
    setImages((prev) => {
      const filteredImgs = prev.filter((img) => img.url !== url);
      if (filteredImgs.length > 0 && !filteredImgs.some((i) => i.is_primary)) {
        filteredImgs[0].is_primary = true;
      }
      return filteredImgs;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.sku || !form.name || !form.price || !form.brand_id) return;

    onSave({
      ...form,
      brand_id: Number(form.brand_id),
      images,
    }, editingId);

    handleCancel();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <form onSubmit={handleSubmit} className="lg:col-span-5 bg-[#161b22] p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{editingId ? 'Edit Product' : 'New Product'}</h3>
          {editingId && (
            <button type="button" onClick={handleCancel} className="text-slate-500 hover:text-white text-xs flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">SKU</label>
            <input
              type="text"
              className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Brand</label>
            <select
              className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              value={form.brand_id}
              onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
            >
              <option value="">Select</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Product Name</label>
          <input
            type="text"
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Price ($)</label>
            <input
              type="number"
              step="0.01"
              className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Sale ($)</label>
            <input
              type="number"
              step="0.01"
              className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              value={form.sale_price}
              onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Subcategory</label>
          <select
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.category_slug}
            onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
          >
            <option value="">Select Subcategory</option>
            {subcategories.map((s) => (
              <option key={s.id} value={s.slug}>{s.name} ({s.slug})</option>
            ))}
          </select>
        </div>

        {/* Product Multi Image Upload */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Product Images</label>
          <div className="relative border-2 border-dashed border-slate-800 rounded-xl p-4 text-center hover:border-indigo-500/50 transition-colors bg-[#0d1117]">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Upload className="w-5 h-5 mx-auto text-slate-500 mb-1" />
            <p className="text-xs text-slate-300 font-medium">
              {uploading ? 'Uploading...' : 'Click or Drag images to upload'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, WEBP up to 5MB</p>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`relative group rounded-lg overflow-hidden border ${
                    img.is_primary ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800'
                  } bg-[#0d1117]`}
                >
                  <img
                    src={`${SERVER_BASE_URL}${img.url}`}
                    alt="preview"
                    className="w-full h-20 object-cover"
                  />
                  {img.is_primary ? (
                    <span className="absolute top-1 left-1 bg-indigo-600 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow">
                      Primary
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPrimaryImage(img.url)}
                      className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 bg-slate-900/80 hover:bg-indigo-600 text-[9px] font-medium text-white px-1.5 py-0.5 rounded transition-all"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(img.url)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-600/90 text-white p-1 rounded transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="prod_featured"
            checked={form.is_featured}
            onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
            className="rounded border-slate-800 bg-[#0d1117] text-indigo-600 focus:ring-0"
          />
          <label htmlFor="prod_featured" className="text-xs text-slate-300">Featured Product</label>
        </div>

        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
          <Plus className="w-3.5 h-3.5" /> {editingId ? 'Update Product' : 'Save Product'}
        </button>
      </form>

      <div className="lg:col-span-7 bg-[#161b22] rounded-2xl border border-slate-800/80 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0d1117]/50 text-slate-400 border-b border-slate-800/80 font-medium uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">Image</th>
              <th className="p-4">Product / SKU</th>
              <th className="p-4">Brand</th>
              <th className="p-4">Price</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map((p) => {
              const brand = brands.find((b) => b.id === p.brand_id);
              const primaryImage = p.images?.find((img) => img.is_primary)?.url || p.images?.[0]?.url;

              return (
                <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-4">
                    {primaryImage ? (
                      <img
                        src={`${SERVER_BASE_URL}${primaryImage}`}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-lg border border-slate-800"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-[10px] text-slate-500">
                        No img
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-white max-w-xs truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.sku}</div>
                  </td>
                  <td className="p-4 text-slate-300">{brand?.name || `#${p.brand_id}`}</td>
                  <td className="p-4 font-mono">
                    <div className="text-white">${p.price}</div>
                    {p.sale_price && <div className="text-[11px] text-emerald-400">${p.sale_price}</div>}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(p)} className="text-slate-500 hover:text-indigo-400 p-1 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(p.id)} className="text-slate-500 hover:text-red-400 p-1 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BannersTab({ items, onSave, onDelete, search }) {
  const [form, setForm] = useState({ title: '', image_url: '', link: '', is_active: true });
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const filtered = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || '',
      image_url: banner.image_url || '',
      link: banner.link || '',
      is_active: Boolean(banner.is_active ?? true),
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ title: '', image_url: '', link: '', is_active: true });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/upload/single`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({ ...prev, image_url: data.imageUrl }));
      }
    } catch (err) {
      console.error('Failed to upload banner:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.image_url) return;
    onSave(form, editingId);
    handleCancel();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <form onSubmit={handleSubmit} className="lg:col-span-4 bg-[#161b22] p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{editingId ? 'Edit Banner' : 'New Banner'}</h3>
          {editingId && (
            <button type="button" onClick={handleCancel} className="text-slate-500 hover:text-white text-xs flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Title</label>
          <input
            type="text"
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Banner Image</label>
          <div className="relative border-2 border-dashed border-slate-800 rounded-xl p-3 text-center bg-[#0d1117]">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            {form.image_url ? (
              <div className="flex items-center justify-center gap-2">
                <img src={`${SERVER_BASE_URL}${form.image_url}`} alt="Banner" className="h-10 object-cover rounded" />
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                </span>
              </div>
            ) : (
              <div className="text-slate-400 text-xs flex items-center justify-center gap-2">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Target Link</label>
          <input
            type="text"
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            placeholder="/category/pcs"
          />
        </div>
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
          <Plus className="w-3.5 h-3.5" /> {editingId ? 'Update Banner' : 'Save Banner'}
        </button>
      </form>

      <div className="lg:col-span-8 bg-[#161b22] rounded-2xl border border-slate-800/80 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0d1117]/50 text-slate-400 border-b border-slate-800/80 font-medium uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">Image</th>
              <th className="p-4">Title</th>
              <th className="p-4">Link</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map((banner) => (
              <tr key={banner.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="p-4">
                  {banner.image_url ? (
                    <img src={`${SERVER_BASE_URL}${banner.image_url}`} alt={banner.title} className="w-16 h-8 object-cover rounded border border-slate-800" />
                  ) : (
                    <div className="w-16 h-8 bg-slate-800 flex items-center justify-center text-[10px] text-slate-500">N/A</div>
                  )}
                </td>
                <td className="p-4 font-medium text-white">{banner.title}</td>
                <td className="p-4 text-slate-400 font-mono text-[11px]">{banner.link}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(banner)} className="text-slate-500 hover:text-indigo-400 p-1 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(banner.id)} className="text-slate-500 hover:text-red-400 p-1 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminsTab({ items, onSave, onDelete, search }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' });
  const [editingId, setEditingId] = useState(null);

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.email.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (admin) => {
    setEditingId(admin.id);
    setForm({
      name: admin.name || '',
      email: admin.email || '',
      password: '',
      role: admin.role || 'admin',
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ name: '', email: '', password: '', role: 'admin' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || (!editingId && !form.password)) return;
    
    // Omit empty password on update if unchanged
    const payload = { ...form };
    if (editingId && !payload.password) delete payload.password;

    onSave(payload, editingId);
    handleCancel();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <form onSubmit={handleSubmit} className="lg:col-span-4 bg-[#161b22] p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{editingId ? 'Edit Admin' : 'New Admin'}</h3>
          {editingId && (
            <button type="button" onClick={handleCancel} className="text-slate-500 hover:text-white text-xs flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Full Name</label>
          <input
            type="text"
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Password {editingId && <span className="text-[10px] text-slate-500">(Leave blank to keep current)</span>}
          </label>
          <input
            type="password"
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Role</label>
          <select
            className="w-full mt-1.5 bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
          <Plus className="w-3.5 h-3.5" /> {editingId ? 'Update Account' : 'Create Account'}
        </button>
      </form>

      <div className="lg:col-span-8 bg-[#161b22] rounded-2xl border border-slate-800/80 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0d1117]/50 text-slate-400 border-b border-slate-800/80 font-medium uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map((admin) => (
              <tr key={admin.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="p-4 font-medium text-white">{admin.name}</td>
                <td className="p-4 text-slate-400 font-mono text-[11px]">{admin.email}</td>
                <td className="p-4 text-slate-300 font-mono text-[11px]">
                  <span className="px-2 py-0.5 bg-slate-800 border border-slate-700/60 rounded text-slate-300">
                    {admin.role}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(admin)} className="text-slate-500 hover:text-indigo-400 p-1 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(admin.id)} className="text-slate-500 hover:text-red-400 p-1 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubscribersTab({ items, onDelete, search }) {
  const filtered = items.filter(i => i.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-[#161b22] rounded-2xl border border-slate-800/80 overflow-hidden">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#0d1117]/50 text-slate-400 border-b border-slate-800/80 font-medium uppercase tracking-wider text-[10px]">
          <tr>
            <th className="p-4">ID</th>
            <th className="p-4">Subscriber Email</th>
            <th className="p-4">Date Joined</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {filtered.map((sub) => (
            <tr key={sub.id} className="hover:bg-slate-800/20 transition-colors">
              <td className="p-4 text-slate-500 font-mono text-[11px]">#{sub.id}</td>
              <td className="p-4 font-medium text-white font-mono">{sub.email}</td>
              <td className="p-4 text-slate-400">{sub.created_at || 'Recently'}</td>
              <td className="p-4 text-right">
                <button onClick={() => onDelete(sub.id)} className="text-slate-500 hover:text-red-400 p-1 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}