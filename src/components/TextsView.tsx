import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { SmsMessage, SmsTriggerType, SmsStatus, Customer } from '../types';
import {
  MessageSquare, Send, Search, Plus, ChevronLeft, Clock, Wrench,
  Megaphone, User, X, Loader2, CheckCircle2, AlertTriangle, Zap
} from 'lucide-react';

const TRIGGER_META: Record<SmsTriggerType, { label: string; icon: any; color: string }> = {
  manual: { label: 'Manual', icon: User, color: 'text-slate-400' },
  appointment_reminder: { label: 'Reminder', icon: Clock, color: 'text-blue-400' },
  job_complete: { label: 'Job Complete', icon: Wrench, color: 'text-green-400' },
  funnel_confirmation: { label: 'Funnel Lead', icon: Megaphone, color: 'text-purple-400' },
  funnel_admin_alert: { label: 'Funnel Alert', icon: Megaphone, color: 'text-amber-400' },
};

const STATUS_META: Record<SmsStatus, { label: string; icon: any; color: string }> = {
  sent: { label: 'Sent', icon: CheckCircle2, color: 'text-emerald-400' },
  failed: { label: 'Failed', icon: AlertTriangle, color: 'text-red-400' },
  not_configured: { label: 'Twilio not connected', icon: AlertTriangle, color: 'text-amber-400' },
};

interface Conversation {
  key: string;
  customerId: number | null;
  customerName: string;
  phone: string;
  messages: SmsMessage[];
  lastMessage: SmsMessage;
}

