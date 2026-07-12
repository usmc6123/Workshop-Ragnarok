import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Trash2, Loader2, FolderOpen, ImageIcon, Film, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

/**
 * Substitute for "open the uploads folder in Windows Explorer" — a web page
 * can't launch a native file browser (real browser security restriction, not
 * something fixable from app code), so this browses/copies/deletes the same
 * UPLOADS_ROOT/media/ directory from inside the app instead. Works from any
 * device, not just the machine the files physically live on.
 */
export default function MediaLibraryModal({ onClose }: { onClose: () => void }) {
  const [files, setFiles] = useState<Array<{ filename: string; url: string; size_bytes: number; modified_at: string; kind: 'image' | 'video' | 'other' }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMediaLibrary();
      setFiles(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load media library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCopy = async (file: { filename: string; url: string }) => {
    try {
      await navigator.clipboard.writeText(file.url);
      setCopiedFile(file.filename);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch {
      // clipboard API can be unavailable — URL is still visible in the row
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(`Delete "${filename}" permanently? If it's still used as an image or video anywhere on a Site or Funnel, that spot will break.`)) return;
    setDeletingFile(filename);
    try {
      await api.deleteMediaFile(filename);
      setFiles(prev => prev.filter(f => f.filename !== filename));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete file.');
    } finally {
      setDeletingFile(null);
    }
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)}GB`;
    return `${mb.toFixed(mb < 10 ? 1 : 0)}MB`;
  };

  return (
    createPortal(
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[85vh] rounded-2xl border border-white/10 bg-[#111218]/98 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-4 border-b border-border-theme shrink-0">
          <FolderOpen className="w-4 h-4 text-primary-theme shrink-0" />
          <h2 className="text-sm font-black text-white uppercase tracking-wider">Formatted Media</h2>
          <span className="text-[10px] font-mono text-slate-500">{files.length} file{files.length === 1 ? '' : 's'}</span>
          <button
            onClick={load}
            disabled={loading}
            title="Refresh"
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {error && <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs font-mono mb-4">{error}</div>}

          {loading ? (
            <div className="py-16 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
              <span>Loading files...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-mono text-xs">
              Nothing uploaded or reformatted yet — files show up here once you use Upload or Reformat anywhere in the app.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {files.map((file) => (
                <div key={file.filename} className="rounded-xl border border-[#1e2028] bg-[#0c0d12]/60 overflow-hidden flex flex-col">
                  <div className="aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                    {file.kind === 'image' ? (
                      <img src={file.url} alt={file.filename} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : file.kind === 'video' ? (
                      <video src={file.url} className="w-full h-full object-cover" preload="metadata" muted />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-700" />
                    )}
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                      {file.kind === 'video' ? <Film className="w-3 h-3 text-slate-500 shrink-0" /> : <ImageIcon className="w-3 h-3 text-slate-500 shrink-0" />}
                      <span className="text-[9px] text-slate-300 truncate" title={file.filename}>{file.filename}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-600 font-mono">
                      <span>{formatSize(file.size_bytes)}</span>
                      <span>{new Date(file.modified_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(file)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-bold uppercase tracking-wider transition cursor-pointer"
                      >
                        {copiedFile === file.filename ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                        {copiedFile === file.filename ? 'Copied' : 'Copy URL'}
                      </button>
                      <button
                        onClick={() => handleDelete(file.filename)}
                        disabled={deletingFile === file.filename}
                        title="Delete"
                        className="p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 transition cursor-pointer disabled:opacity-50"
                      >
                        {deletingFile === file.filename ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
    )
  );
}
