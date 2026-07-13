import React, { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, X, Shrink, ChevronDown, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';

const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024;  // 20MB — matches backend/server.js POST /api/uploads
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB — matches backend/server.js POST /api/uploads
const REFORMAT_MAX_RAW_INPUT_BYTES = 2 * 1024 * 1024 * 1024; // 2GB — matches backend/server.js. Our own app-level cap, not an infra limit — over LAN/Tailscale there's no Cloudflare involved.

const VIDEO_RESOLUTIONS = [
  { value: '480' as const, label: '480p (smallest)' },
  { value: '720' as const, label: '720p (recommended)' },
  { value: '1080' as const, label: '1080p (largest)' },
];

// Human-friendly size display — "300MB" reads fine, but "2048MB" doesn't.
function formatSize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)}GB`;
  return `${mb.toFixed(mb < 10 ? 1 : 0)}MB`;
}

// Must match ALLOWED_UPLOAD_MIME in backend/server.js exactly. A real bug came
// from checking file.type.startsWith('video/') here instead of the actual
// allowed list — that loose check let an .mkv (video/x-matroska, not in the
// server's list) through client-side, and for a large file the server's
// rejection tore the connection down mid-upload before the browser finished
// sending it, which showed up as a generic "Failed to fetch" with zero clue
// why. Checking the real list here means an unsupported type gets caught
// instantly, before a multi-GB upload even starts.
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
// Both mkv variants are listed because Windows reports .mkv as plain
// "video/matroska" (no "x-" prefix) rather than the more common
// "video/x-matroska" — same file, different MIME string depending on the
// OS's file-type registry. Confirmed by an actual failed upload.
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-matroska', 'video/matroska', 'video/x-msvideo', 'video/avi'];
// Some browsers/OSes don't map certain extensions to a MIME type at all
// (file.type comes back ''), most commonly .mkv on Windows — fall back to the
// extension itself rather than rejecting a perfectly fine file for that.
const EXTENSION_MIME_FALLBACK: Record<string, string> = {
  mkv: 'video/x-matroska', avi: 'video/x-msvideo', mov: 'video/quicktime',
  mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg',
};
const ALLOWED_MODEL_MIME = [
  'model/gltf-binary', 'model/gltf+json', 'model/vlm',
  'application/octet-stream', 'application/x-binary', 'application/binary'
];

function detectMediaType(file: File): { kind: 'image' | 'video' | 'model' | null; mimeType: string } {
  let mimeType = file.type;
  if (!mimeType) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext && EXTENSION_MIME_FALLBACK[ext]) mimeType = EXTENSION_MIME_FALLBACK[ext];
  }
  if (ALLOWED_IMAGE_MIME.includes(mimeType)) return { kind: 'image', mimeType };
  if (ALLOWED_VIDEO_MIME.includes(mimeType)) return { kind: 'video', mimeType };
  
  // Also check for 3D model files (GLB, GLTF, VLM)
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && ['glb', 'gltf', 'vlm'].includes(ext)) {
    return { kind: 'model', mimeType: mimeType || `model/${ext}` };
  }
  if (ALLOWED_MODEL_MIME.includes(mimeType)) {
    return { kind: 'model', mimeType };
  }
  
  return { kind: null, mimeType };
}

// Client-side downscale before upload — used for things like the shop logo, where a
// full-resolution photo is pointless, and for the "Reformat" tool's image path.
// Skips SVGs (not rasterizable via canvas). Uses createObjectURL + canvas.toBlob
// rather than FileReader + toDataURL, so the image is never held as a base64
// string in memory — just a lightweight Blob reference the whole way through.
function compressImage(file: File, maxDimension: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
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
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to compress image'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image for compression')); };
    img.src = objectUrl;
  });
}

/**
 * Shared image/video field used everywhere the app lets you set a media URL:
 * Sites block editor, Funnels editor, Settings shop logo. Always offers a URL
 * text input, an "Upload from device" button, and a "Reformat" tool that
 * shrinks an oversized file (image downscale client-side, video re-encode
 * server-side via ffmpeg) down to something that fits the upload limits, then
 * uploads the result automatically. Upload always goes to the server
 * (POST /api/uploads) and stores the returned URL — never inline base64.
 */
export default function MediaField({
  label, value, onChange, accept = 'both', placeholder, help,
  showOpacity = false, opacityKey, mediaOpacity, onOpacityChange,
  showPreview = false, maxImageDimension, labelColorClass, accentClass,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  accept?: 'image' | 'video' | 'model' | 'both';
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
  const reformatFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const opacity = opacityKey && mediaOpacity ? (mediaOpacity[opacityKey] ?? 100) : 100;

  const [showReformat, setShowReformat] = useState(false);
  const [reformatFile, setReformatFile] = useState<File | null>(null);
  const [reformatKind, setReformatKind] = useState<'image' | 'video' | 'model' | null>(null);
  const [reformatMaxDim, setReformatMaxDim] = useState(1600);
  const [reformatResolution, setReformatResolution] = useState<'480' | '720' | '1080'>('720');
  const [reformatProcessing, setReformatProcessing] = useState(false);
  const [reformatPhase, setReformatPhase] = useState<'uploading' | 'probing' | 'processing' | null>(null);
  const [reformatPercent, setReformatPercent] = useState(0);
  const [reformatError, setReformatError] = useState<string | null>(null);
  const [reformatDoneNote, setReformatDoneNote] = useState<string | null>(null);
  // Bumped on every new reformat run (and on unmount) so a stale poll loop from
  // an earlier/abandoned run knows to stop instead of clobbering newer state.
  const reformatRunIdRef = useRef(0);
  useEffect(() => () => { reformatRunIdRef.current += 1; }, []);

  // Shop's LAN/Tailscale URL (Settings → "Local / Tailscale Access URL"), shown
  // as a one-click link in the Reformat panel for large videos — Cloudflare's
  // proxy caps uploads around 100-200MB on the public domain, but the same
  // upload works fine hitting the backend directly over a local/Tailscale network.
  const [localAccessUrl, setLocalAccessUrl] = useState<string | null>(null);
  useEffect(() => {
    api.getShopSettings()
      .then((s) => { if (s.local_access_url) setLocalAccessUrl(s.local_access_url.trim()); })
      .catch(() => {}); // silent — this is a convenience hint, not critical
  }, []);
  const isAlreadyOnLocalUrl = (() => {
    if (!localAccessUrl) return false;
    try { return new URL(localAccessUrl).origin === window.location.origin; } catch { return false; }
  })();
  // Deep-links straight into the standalone quick-uploader (QuickReformatView)
  // instead of dropping onto the Dashboard — see App.tsx's `?view=reformat-tool`
  // handling for why this survives the page reload that happens right after login.
  const quickUploadUrl = localAccessUrl ? `${localAccessUrl.replace(/\/+$/, '')}/?view=reformat-tool` : null;

  const acceptAttr = accept === 'image' 
    ? 'image/*' 
    : accept === 'video' 
      ? 'video/*' 
      : accept === 'model'
        ? '.glb,.gltf,.vlm'
        : 'image/*,video/*,.glb,.gltf,.vlm';

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);

    const { kind, mimeType } = detectMediaType(file);
    if (!kind) {
      setUploadError(`Unsupported file type (${mimeType || 'unknown'}) — please choose a common image, video, or 3D model file.`);
      return;
    }
    const isImage = kind === 'image';
    const maxBytes = isImage ? MAX_IMAGE_UPLOAD_BYTES : MAX_VIDEO_UPLOAD_BYTES;
    if (file.size > maxBytes) {
      setUploadError(`File is too large (${formatSize(file.size)}) — max is ${formatSize(maxBytes)} for ${isImage ? 'images' : '3D models/video'}. Use "Reformat" below to shrink it, or paste a hosted URL instead.`);
      return;
    }

    setUploading(true);
    try {
      let toSend: Blob = file;
      let fileName = file.name;
      if (isImage && maxImageDimension && file.type !== 'image/svg+xml') {
        toSend = await compressImage(file, maxImageDimension);
        fileName = fileName.replace(/\.[^/.]+$/, '') + '.jpg';
      }
      const result = await api.uploadMedia(toSend, fileName);
      onChange(result.url);
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed — please try again, or paste a hosted URL instead.');
    } finally {
      setUploading(false);
    }
  };

  const handlePickReformatFile = (file: File | undefined) => {
    if (!file) return;
    setReformatError(null);
    setReformatDoneNote(null);
    const { kind, mimeType } = detectMediaType(file);
    if (!kind) {
      setReformatError(`Unsupported file type (${mimeType || 'unknown'}) — please choose a common image or video format.`);
      return;
    }
    if (kind === 'model') {
      setReformatError("Reformatting/compression is only supported for images and videos. Please upload your .glb or .vlm file directly using the main Upload button.");
      return;
    }
    const isImage = kind === 'image';
    if (file.size > REFORMAT_MAX_RAW_INPUT_BYTES) {
      setReformatError(`That's ${formatSize(file.size)} — too large for this tool even locally (${formatSize(REFORMAT_MAX_RAW_INPUT_BYTES)} is the hard limit going in). Shrink it first with something like HandBrake or your phone's built-in video editor, then upload the result here.`);
      return;
    }
    setReformatFile(file);
    setReformatKind(isImage ? 'image' : 'video');
  };

  const runReformat = async () => {
    if (!reformatFile || !reformatKind) return;
    const runId = ++reformatRunIdRef.current;
    setReformatProcessing(true);
    setReformatError(null);
    setReformatDoneNote(null);
    setReformatPercent(0);
    setReformatPhase(reformatKind === 'video' ? 'uploading' : null);
    try {
      if (reformatKind === 'image') {
        const compressed = await compressImage(reformatFile, reformatMaxDim);
        const fileName = reformatFile.name.replace(/\.[^/.]+$/, '') + '.jpg';
        const result = await api.uploadMedia(compressed, fileName);
        onChange(result.url);
        setReformatDoneNote(`Done — new size: ${(result.size_bytes / 1024 / 1024).toFixed(2)}MB.`);
      } else {
        const originalSize = reformatFile.size;
        const { jobId } = await api.startVideoCompress(reformatFile, reformatFile.name, reformatResolution);
        if (reformatRunIdRef.current !== runId) return; // a newer run (or unmount) superseded this one
        setReformatPhase('probing');

        // Poll every ~1s for real encode progress until the job finishes or errors.
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (reformatRunIdRef.current !== runId) return;
          const status = await api.getVideoCompressStatus(jobId);
          if (reformatRunIdRef.current !== runId) return;

          if (status.status === 'error') {
            throw new Error(status.error || 'Reformat failed — please try again.');
          }
          setReformatPhase(status.status === 'done' ? 'processing' : status.status);
          setReformatPercent(status.percent);
          if (status.status === 'done') {
            onChange(status.url!);
            setReformatDoneNote(`Done — shrunk from ${formatSize(originalSize)} to ${formatSize(status.size_bytes!)}.`);
            break;
          }
        }
      }
      setReformatFile(null);
      setReformatKind(null);
    } catch (err: any) {
      setReformatError(err?.message || 'Reformat failed — please try again.');
    } finally {
      if (reformatRunIdRef.current === runId) {
        setReformatProcessing(false);
        setReformatPhase(null);
        setReformatPercent(0);
      }
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
          className={`flex-1 min-w-0 rounded-lg border px-3 py-2 text-xs placeholder-slate-500 focus:outline-none font-mono transition ${
            value 
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-100 focus:border-emerald-400' 
              : 'bg-rose-950/40 border-rose-900/60 text-rose-100 focus:border-rose-400'
          }`}
        />
        <input ref={fileInputRef} type="file" accept={acceptAttr} className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          title="Upload from your device"
          className="shrink-0 px-2.5 py-2 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-wait text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shadow-sm"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        {accept !== 'model' && (
          <button
            type="button"
            onClick={() => setShowReformat(v => !v)}
            title="Shrink an oversized file to fit the upload limit"
            className={`shrink-0 px-2.5 py-2 rounded-lg border transition cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
              showReformat 
                ? 'border-amber-400 bg-amber-950/20 text-amber-300' 
                : 'border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Shrink className="w-3 h-3" />
            Reformat
            <ChevronDown className={`w-3 h-3 transition-transform ${showReformat ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {help && <p className="text-[9px] text-slate-600 leading-relaxed">{help}</p>}
      {uploadError && <p className="text-[10px] text-rose-400">{uploadError}</p>}

      {showReformat && (
        <div className="rounded-lg border border-[#1e2028] bg-[#08090d] p-2.5 space-y-2">
          <p className="text-[9px] text-slate-500 leading-relaxed">
            Have a file that's too big to upload directly? Pick it here — this shrinks it (images downscale instantly; video is re-encoded on the server, which takes longer) and uploads the result automatically.
          </p>
          {accept !== 'image' && (
            <ul className="text-[9px] text-slate-500 leading-relaxed list-none space-y-0.5 border-l-2 border-[#1e2028] pl-2">
              <li><span className="text-slate-300 font-bold">Under 100MB</span> — works fine here, public domain or local.</li>
              <li><span className="text-amber-400 font-bold">100MB–2GB</span> — works, but only reliably over your local/Tailscale network (Cloudflare caps public uploads around 100-200MB).</li>
              <li><span className="text-rose-400 font-bold">Over 2GB</span> — too big for this tool. Shrink it elsewhere first, then come back.</li>
            </ul>
          )}
          <input ref={reformatFileInputRef} type="file" accept={acceptAttr} className="hidden" onChange={(e) => handlePickReformatFile(e.target.files?.[0])} />
          <button
            type="button"
            onClick={() => reformatFileInputRef.current?.click()}
            className="w-full px-2.5 py-1.5 rounded-lg border border-dashed border-[#1e2028] hover:border-slate-500 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition cursor-pointer truncate"
          >
            {reformatFile ? `Selected: ${reformatFile.name} (${formatSize(reformatFile.size)})` : 'Choose a file to shrink'}
          </button>

          {reformatFile && reformatKind === 'video' && reformatFile.size > 100 * 1024 * 1024 && !isAlreadyOnLocalUrl && (
            quickUploadUrl ? (
              <div className="space-y-1.5 bg-amber-950/20 border border-amber-900/40 rounded-lg p-2">
                <p className="text-[9px] text-amber-400 leading-relaxed">
                  This file is over 100MB — it can fail over the public domain. It's the same data either way, so you can just do this part locally.
                </p>
                <a
                  href={quickUploadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full px-2.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Quick Uploader Locally
                </a>
                <p className="text-[9px] text-slate-600">Opens in a new tab — this one stays as-is. You'll need to log in there, then paste the resulting URL back here.</p>
              </div>
            ) : (
              <p className="text-[9px] text-amber-400 leading-relaxed bg-amber-950/20 border border-amber-900/40 rounded-lg px-2 py-1.5">
                This file is over 100MB — it can fail over the public domain. Add a "Local / Tailscale Access URL" in Settings to get a one-click link here for next time.
              </p>
            )
          )}

          {reformatFile && reformatKind === 'image' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Max dimension</span>
                <span className="text-[10px] font-mono text-slate-400">{reformatMaxDim}px</span>
              </div>
              <input
                type="range"
                min={400}
                max={3000}
                step={100}
                value={reformatMaxDim}
                onChange={(e) => setReformatMaxDim(parseInt(e.target.value, 10))}
                className="w-full cursor-pointer accent-amber-500"
              />
            </div>
          )}

          {reformatFile && reformatKind === 'video' && (
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Target resolution</span>
              <div className="flex gap-1.5 flex-wrap">
                {VIDEO_RESOLUTIONS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReformatResolution(r.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition ${reformatResolution === r.value ? 'border-amber-400 bg-amber-950/20 text-amber-300' : 'border-[#1e2028] text-slate-400 hover:border-slate-600'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-slate-600">Re-encoding takes real time — anywhere from ~30 seconds to a few minutes, depending on the video's length.</p>
            </div>
          )}

          {reformatFile && (
            <div className="space-y-1">
              <button
                type="button"
                disabled={reformatProcessing}
                onClick={runReformat}
                className="w-full px-2.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-wait text-slate-950 font-bold text-[10px] uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
              >
                {reformatProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shrink className="w-3 h-3" />}
                {reformatProcessing
                  ? reformatKind === 'video'
                    ? reformatPhase === 'uploading'
                      ? 'Uploading…'
                      : reformatPhase === 'probing'
                        ? 'Reading video…'
                        : `Encoding… ${reformatPercent}%`
                    : 'Processing…'
                  : 'Shrink & Use'}
              </button>
              {reformatProcessing && reformatKind === 'video' && (
                <div className="h-1.5 w-full rounded-full bg-[#1e2028] overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300 ease-out"
                    style={{ width: `${reformatPhase === 'processing' ? Math.max(4, reformatPercent) : 4}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {reformatError && <p className="text-[10px] text-rose-400">{reformatError}</p>}
          {reformatDoneNote && <p className="text-[10px] text-emerald-400">{reformatDoneNote}</p>}
        </div>
      )}

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
