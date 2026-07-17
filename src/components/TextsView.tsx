import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { SmsMessage, SmsTriggerType, SmsStatus, Customer, PrivateContact } from '../types';
import {
  MessageSquare, Send, Search, Plus, ChevronLeft, Clock, Wrench,
  Megaphone, User, X, Loader2, CheckCircle2, AlertTriangle, Zap,
  RefreshCw, DollarSign, RotateCcw, Star, Inbox as InboxIcon, Trash2,
  PhoneCall, Lock, UserPlus, Pencil
} from 'lucide-react';

const TRIGGER_META: Record<SmsTriggerType, { label: string; icon: any; color: string }> = {
  manual: { label: 'Manual', icon: User, color: 'text-slate-400' },
  appointment_reminder: { label: 'Reminder', icon: Clock, color: 'text-blue-400' },
  job_complete: { label: 'Job Complete', icon: Wrench, color: 'text-green-400' },
  funnel_confirmation: { label: 'Funnel Lead', icon: Megaphone, color: 'text-purple-400' },
  funnel_admin_alert: { label: 'Funnel Alert', icon: Megaphone, color: 'text-amber-400' },
  stale_lead_followup: { label: 'Lead Follow-up', icon: RefreshCw, color: 'text-purple-400' },
  unpaid_reminder: { label: 'Unpaid Reminder', icon: DollarSign, color: 'text-rose-400' },
  winback: { label: 'Win-back', icon: RotateCcw, color: 'text-cyan-400' },
  review_request: { label: 'Review Request', icon: Star, color: 'text-yellow-400' },
  booking_confirmation: { label: 'Booking Confirmed', icon: Clock, color: 'text-emerald-400' },
};

const STATUS_META: Record<SmsStatus, { label: string; icon: any; color: string }> = {
  sent: { label: 'Sent', icon: CheckCircle2, color: 'text-emerald-400' },
  failed: { label: 'Failed', icon: AlertTriangle, color: 'text-red-400' },
  not_configured: { label: 'Twilio not connected', icon: AlertTriangle, color: 'text-amber-400' },
};

type TextsTab = 'conversations' | 'inbox' | 'sent' | 'trash' | 'private';

interface Conversation {
  key: string;
  customerId: number | null;
  name: string;
  phone: string;
  messages: SmsMessage[];
  lastMessage: SmsMessage;
  unreadCount: number;
}

