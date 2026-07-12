import React, { useState } from 'react';
import { Copy, Check, Zap } from 'lucide-react';
import MediaField from './MediaField';

/**
 * Landing spot for the "Open this app locally" link in MediaField's Reformat
 * panel (Settings → Local / Tailscale Access URL). Reached via a
 * `?view=reformat-tool` query param, read once at App.tsx's initial `view`
 * state — this survives the full page reload ProtectedRoute/LoginPage does
 * after a fresh login, so clicking the link drops you straight here instead
 * of the Dashboard, even if you weren't already logged in on this origin.
 *
 * Deliberately minimal: this isn't tied to any specific funnel/site/job —
 * it's just a bare upload/reformat tool. Once you have a URL, copy it and
 * paste it back into whatever field you were editing in the other tab. No
 * "syncing" step needed — this is the exact same backend and database as
 * the public domain, just reached over a local/Tailscale network instead of
 * through Cloudflare's proxy (which is what caps large uploads in the first
 * place).
 */
export default function QuickReformatView() {
  const [value, setValue] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure http origin in some
      // browsers) — the URL is still right there in the field to select manually.
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-4 h-4 text-sky-400" />
        <h1 className="text-lg font-bold text-white">Quick Upload / Reformat</h1>
      </div>
      <p className="text-xs text-slate-500 mb-6 leading-relaxed">
        Upload or shrink a large file here, over this local/Tailscale connection — it bypasses
        Cloudflare's upload-size cap on the public domain entirely. Once you have a URL below,
        copy it and paste it into whatever field you were editing in your other tab. It's the
        same database either way, so there's nothing else to sync.
      </p>
      <MediaField
        label="File"
        value={value}
        onChange={setValue}
        accept="both"
        showPreview
        help="Paste a hosted URL, upload directly, or use Reformat to shrink an oversized file first."
      />
      {value && (
        <button
          type="button"
          onClick={handleCopy}
          className="mt-4 w-full px-3 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 transition"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy URL'}
        </button>
      )}
    </div>
  );
}
