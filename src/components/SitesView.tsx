import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { Site, SiteBlock, ThemeConfig } from '../types';
import {
  Globe, Plus, Pencil, Trash2, Copy, ExternalLink, Loader2, X,
  RefreshCw, Layers, Mail, Moon, Sun, CheckCircle2, Palette, Type, Search, Image as ImageIcon,
} from 'lucide-react';
import SiteBuilderView from './SiteBuilderView';
import SiteThumbnail from './SiteThumbnail';
import { SITE_FONT_OPTIONS, ensureGoogleFontsLoaded } from '../constants/siteFonts';

const DEFAULT_ACCENT = '#f59e0b';

// The base domain for wildcard subdomain sites — a site named "portfolio" is
// reachable at portfolio.sites.<this domain>, once the one-time wildcard
// Cloudflare Tunnel route is set up (see the help card at the bottom of this
// page). Change this if the home lab's domain ever changes.
const SITES_BASE_DOMAIN = 'homeslab.uk';

const EMPTY_FORM = {
  name: '',
  subdomain: '',
  title: '',
  theme: 'dark' as 'dark' | 'light',
  active: true,
  accent_color: DEFAULT_ACCENT,
  secondary_color: '',
  font_family: SITE_FONT_OPTIONS[0].value,
  heading_font: '',
  meta_description: '',
  favicon_url: '',
};