function buildConversations(messages: SmsMessage[]): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const m of messages) {
    const key = m.customer_id ? `c-${m.customer_id}` : `p-${m.phone}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        customerId: m.customer_id,
        name: m.customer_name || 'Unknown Contact',
        phone: m.phone,
        messages: [],
        lastMessage: m,
        unreadCount: 0,
      });
    }
    const c = map.get(key)!;
    c.messages.push(m);
    if (m.direction === 'inbound' && !m.is_read) c.unreadCount++;
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
  const [privateMessages, setPrivateMessages] = useState<SmsMessage[]>([]);
  const [trashedMessages, setTrashedMessages] = useState<SmsMessage[]>([]);
  const [privateContacts, setPrivateContacts] = useState<PrivateContact[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null);

  const [activeTab, setActiveTab] = useState<TextsTab>('conversations');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedPrivateContactId, setSelectedPrivateContactId] = useState<number | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [composeText, setComposeText] = useState('');
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState(false);

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newConvoCustomerId, setNewConvoCustomerId] = useState('');
  const [newConvoText, setNewConvoText] = useState('');
  const [newConvoSending, setNewConvoSending] = useState(false);
  const [newConvoError, setNewConvoError] = useState<string | null>(null);

  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', notes: '' });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [msgs, privMsgs, trash, contacts, custs, status] = await Promise.all([
        api.getSmsMessages(),
        api.getPrivateSmsMessages(),
        api.getTrashedSmsMessages(),
        api.getPrivateContacts(),
        api.getCustomers(),
        api.getSmsStatus(),
      ]);
      setMessages(msgs);
      setPrivateMessages(privMsgs);
      setTrashedMessages(trash);
      setPrivateContacts(contacts);
      setCustomers(custs);
      setSmsConfigured(status.configured);
    } catch (err) {
      console.error('Failed to load Texts page data:', err);
    } finally {
      setLoading(false);
    }
  };

  const conversations = useMemo(() => buildConversations(messages), [messages]);
  const inboxConversations = useMemo(() => buildConversations(messages.filter(m => m.direction === 'inbound')), [messages]);
  const sentMessages = useMemo(() => messages.filter(m => m.direction === 'outbound'), [messages]);
  const inboxUnreadTotal = useMemo(() => messages.filter(m => m.direction === 'inbound' && !m.is_read).length, [messages]);

  const activeConversations = activeTab === 'inbox' ? inboxConversations : conversations;

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return activeConversations;
    const q = searchQuery.trim().toLowerCase();
    return activeConversations.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [activeConversations, searchQuery]);

  const filteredPrivateContacts = useMemo(() => {
    if (!searchQuery.trim()) return privateContacts;
    const q = searchQuery.trim().toLowerCase();
    return privateContacts.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [privateContacts, searchQuery]);

  const selectedConversation = filteredConversations.find(c => c.key === selectedKey)
    || activeConversations.find(c => c.key === selectedKey)
    || null;

  const selectedPrivateContact = privateContacts.find(c => c.id === selectedPrivateContactId) || null;
  const selectedPrivateThread = useMemo(() => {
    return privateMessages
      .filter(m => m.private_contact_id === selectedPrivateContactId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [privateMessages, selectedPrivateContactId]);
  const selectedPrivateUnread = privateMessages.filter(m => m.private_contact_id === selectedPrivateContactId && m.direction === 'inbound' && !m.is_read).length;

  const switchTab = (tab: TextsTab) => {
    setActiveTab(tab);
    setSelectedKey(null);
    setSelectedPrivateContactId(null);
    setMobileShowThread(false);
    setSearchQuery('');
    setComposeText('');
  };

  const handleSelectConversation = async (c: Conversation) => {
    setSelectedKey(c.key);
    setMobileShowThread(true);
    setComposeText('');
    if (c.unreadCount > 0) {
      try {
        if (c.customerId) await api.markSmsThreadRead({ customer_id: c.customerId });
        else await api.markSmsThreadRead({ phone: c.phone });
        setMessages(prev => prev.map(m => {
          const belongs = c.customerId ? m.customer_id === c.customerId : (m.customer_id === null && m.phone === c.phone);
          return belongs ? { ...m, is_read: 1 } : m;
        }));
      } catch (err) {
        console.error('Failed to mark thread read:', err);
      }
    }
  };

  const handleSelectPrivateContact = async (contact: PrivateContact) => {
    setSelectedPrivateContactId(contact.id);
    setMobileShowThread(true);
    setComposeText('');
    const hasUnread = privateMessages.some(m => m.private_contact_id === contact.id && m.direction === 'inbound' && !m.is_read);
    if (hasUnread) {
      try {
        await api.markSmsThreadRead({ private_contact_id: contact.id });
        setPrivateMessages(prev => prev.map(m => m.private_contact_id === contact.id ? { ...m, is_read: 1 } : m));
      } catch (err) {
        console.error('Failed to mark private thread read:', err);
      }
    }
  };

  const handleSend = async () => {
    if (!composeText.trim()) return;
    setSending(true);
    try {
      if (activeTab === 'private') {
        if (!selectedPrivateContact) return;
        await api.sendSmsMessage({ private_contact_id: selectedPrivateContact.id, phone: selectedPrivateContact.phone, body: composeText.trim() });
      } else {
        if (!selectedConversation) return;
        await api.sendSmsMessage({
          customer_id: selectedConversation.customerId || undefined,
          phone: selectedConversation.phone,
          body: composeText.trim(),
        });
      }
      setComposeText('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to send text.');
    } finally {
      setSending(false);
    }
  };

  const handleCall = async (phone: string) => {
    setCalling(true);
    try {
      await api.bridgeCall(phone);
      alert("Calling your phone now — answer it and you'll be connected.");
    } catch (err: any) {
      alert(err.message || 'Failed to place call.');
    } finally {
      setCalling(false);
    }
  };

  const handleTrash = async (id: number) => {
    try {
      await api.trashSmsMessage(id);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete message.');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.restoreSmsMessage(id);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to restore message.');
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm("Permanently delete all trashed texts? This can't be undone.")) return;
    try {
      await api.emptySmsTrash();
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to empty trash.');
    }
  };

  const openAddContact = () => {
    setEditingContactId(null);
    setContactForm({ name: '', phone: '', notes: '' });
    setContactError(null);
    setShowContactModal(true);
  };

  const openEditContact = (c: PrivateContact) => {
    setEditingContactId(c.id);
    setContactForm({ name: c.name, phone: c.phone, notes: c.notes || '' });
    setContactError(null);
    setShowContactModal(true);
  };

  const handleSaveContact = async () => {
    if (!contactForm.name.trim() || !contactForm.phone.trim()) {
      setContactError('Name and phone are required.');
      return;
    }
    setContactSaving(true);
    setContactError(null);
    try {
      if (editingContactId) {
        await api.updatePrivateContact(editingContactId, contactForm);
      } else {
        await api.createPrivateContact(contactForm);
      }
      setShowContactModal(false);
      await loadAll();
    } catch (err: any) {
      setContactError(err.message || 'Failed to save contact.');
    } finally {
      setContactSaving(false);
    }
  };

  const handleDeleteContact = async (id: number) => {
    if (!confirm('Delete this private contact?')) return;
    try {
      await api.deletePrivateContact(id);
      if (selectedPrivateContactId === id) {
        setSelectedPrivateContactId(null);
        setMobileShowThread(false);
      }
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete contact.');
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
      setActiveTab('conversations');
      setSelectedKey(`c-${newConvoCustomerId}`);
      setMobileShowThread(true);
    } catch (err: any) {
      setNewConvoError(err.message || 'Failed to send text.');
    } finally {
      setNewConvoSending(false);
    }
  };

  const TABS: { id: TextsTab; label: string; icon: any; count?: number }[] = [
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    { id: 'inbox', label: 'Inbox', icon: InboxIcon, count: inboxUnreadTotal },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'trash', label: 'Trash', icon: Trash2 },
    { id: 'private', label: 'Private', icon: Lock },
  ];

  const showCallButton = smsConfigured === true;

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
          {activeTab === 'private' ? (
            <button
              onClick={openAddContact}
              className="flex items-center gap-1.5 bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-black px-3.5 py-2 rounded-lg text-[10px] uppercase tracking-wider transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Contact
            </button>
          ) : (activeTab === 'conversations' || activeTab === 'inbox') && (
            <button
              onClick={() => { setShowNewMessage(true); setNewConvoError(null); }}
              className="flex items-center gap-1.5 bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-black px-3.5 py-2 rounded-lg text-[10px] uppercase tracking-wider transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Message
            </button>
          )}
        </div>
      </div>

      {smsConfigured === false && (
        <div className="bg-amber-950/20 border border-amber-700/30 rounded-xl px-4 py-3 text-xs text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Twilio isn't connected yet, so texts below will show as "not connected" and won't actually deliver, replies won't come in, and the Call button stays hidden. Everything's wired up and ready — add your <code className="font-mono bg-black/30 px-1 rounded">TWILIO_ACCOUNT_SID</code>, <code className="font-mono bg-black/30 px-1 rounded">TWILIO_AUTH_TOKEN</code>, and <code className="font-mono bg-black/30 px-1 rounded">TWILIO_PHONE_NUMBER</code> to your server's <code className="font-mono bg-black/30 px-1 rounded">.env</code> whenever you're ready and it'll all start working with no other changes.
          </span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border-theme overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-black uppercase tracking-wider border-b-2 transition cursor-pointer whitespace-nowrap ${isActive ? 'border-primary-theme text-primary-theme' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {!!tab.count && (
                <span className="ml-0.5 bg-rose-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary-theme animate-spin" />
          <span>Loading messages...</span>
        </div>
      ) : (
        <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl overflow-hidden shadow-2xl" style={{ height: '70vh', minHeight: 480 }}>

          {/* Conversations / Inbox: threaded two-pane view */}
          {(activeTab === 'conversations' || activeTab === 'inbox') && (
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-full">
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
                      {activeTab === 'inbox'
                        ? "No received texts yet. Customer replies will show up here once two-way texting is active."
                        : "No texts yet. Once reminders, job-complete alerts, or funnel leads go out — or you send one manually — they'll show up here."}
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
                          onClick={() => handleSelectConversation(c)}
                          className={`w-full text-left flex items-start gap-3 px-3 py-3 border-b border-border-theme/60 transition cursor-pointer ${isActive ? 'bg-primary-theme/10' : 'hover:bg-bg-theme/40'}`}
                        >
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full bg-bg-theme border border-border-theme flex items-center justify-center text-[11px] font-black text-primary-theme">
                              {initials(c.name)}
                            </div>
                            {c.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center">{c.unreadCount}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-200 truncate">{c.name}</span>
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
                        {initials(selectedConversation.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{selectedConversation.name}</p>
                        <p className="text-[9px] text-slate-500 font-mono">{selectedConversation.phone}</p>
                      </div>
                      {showCallButton && (
                        <button
                          onClick={() => handleCall(selectedConversation.phone)}
                          disabled={calling}
                          className="flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-700/40 text-emerald-400 font-black px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition cursor-pointer disabled:opacity-40 shrink-0"
                          title="Call — Twilio calls your phone first, then bridges you to this number"
                        >
                          {calling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneCall className="w-3.5 h-3.5" />}
                          Call
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {selectedConversation.messages.map((m) => {
                        const meta = TRIGGER_META[m.trigger_type];
                        const statusMeta = STATUS_META[m.status];
                        const StatusIcon = statusMeta.icon;
                        const isInbound = m.direction === 'inbound';
                        return (
                          <div key={m.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 group relative ${isInbound ? 'bg-bg-theme border border-border-theme' : 'bg-primary-theme/15 border border-primary-theme/30'}`}>
                              <p className="text-xs text-slate-200 whitespace-pre-wrap">{m.body}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="text-[9px] text-slate-500 font-mono">{new Date(m.created_at).toLocaleString()}</span>
                                <span className="text-slate-600">·</span>
                                <span className={`text-[9px] uppercase font-bold ${meta.color}`}>{meta.label}</span>
                                <StatusIcon className={`w-3 h-3 ${statusMeta.color} ml-auto`} title={m.error_message || statusMeta.label} />
                                <button onClick={() => handleTrash(m.id)} className="text-slate-600 hover:text-rose-400 cursor-pointer opacity-0 group-hover:opacity-100 transition" title="Delete">
                                  <Trash2 className="w-3 h-3" />
                                </button>
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
          )}

          {/* Sent: flat chronological log */}
          {activeTab === 'sent' && (
            <div className="p-2 space-y-1.5 overflow-y-auto h-full">
              {sentMessages.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs italic">No sent texts yet.</div>
              ) : sentMessages.map(m => {
                const statusMeta = STATUS_META[m.status];
                const StatusIcon = statusMeta.icon;
                const meta = TRIGGER_META[m.trigger_type];
                const TriggerIcon = meta.icon;
                return (
                  <div key={m.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-bg-theme/40 border border-border-theme/60">
                    <div className="w-8 h-8 rounded-full bg-bg-theme border border-border-theme flex items-center justify-center text-[10px] font-black text-primary-theme shrink-0">
                      {initials(m.customer_name || 'Unknown')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-200 truncate">{m.customer_name || m.phone}</span>
                        <span className="text-[9px] text-slate-500 font-mono shrink-0">{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{m.body}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <TriggerIcon className={`w-3 h-3 ${meta.color}`} />
                        <span className={`text-[9px] uppercase tracking-wide font-bold ${meta.color}`}>{meta.label}</span>
                        <StatusIcon className={`w-3 h-3 ${statusMeta.color} ml-auto`} title={m.error_message || statusMeta.label} />
                        <button onClick={() => handleTrash(m.id)} className="text-slate-500 hover:text-rose-400 cursor-pointer" title="Delete">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trash */}
          {activeTab === 'trash' && (
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-border-theme flex items-center justify-between shrink-0">
                <span className="text-[10px] text-slate-500 font-mono">{trashedMessages.length} trashed message{trashedMessages.length === 1 ? '' : 's'}</span>
                {trashedMessages.length > 0 && (
                  <button onClick={handleEmptyTrash} className="text-[10px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 cursor-pointer">
                    Empty Trash
                  </button>
                )}
              </div>
              <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
                {trashedMessages.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 text-xs italic">Trash is empty.</div>
                ) : trashedMessages.map(m => (
                  <div key={m.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-bg-theme/30 border border-border-theme/60">
                    <div className="w-8 h-8 rounded-full bg-bg-theme border border-border-theme flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                      {initials(m.customer_name || m.private_contact_name || 'Unknown')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-400 truncate">
                          {m.customer_name || m.private_contact_name || m.phone}
                          {m.private_contact_id && <Lock className="w-2.5 h-2.5 inline ml-1.5 text-slate-500" />}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono shrink-0">{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{m.body}</p>
                    </div>
                    <button
                      onClick={() => handleRestore(m.id)}
                      className="flex items-center gap-1 text-[10px] font-bold uppercase text-primary-theme hover:text-primary-theme/80 cursor-pointer shrink-0"
                      title="Restore"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Private contacts: separate rolodex + threads, decoupled from Customers */}
          {activeTab === 'private' && (
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-full">
              <div className={`border-r border-border-theme flex-col h-full ${mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 border-b border-border-theme">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search private contacts..."
                      className="w-full bg-bg-theme border border-border-theme rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-theme"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredPrivateContacts.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 text-xs italic px-4">
                      No private contacts yet. These stay completely separate from Customers — add one to call or text them from here.
                    </div>
                  ) : filteredPrivateContacts.map(c => {
                    const unread = privateMessages.filter(m => m.private_contact_id === c.id && m.direction === 'inbound' && !m.is_read).length;
                    const isActive = c.id === selectedPrivateContactId;
                    return (
                      <div
                        key={c.id}
                        className={`w-full flex items-start gap-3 px-3 py-3 border-b border-border-theme/60 transition group ${isActive ? 'bg-primary-theme/10' : 'hover:bg-bg-theme/40'}`}
                      >
                        <button onClick={() => handleSelectPrivateContact(c)} className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer">
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full bg-bg-theme border border-border-theme flex items-center justify-center text-[11px] font-black text-primary-theme">
                              {initials(c.name)}
                            </div>
                            {unread > 0 && (
                              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center">{unread}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-200 truncate block">{c.name}</span>
                            <span className="text-[9px] text-slate-500 font-mono">{c.phone}</span>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                          {showCallButton && (
                            <button onClick={() => handleCall(c.phone)} disabled={calling} className="text-slate-500 hover:text-emerald-400 cursor-pointer p-1" title="Call">
                              <PhoneCall className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => openEditContact(c)} className="text-slate-500 hover:text-slate-200 cursor-pointer p-1" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteContact(c.id)} className="text-slate-500 hover:text-rose-400 cursor-pointer p-1" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`flex-col h-full ${mobileShowThread ? 'flex' : 'hidden md:flex'}`}>
                {!selectedPrivateContact ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
                    <Lock className="w-10 h-10 text-slate-700" />
                    <span>Select a private contact, or add a new one.</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border-theme shrink-0">
                      <button onClick={() => setMobileShowThread(false)} className="md:hidden text-slate-400 hover:text-white cursor-pointer">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="w-8 h-8 rounded-full bg-bg-theme border border-border-theme flex items-center justify-center text-[10px] font-black text-primary-theme">
                        {initials(selectedPrivateContact.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                          {selectedPrivateContact.name}
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono">{selectedPrivateContact.phone}</p>
                      </div>
                      {showCallButton && (
                        <button
                          onClick={() => handleCall(selectedPrivateContact.phone)}
                          disabled={calling}
                          className="flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-700/40 text-emerald-400 font-black px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition cursor-pointer disabled:opacity-40 shrink-0"
                          title="Call — Twilio calls your phone first, then bridges you to this number"
                        >
                          {calling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneCall className="w-3.5 h-3.5" />}
                          Call
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {selectedPrivateThread.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">No texts with {selectedPrivateContact.name} yet.</div>
                      ) : selectedPrivateThread.map((m) => {
                        const statusMeta = STATUS_META[m.status];
                        const StatusIcon = statusMeta.icon;
                        const isInbound = m.direction === 'inbound';
                        return (
                          <div key={m.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 group relative ${isInbound ? 'bg-bg-theme border border-border-theme' : 'bg-primary-theme/15 border border-primary-theme/30'}`}>
                              <p className="text-xs text-slate-200 whitespace-pre-wrap">{m.body}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="text-[9px] text-slate-500 font-mono">{new Date(m.created_at).toLocaleString()}</span>
                                <StatusIcon className={`w-3 h-3 ${statusMeta.color} ml-auto`} title={m.error_message || statusMeta.label} />
                                <button onClick={() => handleTrash(m.id)} className="text-slate-600 hover:text-rose-400 cursor-pointer opacity-0 group-hover:opacity-100 transition" title="Delete">
                                  <Trash2 className="w-3 h-3" />
                                </button>
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
          )}
        </div>
      )}

      {/* New Message modal (Conversations/Inbox) */}
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

      {/* Add/Edit Private Contact modal */}
      {showContactModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border-theme bg-surface-theme text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-theme">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                {editingContactId ? 'Edit Private Contact' : 'Add Private Contact'}
              </h3>
              <button onClick={() => setShowContactModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[10px] text-slate-500">
                Private contacts are completely separate from your Customers list — nothing here ever links to jobs, vehicles, or funnels.
              </p>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Name *</label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="Contact name"
                  className="w-full rounded bg-bg-theme border border-border-theme text-sm px-3.5 py-2.5 text-slate-200 placeholder-slate-500 focus:border-primary-theme focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Phone *</label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="+1 555 123 4567"
                  className="w-full rounded bg-bg-theme border border-border-theme text-sm px-3.5 py-2.5 text-slate-200 placeholder-slate-500 focus:border-primary-theme focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Notes</label>
                <textarea
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional"
                  className="w-full rounded bg-bg-theme border border-border-theme text-sm px-3.5 py-2.5 text-slate-200 placeholder-slate-500 focus:border-primary-theme focus:outline-none resize-none"
                />
              </div>

              {contactError && (
                <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-lg p-3 text-xs">
                  {contactError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveContact}
                  disabled={contactSaving}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-theme hover:bg-primary-theme/90 disabled:opacity-40 text-slate-950 px-4 py-2 text-xs font-black uppercase tracking-wider transition cursor-pointer"
                >
                  {contactSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {editingContactId ? 'Save' : 'Add'}
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
