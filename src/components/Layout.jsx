// src/components/Layout.jsx
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  BadgePercent,
  Image as ImageIcon,
  ClipboardList,
  ScanBarcode,
  Truck,
  Settings as SettingsIcon,
  Mail,
  Users,
  UserCircle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: null },
  { to: '/products', label: 'Products', icon: Package, permission: 'products.view' },
  { to: '/categories', label: 'Categories', icon: FolderTree, permission: 'categories.view' },
  { to: '/subcategories', label: 'Subcategories', icon: Tags, permission: 'subcategories.view' },
  { to: '/brands', label: 'Brands', icon: BadgePercent, permission: 'brands.view' },
  { to: '/distributors', label: 'Distributor Profiles', icon: Truck, permission: 'distributors.view' },
  { to: '/banners', label: 'Banners', icon: ImageIcon, permission: 'banners.view' },
  { to: '/orders', label: 'Orders', icon: ClipboardList, permission: 'orders.view' },
  { to: '/serials', label: 'Inventory & Warranty', icon: ScanBarcode, permission: 'serials.view' },
  { to: '/settings', label: 'Site Settings', icon: SettingsIcon, permission: 'settings.view' },
  { to: '/subscribers', label: 'Subscribers', icon: Mail, permission: 'subscribers.view' },
  { to: '/accounts', label: 'Admin Accounts', icon: Users, permission: null, requireRoot: true },
];

export default function Layout() {
  const { admin, hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.requireRoot) return admin?.role === 'root';
    if (item.permission) return hasPermission(item.permission);
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-200 dark:border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">GamingCorner</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#161b22] hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-1">
        <NavLink
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#161b22] hover:text-slate-900 dark:hover:text-white'
            }`
          }
        >
          <UserCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{admin?.name || 'Profile'}</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Log Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-white dark:bg-[#0d1117] border-r border-slate-200 dark:border-slate-800 z-30">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar (slide-over) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-[#0d1117] shadow-2xl">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white dark:bg-[#0d1117] border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold">GamingCorner Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed top-3 right-4 z-50 p-2 rounded-lg bg-white dark:bg-slate-900 shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <main className="lg:pl-64">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
