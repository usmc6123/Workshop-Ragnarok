import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { Funnel, FunnelLead } from '../types';
import MediaField from './MediaField';
import MediaLibraryModal from './MediaLibraryModal';
import {
  Megaphone, Plus, Pencil, Trash2, Copy, ExternalLink, Loader2, X,
  Users, CheckCircle2, Clock, Ban, RefreshCw, LayoutTemplate, Sparkles, ImageOff, Clapperboard, Code2, Check,
  Image as ImageIcon, FolderOpen,
} from 'lucide-react';

// Sensible starting height for the embed iframe, per layout — these are just defaults
// the shop owner can override in the Embed modal, since actual content height varies
// with how much body text / how many fields are shown.
const DEFAULT_EMBED_HEIGHT: Record<string, number> = {
  classic: 1500,
  modern: 1550,
  video: 1750,
};

const EMPTY_FORM = {
  slug: '',
  headline: '',
  subheadline: '',
  body: '',
  service_type: '',
  cta_text: 'Get My Free Quote',
  image_url: '',
  video_url: '',
  card_video_url: '',
  headline_bg_image_url: '',
  headline_bg_video_url: '',
  headline_bg_video_url_2: '',
  secondary_video_url: '',
  secondary_video_url_2: '',
  hero_video_url: '',
  video_form_bg_image_url: '',
  media_opacity: {} as Record<string, number>,
  active: true,
  layout: 'classic' as 'classic' | 'modern' | 'video',
};

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function FunnelsView() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [slugTouched, setSlugTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [leadsFunnel, setLeadsFunnel] = useState<Funnel | null>(null);
  const [leads, setLeads] = useState<FunnelLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const [embedFunnel, setEmbedFunnel] = useState<Funnel | null>(null);
  const [embedWidth, setEmbedWidth] = useState('100%');
  const [embedHeight, setEmbedHeight] = useState(1500);
  const [embedCopied, setEmbedCopied] = useState(false);

  useEffect(() => {
    loadFunnels();
  }, []);

  const loadFunnels = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFunnels();
      setFunnels(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load funnels.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setSlugTouched(false);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (funnel: Funnel) => {
    setEditingId(funnel.id);
    setForm({
      slug: funnel.slug,
      headline: funnel.headline,
      subheadline: funnel.subheadline || '',
      body: funnel.body || '',
      service_type: funnel.service_type || '',
      cta_text: funnel.cta_text || 'Get My Free Quote',
      image_url: funnel.image_url || '',
      video_url: funnel.video_url || '',
      card_video_url: funnel.card_video_url || '',
      headline_bg_image_url: funnel.headline_bg_image_url || '',
      headline_bg_video_url: funnel.headline_bg_video_url || '',
      headline_bg_video_url_2: funnel.headline_bg_video_url_2 || '',
      secondary_video_url: funnel.secondary_video_url || '',
      secondary_video_url_2: funnel.secondary_video_url_2 || '',
      hero_video_url: funnel.hero_video_url || '',
      video_form_bg_image_url: funnel.video_form_bg_image_url || '',
      media_opacity: (() => {
        try {
          return funnel.media_opacity ? JSON.parse(funnel.media_opacity) : {};
        } catch {
          return {};
        }
      })(),
      active: !!funnel.active,
      layout: funnel.layout || 'classic',
    });
    setSlugTouched(true);
    setFormError(null);
    setShowForm(true);
  };

  const handleHeadlineChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      headline: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  };

  const updateOpacity = (key: string, value: number) => {
    setForm(prev => ({ ...prev, media_opacity: { ...prev.media_opacity, [key]: value } }));
  };

  const handleSave = async () => {
    if (!form.headline.trim()) return setFormError('Headline is required.');
    const cleanSlug = slugify(form.slug);
    if (!cleanSlug) return setFormError('Slug is required (letters, numbers, and dashes only).');

    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form, slug: cleanSlug, media_opacity: JSON.stringify(form.media_opacity || {}) };
      if (editingId) {
        await api.updateFunnel(editingId, payload);
      } else {
        await api.createFunnel(payload);
      }
      setShowForm(false);
      await loadFunnels();
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'Failed to save funnel.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (funnel: Funnel) => {
    if (!confirm(`Delete "${funnel.headline}"? This also deletes its captured leads. This cannot be undone.`)) return;
    try {
      await api.deleteFunnel(funnel.id);
      await loadFunnels();
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete funnel.');
    }
  };

  const handleToggleActive = async (funnel: Funnel) => {
    try {
      await api.updateFunnel(funnel.id, { ...funnel, active: !funnel.active });
      await loadFunnels();
    } catch (err: any) {
      console.error(err);
      alert('Failed to update funnel.');
    }
  };

  const publicUrlFor = (slug: string) => `${window.location.origin}/funnel/${slug}`;

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(publicUrlFor(slug));
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const openEmbed = (funnel: Funnel) => {
    setEmbedFunnel(funnel);
    setEmbedWidth('100%');
    setEmbedHeight(DEFAULT_EMBED_HEIGHT[funnel.layout] || 1500);
    setEmbedCopied(false);
  };

  const embedCodeFor = (funnel: Funnel, width: string, height: number) =>
    `<iframe src="${publicUrlFor(funnel.slug)}" style="width:${width}; height:${height}px; border:0;" loading="lazy" title="${funnel.headline.replace(/"/g, '&quot;')}"></iframe>`;

  const handleCopyEmbed = () => {
    if (!embedFunnel) return;
    navigator.clipboard.writeText(embedCodeFor(embedFunnel, embedWidth, embedHeight));
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const openLeads = async (funnel: Funnel) => {
    setLeadsFunnel(funnel);
    setLeadsLoading(true);
    try {
      const data = await api.getFunnelLeads(funnel.id);
      setLeads(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLeadsLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: 'bg-blue-950/50 text-blue-400 border-blue-500/20',
      converted: 'bg-emerald-950/55 text-emerald-400 border-emerald-500/20',
      spam: 'bg-slate-800/60 text-slate-500 border-slate-600/20',
    };
    const icons: Record<string, React.ReactNode> = {
      new: <Clock className="w-3 h-3" />,
      converted: <CheckCircle2 className="w-3 h-3" />,
      spam: <Ban className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${styles[status] || styles.new}`}>
        {icons[status]}
        <span>{status}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="funnels-view">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-theme pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary-theme" />
            Funnels
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Public landing pages that turn social/QR traffic into Customers + Jobs automatically.
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start md:self-center flex-nowrap overflow-x-auto">
          <a
            href="https://gemini.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] uppercase tracking-wider font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="Opens Gemini in a new tab for image generation"
          >
            <ImageIcon className="w-3 h-3 text-primary-theme shrink-0" />
            <span>Generate Image</span>
          </a>
          <a
            href="https://labs.google/fx/tools/flow"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] uppercase tracking-wider font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="Opens Google Flow (Veo video generation) in a new tab — uses your Google AI Pro Flow credits"
          >
            <Sparkles className="w-3 h-3 text-primary-theme shrink-0" />
            <span>Generate Video</span>
          </a>
          <button
            onClick={() => setShowMediaLibrary(true)}
            className="shrink-0 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] uppercase tracking-wider font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="Browse everything you've uploaded or reformatted"
          >
            <FolderOpen className="w-3 h-3 text-primary-theme shrink-0" />
            <span>Formatted Media</span>
          </button>
          <button
            onClick={loadFunnels}
            disabled={loading}
            className="shrink-0 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] uppercase tracking-wider font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : <RefreshCw className="w-3 h-3 shrink-0" />}
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreateForm}
            className="shrink-0 px-2.5 py-1.5 bg-primary-theme hover:opacity-90 text-slate-950 rounded-lg text-[10px] uppercase tracking-wider font-black transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3 h-3 shrink-0" />
            <span>New Funnel</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Funnels List */}
      {loading && funnels.length === 0 ? (
        <div className="py-24 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
          <span>Loading funnels...</span>
        </div>
      ) : funnels.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 max-w-xl mx-auto my-6 font-mono text-xs text-slate-500">
          No funnels yet. Create one to get a public lead-capture link you can drop in a social bio, QR code, or anywhere else.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {funnels.map(funnel => (
            <div key={funnel.id} className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme rounded-xl p-5 shadow-xl flex flex-col gap-4">
              {/* Thumbnail preview */}
              <div className="w-full aspect-video rounded-lg overflow-hidden border border-border-theme bg-[#0c0d12] flex items-center justify-center">
                {funnel.image_url ? (
                  <img src={funnel.image_url} alt={funnel.headline} className="w-full h-full object-cover" />
                ) : funnel.video_url ? (
                  <video src={funnel.video_url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                ) : funnel.hero_video_url ? (
                  // Video-layout funnels usually have no image_url/video_url set — fall back to the
                  // hero dialogue video itself. No poster/currentTime needed: browsers render the
                  // first frame by default once metadata loads, which is exactly the "thumbnail"
                  // effect we want without asking for a separate image upload.
                  <video src={funnel.hero_video_url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-600">
                    <ImageOff className="w-6 h-6" />
                    <span className="text-[9px] uppercase tracking-wider font-bold">No preview media</span>
                  </div>
                )}
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-white uppercase tracking-wide truncate">{funnel.headline}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${funnel.active ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/20' : 'bg-slate-800/60 text-slate-500 border-slate-600/20'}`}>
                      {funnel.active ? 'Active' : 'Paused'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                      funnel.layout === 'modern' ? 'bg-cyan-950/50 text-cyan-400 border-cyan-500/20'
                      : funnel.layout === 'video' ? 'bg-rose-950/50 text-rose-400 border-rose-500/20'
                      : 'bg-amber-950/50 text-amber-400 border-amber-500/20'
                    }`}>
                      {funnel.layout === 'modern' ? <Sparkles className="w-2.5 h-2.5" />
                        : funnel.layout === 'video' ? <Clapperboard className="w-2.5 h-2.5" />
                        : <LayoutTemplate className="w-2.5 h-2.5" />}
                      {funnel.layout === 'modern' ? 'Modern' : funnel.layout === 'video' ? 'Video' : 'Classic'}
                    </span>
                  </div>
                  {funnel.subheadline && (
                    <p className="text-xs text-slate-400 mt-1 truncate">{funnel.subheadline}</p>
                  )}
                  {funnel.service_type && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-wider">{funnel.service_type}</p>
                  )}
                </div>
                <button
                  onClick={() => handleToggleActive(funnel)}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-border-theme text-slate-300 hover:bg-bg-theme transition cursor-pointer"
                  title={funnel.active ? 'Pause this funnel' : 'Activate this funnel'}
                >
                  {funnel.active ? 'Pause' : 'Activate'}
                </button>
              </div>

              {/* Public link row */}
              <div className="flex items-center gap-2 bg-[#0c0d12] border border-[#1e2028] rounded-lg px-3 py-2">
                <span className="flex-1 text-[11px] text-slate-400 font-mono truncate">{publicUrlFor(funnel.slug)}</span>
                <button
                  onClick={() => handleCopyLink(funnel.slug)}
                  className="text-slate-400 hover:text-white transition cursor-pointer"
                  title="Copy public link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href={publicUrlFor(funnel.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-white transition cursor-pointer"
                  title="Open funnel page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              {copiedSlug === funnel.slug && (
                <span className="text-[10px] text-emerald-400 font-mono -mt-2">Link copied!</span>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-theme border border-border-theme rounded-lg p-3 flex items-center gap-2.5">
                  <div className="p-2 bg-[#0c0d12] rounded-lg text-primary-theme">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-lg font-black text-white leading-none">{funnel.lead_count ?? 0}</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Leads</span>
                  </div>
                </div>
                <div className="bg-bg-theme border border-border-theme rounded-lg p-3 flex items-center gap-2.5">
                  <div className="p-2 bg-[#0c0d12] rounded-lg text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-lg font-black text-white leading-none">{funnel.converted_count ?? 0}</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Converted to Jobs</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-border-theme mt-1">
                <button
                  onClick={() => openLeads(funnel)}
                  className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] uppercase tracking-wider font-bold transition cursor-pointer"
                >
                  View Leads
                </button>
                <button
                  onClick={() => openEmbed(funnel)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] uppercase tracking-wider font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Get an embed code to drop this funnel into Squarespace or any website"
                >
                  <Code2 className="w-3 h-3" />
                  <span>Embed</span>
                </button>
                <button
                  onClick={() => openEditForm(funnel)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] uppercase tracking-wider font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(funnel)}
                  className="px-3 py-2 bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 rounded-lg text-[10px] uppercase tracking-wider font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !saving && setShowForm(false)}>
          <div
            className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-border-theme bg-[#111218] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border-theme shrink-0">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                {editingId ? 'Edit Funnel' : 'New Funnel'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-7 overflow-y-auto flex-1 min-h-0">
              {formError && (
                <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-lg p-3 text-xs font-mono">
                  {formError}
                </div>
              )}

              {/* --- Basic Info --- */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-border-theme pb-2">Basic Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Headline *</label>
                    <input
                      type="text"
                      value={form.headline}
                      onChange={(e) => handleHeadlineChange(e.target.value)}
                      placeholder="Tell Us What's Wrong — Get a Free Quote"
                      className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Public Slug *</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-mono shrink-0">/funnel/</span>
                      <input
                        type="text"
                        value={form.slug}
                        onChange={(e) => { setSlugTouched(true); setForm(prev => ({ ...prev, slug: e.target.value })); }}
                        placeholder="get-a-quote"
                        className="flex-1 min-w-0 rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subheadline</label>
                  <input
                    type="text"
                    value={form.subheadline}
                    onChange={(e) => setForm(prev => ({ ...prev, subheadline: e.target.value }))}
                    placeholder="Describe the issue or upload a photo — we'll follow up fast."
                    className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Body Text</label>
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm(prev => ({ ...prev, body: e.target.value }))}
                    rows={3}
                    placeholder="Longer supporting copy shown on the funnel page..."
                    className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Service Type</label>
                    <input
                      type="text"
                      value={form.service_type}
                      onChange={(e) => setForm(prev => ({ ...prev, service_type: e.target.value }))}
                      placeholder="General Inquiry"
                      className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Button Text</label>
                    <input
                      type="text"
                      value={form.cta_text}
                      onChange={(e) => setForm(prev => ({ ...prev, cta_text: e.target.value }))}
                      className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* --- Page Layout (moved up so the media section below makes contextual sense) --- */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-border-theme pb-2">Page Layout</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, layout: 'classic' }))}
                    className={`text-left rounded-xl p-3 border-2 transition cursor-pointer ${form.layout === 'classic' ? 'border-amber-500 bg-amber-950/20' : 'border-[#1e2028] bg-[#0c0d12] hover:border-slate-600'}`}
                  >
                    <div className="w-full h-14 rounded-lg bg-gradient-to-br from-slate-800 to-black border border-amber-500/30 flex items-center justify-center mb-2">
                      <LayoutTemplate className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">Classic</span>
                      {form.layout === 'classic' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Bold, straightforward auto-shop style.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, layout: 'modern' }))}
                    className={`text-left rounded-xl p-3 border-2 transition cursor-pointer ${form.layout === 'modern' ? 'border-cyan-400 bg-cyan-950/20' : 'border-[#1e2028] bg-[#0c0d12] hover:border-slate-600'}`}
                  >
                    <div className="w-full h-14 rounded-lg bg-gradient-to-br from-indigo-950 via-slate-900 to-black border border-cyan-400/40 flex items-center justify-center mb-2 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">Modern</span>
                      {form.layout === 'modern' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Vibrant, glowing, 3D showcase style.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, layout: 'video' }))}
                    className={`text-left rounded-xl p-3 border-2 transition cursor-pointer ${form.layout === 'video' ? 'border-rose-500 bg-rose-950/20' : 'border-[#1e2028] bg-[#0c0d12] hover:border-slate-600'}`}
                  >
                    <div className="w-full h-14 rounded-lg bg-gradient-to-br from-black via-rose-950/40 to-black border border-rose-500/40 flex items-center justify-center mb-2 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
                      <Clapperboard className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">Video</span>
                      {form.layout === 'video' && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Cinematic — a big click-to-play video with sound leads the page.</p>
                  </button>
                </div>
              </div>

              {/* --- Hero Media (used across every layout) --- */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-border-theme pb-2">Hero Media</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MediaField
                    label="Hero Image URL"
                    labelColorClass="text-slate-400"
                    accentClass="accent-amber-500"
                    value={form.image_url}
                    onChange={(v) => setForm(prev => ({ ...prev, image_url: v }))}
                    opacityKey="image_url"
                    mediaOpacity={form.media_opacity}
                    onOpacityChange={updateOpacity}
                    showOpacity
                    accept="image"
                  />
                  <MediaField
                    label="Hero Video URL (optional)"
                    labelColorClass="text-slate-400"
                    accentClass="accent-amber-500"
                    value={form.video_url}
                    onChange={(v) => setForm(prev => ({ ...prev, video_url: v }))}
                    opacityKey="video_url"
                    mediaOpacity={form.media_opacity}
                    onOpacityChange={updateOpacity}
                    showOpacity
                    accept="video"
                  />
                </div>
              </div>

              {/* --- Classic Layout Media --- */}
              {form.layout === 'classic' && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-400 border-b border-amber-500/20 pb-2">Classic Layout Media</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MediaField
                      label="Headline Box Background Image"
                      labelColorClass="text-amber-400"
                      accentClass="accent-amber-500"
                      value={form.headline_bg_image_url}
                      onChange={(v) => setForm(prev => ({ ...prev, headline_bg_image_url: v }))}
                      opacityKey="headline_bg_image_url"
                      mediaOpacity={form.media_opacity}
                      onOpacityChange={updateOpacity}
                      showOpacity
                      accept="image"
                      help="Sits behind the headline/subheadline/body text, with a dark overlay so text stays readable. Ignored if a background video below is set."
                    />
                    <MediaField
                      label="Headline Box Background Video — Clip 1"
                      labelColorClass="text-amber-400"
                      accentClass="accent-amber-500"
                      value={form.headline_bg_video_url}
                      onChange={(v) => setForm(prev => ({ ...prev, headline_bg_video_url: v }))}
                      opacityKey="headline_bg_video_url"
                      mediaOpacity={form.media_opacity}
                      onOpacityChange={updateOpacity}
                      showOpacity
                      accept="video"
                      placeholder="https://.../fr-1.mp4"
                      help="Plays behind the headline text, in place of the background image. Plays first if a Clip 2 is also set. This slider also controls Clip 2's brightness, since they share one loop."
                    />
                    <MediaField
                      label="Headline Box Background Video — Clip 2"
                      labelColorClass="text-amber-400"
                      accentClass="accent-amber-500"
                      value={form.headline_bg_video_url_2}
                      onChange={(v) => setForm(prev => ({ ...prev, headline_bg_video_url_2: v }))}
                      opacityKey="headline_bg_video_url"
                      mediaOpacity={form.media_opacity}
                      onOpacityChange={updateOpacity}
                      showOpacity
                      accept="video"
                      placeholder="https://.../fr-2.mp4"
                      help="Plays right after Clip 1 finishes, then the pair loops back to Clip 1. Leave blank to just loop Clip 1 alone."
                    />
                    <MediaField
                      label="Quote Form Background Video — Clip 1"
                      labelColorClass="text-amber-400"
                      accentClass="accent-amber-500"
                      value={form.secondary_video_url}
                      onChange={(v) => setForm(prev => ({ ...prev, secondary_video_url: v }))}
                      opacityKey="secondary_video_url"
                      mediaOpacity={form.media_opacity}
                      onOpacityChange={updateOpacity}
                      showOpacity
                      accept="video"
                      help="Loops behind the name/phone/email/vehicle quote form, with a dark overlay so it stays readable. Plays first if a Clip 2 is also set."
                    />
                    <MediaField
                      label="Quote Form Background Video — Clip 2"
                      labelColorClass="text-amber-400"
                      accentClass="accent-amber-500"
                      value={form.secondary_video_url_2}
                      onChange={(v) => setForm(prev => ({ ...prev, secondary_video_url_2: v }))}
                      opacityKey="secondary_video_url"
                      mediaOpacity={form.media_opacity}
                      onOpacityChange={updateOpacity}
                      showOpacity
                      accept="video"
                      help="Plays right after Clip 1 finishes, then the pair loops back to Clip 1. Leave blank to just loop Clip 1 alone. Shares its transparency slider with Clip 1 above."
                    />
                  </div>
                </div>
              )}

              {/* --- Modern Layout Media --- */}
              {form.layout === 'modern' && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 border-b border-cyan-500/20 pb-2">Modern Layout Media</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MediaField
                      label="Form Card Background Video URL"
                      labelColorClass="text-cyan-400"
                      accentClass="accent-cyan-400"
                      value={form.card_video_url}
                      onChange={(v) => setForm(prev => ({ ...prev, card_video_url: v }))}
                      opacityKey="card_video_url"
                      mediaOpacity={form.media_opacity}
                      onOpacityChange={updateOpacity}
                      showOpacity
                      accept="video"
                      help="Loops behind the quote form's glass card — use a muted looping clip."
                    />
                  </div>
                </div>
              )}

              {/* --- Video Layout Media --- */}
              {form.layout === 'video' && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-400 border-b border-rose-500/20 pb-2">Video Layout Media</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MediaField
                      label="Hero Dialogue Video"
                      labelColorClass="text-rose-400"
                      accentClass="accent-rose-500"
                      value={form.hero_video_url}
                      onChange={(v) => setForm(prev => ({ ...prev, hero_video_url: v }))}
                      opacityKey="hero_video_url"
                      mediaOpacity={form.media_opacity}
                      onOpacityChange={updateOpacity}
                      showOpacity
                      accept="video"
                      help="Shown big, front and center, with real playback controls and full sound — visitors click play, watch/hear the pitch, then the quote form sits right underneath. Browsers won't autoplay audio, so this is click-to-play by design."
                    />
                    <MediaField
                      label="Quote Form Background Image"
                      labelColorClass="text-rose-400"
                      accentClass="accent-rose-500"
                      value={form.video_form_bg_image_url}
                      onChange={(v) => setForm(prev => ({ ...prev, video_form_bg_image_url: v }))}
                      opacityKey="video_form_bg_image_url"
                      mediaOpacity={form.media_opacity}
                      onOpacityChange={updateOpacity}
                      showOpacity
                      accept="image"
                      help="Sits behind the name/phone/email/vehicle quote form, with a dark overlay so it stays readable."
                    />
                  </div>
                </div>
              )}

              {/* --- Publish --- */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-border-theme pb-2">Publish</h3>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm(prev => ({ ...prev, active: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span>Active (visible at the public URL)</span>
                </label>
              </div>
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
                <span>{editingId ? 'Save Changes' : 'Create Funnel'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Leads Modal */}
      {leadsFunnel && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setLeadsFunnel(null)}>
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border-theme bg-[#111218] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border-theme shrink-0">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Leads — {leadsFunnel.headline}</h2>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{publicUrlFor(leadsFunnel.slug)}</p>
              </div>
              <button onClick={() => setLeadsFunnel(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 min-h-0">
              {leadsLoading ? (
                <div className="py-16 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
                  <span>Loading leads...</span>
                </div>
              ) : leads.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-[#1e2028] rounded-xl font-mono text-xs text-slate-500">
                  No leads captured yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {leads.map(lead => {
                    const vehicle = [lead.vehicle_year, lead.vehicle_make, lead.vehicle_model].filter(Boolean).join(' ');
                    return (
                      <div key={lead.id} className="rounded-xl border border-border-theme bg-bg-theme/40 p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <div className="font-bold text-white text-sm">{lead.name || '—'}</div>
                            <div className="text-slate-500 font-mono text-[10px] mt-0.5">
                              {new Date(lead.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            {statusBadge(lead.status)}
                            {lead.status === 'converted' && lead.job_status && (
                              <div className="text-[9px] text-slate-500 mt-1 font-mono uppercase">Job: {lead.job_status}</div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
                          <div className="text-slate-300">
                            <span className="text-slate-500 uppercase text-[9px] tracking-wider mr-1.5">Phone:</span>
                            {lead.phone || '—'}
                          </div>
                          <div className="text-slate-300 break-all">
                            <span className="text-slate-500 uppercase text-[9px] tracking-wider mr-1.5">Email:</span>
                            {lead.email || '—'}
                          </div>
                          <div className="text-slate-300 sm:col-span-2">
                            <span className="text-slate-500 uppercase text-[9px] tracking-wider mr-1.5">Vehicle:</span>
                            {vehicle || '—'}
                          </div>
                        </div>

                        {lead.message && (
                          <div className="mt-3 pt-3 border-t border-border-theme/60">
                            <span className="text-slate-500 uppercase text-[9px] tracking-wider">Message:</span>
                            <p className="text-slate-300 text-xs mt-1 whitespace-pre-wrap break-words">{lead.message}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Embed Code Modal */}
      {embedFunnel && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setEmbedFunnel(null)}>
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border-theme bg-[#111218] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border-theme shrink-0">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-primary-theme" />
                  Embed — {embedFunnel.headline}
                </h2>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Drop this into a Squarespace Embed Block (or any site's HTML/embed block) to show the funnel inline, right where you want it.
                </p>
              </div>
              <button onClick={() => setEmbedFunnel(null)} className="text-slate-400 hover:text-white cursor-pointer shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Width</label>
                  <input
                    type="text"
                    value={embedWidth}
                    onChange={(e) => setEmbedWidth(e.target.value)}
                    placeholder="100%"
                    className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-primary-theme px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                  />
                  <p className="text-[9px] text-slate-600 mt-1">Usually just "100%" so it fills whatever column/section you drop it in.</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={embedHeight}
                    onChange={(e) => setEmbedHeight(Math.max(300, parseInt(e.target.value, 10) || 0))}
                    className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-primary-theme px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                  />
                  <p className="text-[9px] text-slate-600 mt-1">
                    Defaulted for a {embedFunnel.layout} layout — bump it up or down after checking the preview below so nothing gets cut off or leaves dead space.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Live Preview</label>
                <div className="rounded-lg border border-[#1e2028] overflow-y-auto bg-black" style={{ height: 420 }}>
                  <iframe
                    src={publicUrlFor(embedFunnel.slug)}
                    style={{ width: '100%', height: embedHeight, border: 0, display: 'block' }}
                    title="Embed preview"
                  />
                </div>
                <p className="text-[9px] text-slate-600 mt-1">Scroll inside the box above — it's showing the real page at the height you've set, just capped in a smaller window here for preview.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Embed Code</label>
                <textarea
                  readOnly
                  value={embedCodeFor(embedFunnel, embedWidth, embedHeight)}
                  rows={3}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] px-3 py-2 text-[11px] text-slate-300 font-mono resize-none focus:outline-none focus:border-primary-theme"
                />
              </div>

              <div className="bg-bg-theme/40 border border-border-theme rounded-lg p-3 text-[10px] text-slate-500 leading-relaxed">
                On Squarespace: edit the page, add a block, choose <span className="text-slate-300 font-bold">Embed</span> (sometimes called "Code"),
                paste the code above, then adjust the Height field here and re-copy if it looks cut off or has extra dead space once it's live.
                Note the Embed/Code block that accepts raw HTML like this is a Business-plan-or-higher Squarespace feature — on a Personal plan, use a
                button linking to the public URL instead.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-border-theme shrink-0">
              <button
                onClick={() => setEmbedFunnel(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs uppercase tracking-wider font-bold transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleCopyEmbed}
                className="px-4 py-2 bg-primary-theme hover:opacity-90 text-slate-950 rounded-lg text-xs uppercase tracking-wider font-black transition flex items-center gap-1.5 cursor-pointer"
              >
                {embedCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{embedCopied ? 'Copied!' : 'Copy Embed Code'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showMediaLibrary && <MediaLibraryModal onClose={() => setShowMediaLibrary(false)} />}
    </div>
  );
}