function parseThemeConfig(raw: string | null | undefined): ThemeConfig {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function slugifySubdomain(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function SitesView() {
  const [sites, setSites] = useState<Site[]>([]);
  const [blocksBySite, setBlocksBySite] = useState<Record<number, SiteBlock[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [copiedSubdomain, setCopiedSubdomain] = useState<string | null>(null);
  const [builderSite, setBuilderSite] = useState<Site | null>(null);

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSites();
      setSites(data);
      // Fetch each site's blocks in parallel, purely for the thumbnail
      // previews below — best-effort, so one failed fetch just means that
      // card falls back to the "No content yet" placeholder, not a page error.
      const entries = await Promise.all(data.map(async site => {
        try {
          return [site.id, await api.getSiteBlocks(site.id)] as const;
        } catch {
          return [site.id, []] as const;
        }
      }));
      setBlocksBySite(Object.fromEntries(entries));
    } catch (err: any) {
      console.error(err);
      setError('Failed to load sites.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setSubdomainTouched(false);
    setFormError(null);
    setShowForm(true);
    ensureGoogleFontsLoaded(SITE_FONT_OPTIONS.map(f => f.value));
  };

  const openEditForm = (site: Site) => {
    const themeConfig = parseThemeConfig(site.theme_config);
    setEditingId(site.id);
    setForm({
      name: site.name,
      subdomain: site.subdomain,
      title: site.title || '',
      theme: site.theme || 'dark',
      active: !!site.active,
      accent_color: themeConfig.accent_color || DEFAULT_ACCENT,
      secondary_color: themeConfig.secondary_color || '',
      font_family: themeConfig.font_family || SITE_FONT_OPTIONS[0].value,
      heading_font: themeConfig.heading_font || '',
      meta_description: site.meta_description || '',
      favicon_url: site.favicon_url || '',
    });
    setSubdomainTouched(true);
    setFormError(null);
    setShowForm(true);
    ensureGoogleFontsLoaded(SITE_FONT_OPTIONS.map(f => f.value));
  };

  const handleNameChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      name: value,
      subdomain: subdomainTouched ? prev.subdomain : slugifySubdomain(value),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setFormError('Name is required.');
    const cleanSub = slugifySubdomain(form.subdomain);
    if (!cleanSub) return setFormError('Subdomain is required (letters, numbers, and dashes only).');

    setSaving(true);
    setFormError(null);
    try {
      const { accent_color, secondary_color, font_family, heading_font, meta_description, favicon_url, ...rest } = form;
      const payload = {
        ...rest,
        subdomain: cleanSub,
        theme_config: { accent_color, secondary_color: secondary_color || undefined, font_family, heading_font: heading_font || undefined } as ThemeConfig,
        meta_description: meta_description || null,
        favicon_url: favicon_url || null,
      };
      if (editingId) {
        await api.updateSite(editingId, payload);
      } else {
        await api.createSite(payload);
      }
      setShowForm(false);
      await loadSites();
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'Failed to save site.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (site: Site) => {
    if (!confirm(`Delete "${site.name}"? This also deletes all its blocks and contact messages. This cannot be undone.`)) return;
    try {
      await api.deleteSite(site.id);
      await loadSites();
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete site.');
    }
  };

  const handleToggleActive = async (site: Site) => {
    try {
      await api.updateSite(site.id, { ...site, active: site.active ? 0 : 1 } as any);
      await loadSites();
    } catch (err: any) {
      console.error(err);
      alert('Failed to update site.');
    }
  };

  const liveUrlFor = (subdomain: string) => `https://${subdomain}.sites.${SITES_BASE_DOMAIN}`;
  const previewUrlFor = (subdomain: string) => `${window.location.origin}/site/${subdomain}`;

  const handleCopyLink = (subdomain: string) => {
    navigator.clipboard.writeText(liveUrlFor(subdomain));
    setCopiedSubdomain(subdomain);
    setTimeout(() => setCopiedSubdomain(null), 2000);
  };

  if (builderSite) {
    return <SiteBuilderView site={builderSite} onBack={() => { setBuilderSite(null); loadSites(); }} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="sites-view">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-theme pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary-theme" />
            Sites
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Build full webpages out of stackable blocks — each one lives at its own subdomain on your domain.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={loadSites}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs uppercase tracking-wider font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreateForm}
            className="px-4 py-2 bg-primary-theme hover:opacity-90 text-slate-950 rounded-lg text-xs uppercase tracking-wider font-black transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Site</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Sites List */}
      {loading && sites.length === 0 ? (
        <div className="py-24 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
          <span>Loading sites...</span>
        </div>
      ) : sites.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 max-w-xl mx-auto my-6 font-mono text-xs text-slate-500">
          No sites yet. Create one to start stacking blocks — hero, gallery, pricing, FAQ, whatever the page needs.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sites.map(site => (
            <div key={site.id} className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme rounded-xl p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-white uppercase tracking-wide truncate">{site.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${site.active ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/20' : 'bg-slate-800/60 text-slate-500 border-slate-600/20'}`}>
                      {site.active ? 'Active' : 'Paused'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-indigo-950/50 text-indigo-300 border-indigo-500/20 flex items-center gap-1">
                      {site.theme === 'light' ? <Sun className="w-2.5 h-2.5" /> : <Moon className="w-2.5 h-2.5" />}
                      {site.theme === 'light' ? 'Light' : 'Dark'}
                    </span>
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: parseThemeConfig(site.theme_config).accent_color || DEFAULT_ACCENT }}
                      title="Accent color"
                    />
                  </div>
                  {site.title && <p className="text-xs text-slate-400 mt-1 truncate">{site.title}</p>}
                </div>
                <button
                  onClick={() => handleToggleActive(site)}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-border-theme text-slate-300 hover:bg-bg-theme transition cursor-pointer"
                  title={site.active ? 'Pause this site' : 'Activate this site'}
                >
                  {site.active ? 'Pause' : 'Activate'}
                </button>
              </div>

              {/* Live thumbnail — real mini-render of the site's current content, not a stock icon */}
              <SiteThumbnail
                blocks={blocksBySite[site.id] || []}
                theme={parseThemeConfig(site.theme_config)}
                dark={site.theme !== 'light'}
                accent={parseThemeConfig(site.theme_config).accent_color || DEFAULT_ACCENT}
              />

              {/* Live link row */}
              <div className="flex items-center gap-2 bg-[#0c0d12] border border-[#1e2028] rounded-lg px-3 py-2">
                <span className="flex-1 text-[11px] text-slate-400 font-mono truncate">{liveUrlFor(site.subdomain)}</span>
                <button
                  onClick={() => handleCopyLink(site.subdomain)}
                  className="text-slate-400 hover:text-white transition cursor-pointer"
                  title="Copy live link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href={previewUrlFor(site.subdomain)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-white transition cursor-pointer"
                  title="Preview (works right now, no DNS setup needed)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              {copiedSubdomain === site.subdomain && (
                <span className="text-[10px] text-emerald-400 font-mono -mt-2">Link copied!</span>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-theme border border-border-theme rounded-lg p-3 flex items-center gap-2.5">
                  <div className="p-2 bg-[#0c0d12] rounded-lg text-primary-theme">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-lg font-black text-white leading-none">{site.block_count ?? 0}</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Blocks</span>
                  </div>
                </div>
                <div className="bg-bg-theme border border-border-theme rounded-lg p-3 flex items-center gap-2.5">
                  <div className="p-2 bg-[#0c0d12] rounded-lg text-cyan-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-lg font-black text-white leading-none">{site.message_count ?? 0}</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Messages</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-border-theme mt-1">
                <button
                  onClick={() => setBuilderSite(site)}
                  className="flex-1 px-3 py-2 bg-primary-theme hover:opacity-90 text-slate-950 rounded-lg text-[10px] uppercase tracking-wider font-black transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Edit Site</span>
                </button>
                <button
                  onClick={() => openEditForm(site)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] uppercase tracking-wider font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={() => handleDelete(site)}
                  className="px-3 py-2 bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 rounded-lg text-[10px] uppercase tracking-wider font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* One-time subdomain setup help card */}
      <div className="max-w-3xl mx-auto bg-[#0c0d12]/60 border border-border-theme rounded-xl p-4 text-[11px] text-slate-500 leading-relaxed font-mono">
        <span className="text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-1.5">One-time subdomain setup</span>
        Every site here shares one wildcard Cloudflare Tunnel route — add a Public Hostname for <span className="text-primary-theme">*.sites.{SITES_BASE_DOMAIN}</span> pointing at the same service Workshop Ragnarök already uses, and every site you create from here on just works at its own subdomain automatically, with zero further setup. Until that's added (or to test before it is), the preview link (↗ icon above) works right now with no DNS involved.
      </div>

      {/* Create/Edit Modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !saving && setShowForm(false)}>
          <div
            className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-border-theme bg-[#111218] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border-theme shrink-0">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                {editingId ? 'Site Settings' : 'New Site'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              {formError && (
                <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-lg p-3 text-xs font-mono">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Site Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="My Portfolio"
                  className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subdomain *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.subdomain}
                    onChange={(e) => { setSubdomainTouched(true); setForm(prev => ({ ...prev, subdomain: e.target.value })); }}
                    placeholder="my-portfolio"
                    className="flex-1 min-w-0 rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                  />
                  <span className="text-[11px] text-slate-500 font-mono shrink-0">.sites.{SITES_BASE_DOMAIN}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Browser Tab Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Defaults to the site name if left blank"
                  className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Theme</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, theme: 'dark' }))}
                    className={`flex items-center gap-2 justify-center rounded-xl p-3 border-2 transition cursor-pointer ${form.theme === 'dark' ? 'border-indigo-400 bg-indigo-950/20' : 'border-[#1e2028] bg-[#0c0d12] hover:border-slate-600'}`}
                  >
                    <Moon className="w-4 h-4 text-indigo-300" />
                    <span className="text-xs font-bold text-white">Dark</span>
                    {form.theme === 'dark' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-300" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, theme: 'light' }))}
                    className={`flex items-center gap-2 justify-center rounded-xl p-3 border-2 transition cursor-pointer ${form.theme === 'light' ? 'border-amber-400 bg-amber-950/20' : 'border-[#1e2028] bg-[#0c0d12] hover:border-slate-600'}`}
                  >
                    <Sun className="w-4 h-4 text-amber-300" />
                    <span className="text-xs font-bold text-white">Light</span>
                    {form.theme === 'light' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <Palette className="w-3 h-3" /> Accent Color
                  </label>
                  <div className="flex items-center gap-2 rounded-lg bg-[#0c0d12] border border-[#1e2028] px-2 py-1.5">
                    <input
                      type="color"
                      value={form.accent_color}
                      onChange={(e) => setForm(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0"
                    />
                    <input
                      type="text"
                      value={form.accent_color}
                      onChange={(e) => setForm(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="flex-1 min-w-0 bg-transparent text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <Type className="w-3 h-3" /> Font
                  </label>
                  <select
                    value={form.font_family}
                    onChange={(e) => setForm(prev => ({ ...prev, font_family: e.target.value }))}
                    className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-2 py-2 text-xs text-white focus:outline-none h-[38px]"
                    style={{ fontFamily: form.font_family }}
                  >
                    {SITE_FONT_OPTIONS.map(f => (
                      <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 -mt-2">The accent color drives buttons and highlights across every block; the font applies site-wide and can be overridden per block.</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <Palette className="w-3 h-3" /> Secondary Color
                  </label>
                  <div className="flex items-center gap-2 rounded-lg bg-[#0c0d12] border border-[#1e2028] px-2 py-1.5">
                    <input
                      type="color"
                      value={form.secondary_color || '#334155'}
                      onChange={(e) => setForm(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0"
                    />
                    <input
                      type="text"
                      value={form.secondary_color}
                      onChange={(e) => setForm(prev => ({ ...prev, secondary_color: e.target.value }))}
                      placeholder="Optional"
                      className="flex-1 min-w-0 bg-transparent text-xs text-white font-mono placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <Type className="w-3 h-3" /> Heading Font
                  </label>
                  <select
                    value={form.heading_font}
                    onChange={(e) => setForm(prev => ({ ...prev, heading_font: e.target.value }))}
                    className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-2 py-2 text-xs text-white focus:outline-none h-[38px]"
                    style={{ fontFamily: form.heading_font || undefined }}
                  >
                    <option value="">Same as body font</option>
                    {SITE_FONT_OPTIONS.map(f => (
                      <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-border-theme space-y-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Search className="w-3 h-3" /> SEO & Browser
                </span>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Meta Description</label>
                  <textarea
                    value={form.meta_description}
                    onChange={(e) => setForm(prev => ({ ...prev, meta_description: e.target.value }))}
                    placeholder="A short summary shown in search results and link previews"
                    rows={2}
                    className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none resize-y"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <ImageIcon className="w-3 h-3" /> Favicon URL
                  </label>
                  <input
                    type="text"
                    value={form.favicon_url}
                    onChange={(e) => setForm(prev => ({ ...prev, favicon_url: e.target.value }))}
                    placeholder="https://... (.ico, .png, or .svg)"
                    className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm(prev => ({ ...prev, active: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span>Active (visible at the public URL)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-border-theme shrink-0">
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs uppercase tracking-wider font-bold transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary-theme hover:opacity-90 text-slate-950 rounded-lg text-xs uppercase tracking-wider font-black transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingId ? 'Save Changes' : 'Create Site'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
