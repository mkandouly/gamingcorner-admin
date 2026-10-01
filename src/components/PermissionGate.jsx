// src/components/PermissionGate.jsx
import { useAuth } from '../context/AuthContext';

export default function PermissionGate({ permission, requireRoot = false, children, fallback = null }) {
  const { admin, hasPermission } = useAuth();

  if (requireRoot && admin?.role !== 'root') return fallback;
  if (permission && !hasPermission(permission)) return fallback;

  return children;
}
