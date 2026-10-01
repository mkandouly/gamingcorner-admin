// src/components/ImageUploadField.jsx
import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, ImageOff } from 'lucide-react';
import client, { API_BASE_URL } from '../api/client';

const resolveUrl = (url) => (url?.startsWith('http') ? url : `${API_BASE_URL}${url}`);

// Single-image variant: value is a URL string (or '').
export function SingleImageUpload({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await client.post('/api/admin/upload/single', formData);
      onChange(res.data.imageUrl);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.message || "Couldn't upload image.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
            <img src={resolveUrl(value)} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-300 dark:text-slate-700">
            <ImageOff className="w-6 h-6" />
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {value ? 'Replace' : 'Upload'} Image
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {error && <p className="text-[11px] text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

// Multi-image variant: value is an array of URL strings.
export function MultiImageUpload({ value = [], onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('images', f));
      const res = await client.post('/api/admin/upload/multiple', formData);
      onChange([...(value || []), ...res.data.imageUrls]);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.message || "Couldn't upload images.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAt = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {(value || []).map((url, i) => (
          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <img src={resolveUrl(url)} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        Add Images
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      {error && <p className="text-[11px] text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}
