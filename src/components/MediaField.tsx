import React, { useState, useRef } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import { api } from '../lib/api';

const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024;  // 20MB — matches backend/server.js POST /api/uploads
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB — matches backend/server.js POST /api/uploads

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Failed to read file')));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Client-side downscale before upload — used for things like the shop logo, where a
// full-resolution photo is pointless. Skips SVGs (not rasterizable via canvas).
function compressImage(dataUrl: string, maxDimension: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
}

/**
 * Shared image/video field used everywhere the app lets you set a media URL:
 * Sites block editor, Funnels editor, Settings shop logo. Always offers both a
 * URL text input AND an "Upload from device" button — upload goes to the server
 * (POST /api/uploads) and stores the returned URL, so it works the same for
 * images and video and never bloats the database with inline base64.
 */
export default function MediaField({
  label, value, onChange, accept = 'both', placeholder, help,
  showOpacity = false, opacityKey, mediaOpacity, onOpacityChange,
  showPreview = false, maxImageDimension, labelColorClass, accentClass,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  accept?: 'image' | 'video' | 'both';
  placeholder?: string;
  help?: string;
  showOpacity?: boolean;
  opacityKey?: string;
  mediaOpacity?: Record<string, number>;
  onOpacityChange?: (key: string, value: number) => void;
  showPreview?: boolean;
  maxImageDimension?: number;
  labelColorClass?: string;
  accentClass?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const opacity = opacityKey && mediaOpacity ? (mediaOpacity[opacityKey] ?? 100) : 100;

  const acceptAttr = accept === 'image' ? 'image/*' : accept === 'video' ? 'video/*' : 'image/*,video/*';

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setUploadError('Unsupported file type — please choose an image or video.');
      return;
    }
    const maxBytes = isImage ? MAX_IMAGE_UPLOAD_BYTES : MAX_VIDEO_UPLOAD_BYTES;
    if (file.size > maxBytes) {
      setUploadError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB) — max is ${(maxBytes / 1024 / 1024).toFixed(0)}MB for ${isImage ? 'images' : 'video'}. Try a hosted URL instead.`);
      return;
    }

    setUploading(true);
    try {
      let dataUrl = await readFileAsDataUrl(file);
      let fileType = file.type;
      if (isImage && maxImageDimension && file.type !== 'image/svg+xml') {
        dataUrl = await compressImage(dataUrl, maxImageDimension);
        fileType = 'image/jpeg';
      }
      const result = await api.uploadMedia(dataUrl, fileType, file.name);
      onChange(result.url);
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed — please try again, or paste a hosted URL instead.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={label ? 'rounded-lg border border-[#1e2028] bg-[#0c0d12]/60 p-3 space-y-2' : 'space-y-1.5'}>
      {label && <label className={`block text-[10px] font-bold uppercase tracking-wider ${labelColorClass || 'text-slate-400'}`}>{label}</label>}
      <div className="flex items-center gap-1.5">
        {showPreview && (
          value ? (
            <div className="relative w-10 h-10 shrink-0 bg-slate-800 rounded border border-[#1e2028] flex items-center justify-center overflow-hidden">
              <img src={value} alt="Preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
              <button type="button" onClick={() => onChange('')} className="absolute top-0 right-0 bg-red-600/80 hover:bg-red-700 text-white rounded-bl p-0.5 cursor-pointer" title="Remove">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <div className="w-10 h-10 shrink-0 bg-slate-900 rounded border border-[#1e2028] flex items-center justify-center text-slate-600 text-[9px] font-mono">N/A</div>
          )
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'https://...'}
          className="flex-1 min-w-0 rounded-lg bg-[#08090d] border border-[#1e2028] focus:border-slate-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
        />
        <input ref={fileInputRef} type="file" accept={acceptAttr} className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          title="Upload from your device"
          className="shrink-0 px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-wait text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {help && <p className="text-[9px] text-slate-600 leading-relaxed">{help}</p>}
      {uploadError && <p className="text-[10px] text-rose-400">{uploadError}</p>}
      {showOpacity && opacityKey && mediaOpacity && onOpacityChange && value.trim() && (
        <div className="pt-1.5 border-t border-[#1e2028]/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Transparency</span>
            <span className="text-[10px] font-mono text-slate-400">{opacity}% visible</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={opacity}
            onChange={(e) => onOpacityChange(opacityKey, parseInt(e.target.value, 10))}
            className={`w-full cursor-pointer ${accentClass || 'accent-amber-500'}`}
          />
        </div>
      )}
    </div>
  );
}
