import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Funnel, FunnelLead } from '../types';
import {
  Megaphone, Plus, Pencil, Trash2, Copy, ExternalLink, Loader2, X,
  Users, CheckCircle2, Clock, Ban, RefreshCw
} from 'lucide-react';

const EMPTY_FORM = {
  slug: '',
  headline: '',
  subheadline: '',
  body: '',
  service_type: '',
  cta_text: 'Get My Free Quote',
  image_url: '',
  video_url: '',
  active: true,
};

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function FunnelsView() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [slugTouched, setSlugTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [leadsFunnel, setLeadsFunnel] = useState<Funnel | null>(null);
  const [leads, setLeads] = useState<FunnelLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

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
      active: !!funnel.active,
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

  const handleSave = async () => {
    if (!form.headline.trim()) return setFormError('Headline is required.');
    const cleanSlug = slugify(form.slug);
    if (!cleanSlug) return setFormError('Slug is required (letters, numbers, and dashes only).');

    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form, slug: cleanSlug };
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
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={loadFunnels}
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-white uppercase tracking-wide truncate">{funnel.headline}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${funnel.active ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/20' : 'bg-slate-800/60 text-slate-500 border-slate-600/20'}`}>
                      {funnel.active ? 'Active' : 'Paused'}
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
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto" onClick={() => !saving && setShowForm(false)}>
          <div
            className="bg-[#111218] border border-border-theme rounded-2xl shadow-2xl w-full max-w-lg my-8 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border-theme">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                {editingId ? 'Edit Funnel' : 'New Funnel'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-lg p-3 text-xs font-mono">
                  {formError}
                </div>
              )}

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
                  <span className="text-[11px] text-slate-500 font-mono">/funnel/</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => { setSlugTouched(true); setForm(prev => ({ ...prev, slug: e.target.value })); }}
                    placeholder="get-a-quote"
                    className="flex-1 rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                  />
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

              <div className="grid grid-cols-2 gap-3">
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

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Hero Image URL</label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Hero Video URL (optional)</label>
                <input
                  type="text"
                  value={form.video_url}
                  onChange={(e) => setForm(prev => ({ ...prev, video_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                />
              </div>

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

            <div className="flex items-center justify-end gap-2 p-5 border-t border-border-theme">
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
        </div>
      )}

      {/* Leads Modal */}
      {leadsFunnel && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto" onClick={() => setLeadsFunnel(null)}>
          <div
            className="bg-[#111218] border border-border-theme rounded-2xl shadow-2xl w-full max-w-3xl my-8 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border-theme">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Leads — {leadsFunnel.headline}</h2>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{publicUrlFor(leadsFunnel.slug)}</p>
              </div>
              <button onClick={() => setLeadsFunnel(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-theme text-[10px] text-slate-500 uppercase tracking-wider">
                        <th className="px-3 py-2 font-bold">Name</th>
                        <th className="px-3 py-2 font-bold">Contact</th>
                        <th className="px-3 py-2 font-bold">Vehicle</th>
                        <th className="px-3 py-2 font-bold">Message</th>
                        <th className="px-3 py-2 font-bold">Status</th>
                        <th className="px-3 py-2 font-bold">Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-theme text-xs">
                      {leads.map(lead => {
                        const vehicle = [lead.vehicle_year, lead.vehicle_make, lead.vehicle_model].filter(Boolean).join(' ');
                        return (
                          <tr key={lead.id}>
                            <td className="px-3 py-3 font-bold text-white">{lead.name || '—'}</td>
                            <td className="px-3 py-3 text-slate-300">
                              <div>{lead.phone || '—'}</div>
                              <div className="text-slate-500">{lead.email || '—'}</div>
                            </td>
                            <td className="px-3 py-3 text-slate-300">{vehicle || '—'}</td>
                            <td className="px-3 py-3 text-slate-400 max-w-xs truncate" title={lead.message}>{lead.message || '—'}</td>
                            <td className="px-3 py-3">
                              {statusBadge(lead.status)}
                              {lead.status === 'converted' && lead.job_status && (
                                <div className="text-[9px] text-slate-500 mt-1 font-mono uppercase">Job: {lead.job_status}</div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-slate-500 font-mono text-[10px]">
                              {new Date(lead.created_at).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