function buildConversations(messages: SmsMessage[]): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const m of messages) {
    const key = m.customer_id ? `c-${m.customer_id}` : `p-${m.phone}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        customerId: m.customer_id,
        customerName: m.customer_name || 'Unknown Contact',
        phone: m.phone,
        messages: [],
        lastMessage: m,
      });
    }
    map.get(key)!.messages.push(m);
  }
  const list = Array.from(map.values());
  for (const c of list) {
    c.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    c.lastMessage = c.messages[c.messages.length - 1];
  }
  list.sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
  return list;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function TextsView() {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [composeText, setComposeText] = useState('');
  const [sending, setSending] = useState(false);

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newConvoCustomerId, setNewConvoCustomerId] = useState('');
  const [newConvoText, setNewConvoText] = useState('');
  const [newConvoSending, setNewConvoSending] = useState(false);
  const [newConvoError, setNewConvoError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [msgs, custs, status] = await Promise.all([
        api.getSmsMessages(),
        api.getCustomers(),
        api.getSmsStatus(),
      ]);
      setMessages(msgs);
      setCustomers(custs);
      setSmsConfigured(status.configured);
    } catch (err) {
      console.error('Failed to load Texts page data:', err);
    } finally {
      setLoading(false);
    }
  };

  const conversations = useMemo(() => buildConversations(messages), [messages]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter(c => c.customerName.toLowerCase().includes(q) || c.phone.includes(q));
  }, [conversations, searchQuery]);

  const selectedConversation = conversations.find(c => c.key === selectedKey) || null;

  const handleSelectConversation = (key: string) => {
    setSelectedKey(key);
    setMobileShowThread(true);
    setComposeText('');
  };

  const handleSend = async () => {
    if (!selectedConversation || !composeText.trim()) return;
    setSending(true);
    try {
      await api.sendSmsMessage({
        customer_id: selectedConversation.customerId || undefined,
        phone: selectedConversation.phone,
        body: composeText.trim(),
      });
      setComposeText('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to send text.');
    } finally {
      setSending(false);
    }
  };

  const availableCustomersForNewMessage = customers.filter(c => c.phone && c.phone.trim());
  const newConvoCustomer = availableCustomersForNewMessage.find(c => c.id.toString() === newConvoCustomerId);

  const handleSendNewMessage = async () => {
    if (!newConvoCustomerId || !newConvoText.trim()) return;
    setNewConvoSending(true);
    setNewConvoError(null);
    try {
      await api.sendSmsMessage({
        customer_id: parseInt(newConvoCustomerId, 10),
        body: newConvoText.trim(),
      });
      setShowNewMessage(false);
      setNewConvoCustomerId('');
      setNewConvoText('');
      await loadAll();
      setSelectedKey(`c-${newConvoCustomerId}`);
      setMobileShowThread(true);
    } catch (err: any) {
      setNewConvoError(err.message || 'Failed to send text.');
    } finally {
      setNewConvoSending(false);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-[1400px] mx-auto px-4 py-6" id="texts-view-container">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-theme pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary-theme" />
            Texts
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Every automated and manual text, in one place — reminders, ready-for-pickup alerts, and funnel leads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${smsConfigured ? 'bg-emerald-950/40 text-emerald-400 border-emerald-700/40' : 'bg-amber-950/40 text-amber-400 border-amber-700/40'}`}>
            <Zap className="w-3 h-3" />
            {smsConfigured === null ? 'Checking...' : smsConfigured ? 'Twilio Connected' : 'Twilio Not Connected'}
          </span>
          <button
            onClick={() => { setShowNewMessage(true); setNewConvoError(null); }}
            className="flex items-center gap-1.5 bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-black px-3.5 py-2 rounded-lg text-[10px] uppercase tracking-wider transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Message
          </button>
        </div>
      </div>

      {smsConfigured === false && (
        <div className="bg-amber-950/20 border border-amber-700/30 rounded-xl px-4 py-3 text-xs text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Twilio isn't connected yet, so texts below will show as "not connected" and won't actually deliver. Everything's wired up and ready — add your <code className="font-mono bg-black/30 px-1 rounded">TWILIO_ACCOUNT_SID</code>, <code className="font-mono bg-black/30 px-1 rounded">TWILIO_AUTH_TOKEN</code>, and <code className="font-mono bg-black/30 px-1 rounded">TWILIO_PHONE_NUMBER</code> to your server's <code className="font-mono bg-black/30 px-1 rounded">.env</code> whenever you're ready and it'll all start working with no other changes.
          </span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary-theme animate-spin" />
          <span>Loading messages...</span>
        </div>
      ) : (
        <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl overflow-hidden shadow-2xl" style={{ height: '70vh', minHeight: 480 }}>
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-full">

            {/* Conversation list */}
            <div className={`border-r border-border-theme flex-col h-full ${mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-3 border-b border-border-theme">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full bg-bg-theme border border-border-theme rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-theme"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 text-xs italic px-4">
                    No texts yet. Once reminders, job-complete alerts, or funnel leads go out — or you send one manually — they'll show up here.
                  </div>
                ) : (
                  filteredConversations.map((c) => {
                    const meta = TRIGGER_META[c.lastMessage.trigger_type];
                    const statusMeta = STATUS_META[c.lastMessage.status];
                    const TriggerIcon = meta.icon;
                    const isActive = c.key === selectedKey;
                    return (
                      <button
                        key={c.key}
                        onClick={() => handleSelectConversation(c.key)}
                        className={`w-full text-left flex items-start gap-3 px-3 py-3 border-b border-border-theme/60 transition cursor-pointer ${isActive ? 'bg-primary-theme/10' : 'hover:bg-bg-theme/40'}`}
                      >
                        <div className="w-9 h-9 rounded-full bg-bg-theme border border-border-theme flex items-center justify-center text-[11px] font-black text-primary-theme shrink-0">
                          {initials(c.customerName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-200 truncate">{c.customerName}</span>
                            <span className="text-[9px] text-slate-500 font-mono shrink-0">{relativeTime(c.lastMessage.created_at)}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{c.lastMessage.body}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <TriggerIcon className={`w-3 h-3 ${meta.color}`} />
                            <span className={`text-[9px] uppercase tracking-wide font-bold ${meta.color}`}>{meta.label}</span>
                            <statusMeta.icon className={`w-3 h-3 ${statusMeta.color} ml-auto`} />
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Thread view */}
            <div className={`flex-col h-full ${mobileShowThread ? 'flex' : 'hidden md:flex'}`}>
              {!selectedConversation ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
                  <MessageSquare className="w-10 h-10 text-slate-700" />
                  <span>Select a conversation, or start a new one.</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border-theme shrink-0">
                    <button onClick={() => setMobileShowThread(false)} className="md:hidden text-slate-400 hover:text-white cursor-pointer">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-bg-theme border border-border-theme flex items-center justify-center text-[10px] font-black text-primary-theme">
                      {initials(selectedConversation.customerName)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{selectedConversation.customerName}</p>
                      <p className="text-[9px] text-slate-500 font-mono">{selectedConversation.phone}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {selectedConversation.messages.map((m) => {
                      const meta = TRIGGER_META[m.trigger_type];
                      const statusMeta = STATUS_META[m.status];
                      const StatusIcon = statusMeta.icon;
                      const isInbound = m.direction === 'inbound';
                      return (
                        <div key={m.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${isInbound ? 'bg-bg-theme border border-border-theme' : 'bg-primary-theme/15 border border-primary-theme/30'}`}>
                            <p className="text-xs text-slate-200 whitespace-pre-wrap">{m.body}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[9px] text-slate-500 font-mono">{new Date(m.created_at).toLocaleString()}</span>
                              <span className="text-slate-600">·</span>
                              <span className={`text-[9px] uppercase font-bold ${meta.color}`}>{meta.label}</span>
                              <StatusIcon className={`w-3 h-3 ${statusMeta.color} ml-auto`} title={m.error_message || statusMeta.label} />
                            </div>
                            {m.status !== 'sent' && m.error_message && (
                              <p className="text-[9px] text-slate-500 italic mt-1">{m.error_message}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 border-t border-border-theme shrink-0 flex items-end gap-2">
                    <textarea
                      value={composeText}
                      onChange={(e) => setComposeText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Type a message..."
                      rows={1}
                      className="flex-1 resize-none bg-bg-theme border border-border-theme rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-theme max-h-24"
                    />
                    <button
                      onClick={handleSend}
                      disabled={sending || !composeText.trim()}
                      className="flex items-center justify-center bg-primary-theme hover:bg-primary-theme/90 disabled:opacity-40 text-slate-950 rounded-xl w-10 h-10 shrink-0 transition cursor-pointer"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Message modal */}
      {showNewMessage && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border-theme bg-surface-theme text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-theme">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">New Message</h3>
              <button onClick={() => setShowNewMessage(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Customer *</label>
                <select
                  value={newConvoCustomerId}
                  onChange={(e) => setNewConvoCustomerId(e.target.value)}
                  className="w-full rounded bg-bg-theme border border-border-theme text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none cursor-pointer"
                >
                  <option value="">Select a customer with a phone on file...</option>
                  {availableCustomersForNewMessage.map(c => (
                    <option key={c.id} value={c.id.toString()}>{c.name} — {c.phone}</option>
                  ))}
                </select>
                {availableCustomersForNewMessage.length === 0 && (
                  <p className="text-[10px] text-slate-500">No customers have a phone number on file yet.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Message *</label>
                <textarea
                  value={newConvoText}
                  onChange={(e) => setNewConvoText(e.target.value)}
                  rows={4}
                  placeholder="Type your message..."
                  className="w-full rounded bg-bg-theme border border-border-theme text-sm px-3.5 py-2.5 text-slate-200 placeholder-slate-500 focus:border-primary-theme focus:outline-none resize-none"
                />
              </div>

              {newConvoError && (
                <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-lg p-3 text-xs">
                  {newConvoError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowNewMessage(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNewMessage}
                  disabled={!newConvoCustomerId || !newConvoText.trim() || newConvoSending}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-theme hover:bg-primary-theme/90 disabled:opacity-40 text-slate-950 px-4 py-2 text-xs font-black uppercase tracking-wider transition cursor-pointer"
                >
                  {newConvoSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
