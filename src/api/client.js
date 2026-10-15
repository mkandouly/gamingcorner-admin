// src/api/client.js
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const client = axios.create({
  baseURL: API_BASE_URL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 means the token is missing/invalid/expired, or the account backing
// it was deactivated or deleted (requireAuth on the backend re-checks the
// DB on every request, not just the token). Either way, the local session
// is no longer valid — clear it and force a fresh login.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_info');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Admin list endpoints are paginated (the server caps a page at 100 rows),
// so anything that needs the complete list — a dropdown of every brand or
// product, the full stock summary — must walk every page rather than take
// the first one. Otherwise items past the first page silently disappear
// from pickers.
const MAX_PAGE_SIZE = 100;

export async function fetchAllPages(path, params = {}) {
  const all = [];

  for (let page = 1; ; page += 1) {
    const res = await client.get(path, { params: { ...params, page, limit: MAX_PAGE_SIZE } });
    all.push(...(res.data?.data || []));
    const totalPages = res.data?.pagination?.totalPages || 1;
    if (page >= totalPages) return all;
  }
}

export default client;
