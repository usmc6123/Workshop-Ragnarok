import React, { useState, useEffect } from 'react';
import { 
  Mail, Send, FileText, Plus, Trash2, Edit2, Search, Calendar, 
  CheckCircle2, XCircle, Info, Loader2, RefreshCw, User, Eye, ArrowLeft, CheckSquare
} from 'lucide-react';
import { api } from '../lib/api';
import { Customer, EmailTemplate, EmailSent } from '../types';

interface EmailViewProps {
  initialComposeData?: { customerId?: number; recipientEmail?: string } | null;
  onClearComposeData?: () => void;
  onNavigateToCustomer?: (customerId: number) => void;
}

export default function EmailView({ 
  initialComposeData, 
  onClearComposeData,
  onNavigateToCustomer 
}: EmailViewProps) {
  const [activeTab, setActiveTab] = useState<'sent' | 'templates' | 'compose'>('sent');
  
  // Lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentLog, setSentLog] = useState<EmailSent[]>([]);
  
  // Loading states
  const [loadingLog, setLoadingLog] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Search & Filters for Sent Log
  const [logSearch, setLogSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Compose Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  
  // Status/Toast Banner
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load basic lists
  useEffect(() => {
    fetchCustomers();
    fetchTemplates();
    fetchSentLog();
  }, []);

  // Handle external compose triggers (quick-send)
  useEffect(() => {
    if (initialComposeData) {
      setActiveTab('compose');
      if (initialComposeData.customerId) {
        setSelectedCustomerId(initialComposeData.customerId.toString());
      }
      if (initialComposeData.recipientEmail) {
        setRecipientEmail(initialComposeData.recipientEmail);
      }
      
      // Clear trigger so user can navigate away or compose multiple times
      if (onClearComposeData) {
        onClearComposeData();
      }
    }
  }, [initialComposeData]);

  // If customer is selected in Compose, auto-update the email input if available
  useEffect(() => {
    if (selectedCustomerId) {
      const cust = customers.find(c => c.id.toString() === selectedCustomerId);
      if (cust && cust.email) {
        setRecipientEmail(cust.email);
      }
    }
  }, [selectedCustomerId, customers]);

  // If template is selected in Compose, populate form or preview if desired
  useEffect(() => {
    if (selectedTemplateId) {
      const tmpl = templates.find(t => t.id.toString() === selectedTemplateId);
      if (tmpl) {
        setEmailSubject(tmpl.subject);
        setEmailBody(tmpl.body);
      }
    }
  }, [selectedTemplateId, templates]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.getCustomers();
      setCustomers(res || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await api.getEmailTemplates();
      setTemplates(res || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchSentLog = async () => {
    setLoadingLog(true);
    try {
      const res = await api.getEmails(logSearch || undefined, startDate || undefined, endDate || undefined);
      setSentLog(res || []);
    } catch (err) {
      console.error('Failed to fetch sent logs:', err);
    } finally {
      setLoadingLog(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) {
      showToast('Recipient email is required.', 'error');
      return;
    }
    if (!emailSubject || !emailBody) {
      showToast('Subject and Body are required.', 'error');
      return;
    }

    setSending(true);
    try {
      const res = await api.sendEmail({
        to: recipientEmail,
        customer_id: selectedCustomerId ? parseInt(selectedCustomerId, 10) : null,
        template_id: selectedTemplateId ? parseInt(selectedTemplateId, 10) : null,
        subject: emailSubject,
        body: emailBody
      });

      if (res.success) {
        showToast('Email processed and sent successfully!');
        // Reset form
        setSelectedCustomerId('');
        setRecipientEmail('');
        setSelectedTemplateId('');
        setEmailSubject('');
        setEmailBody('');
        // Refresh log
        fetchSentLog();
        setActiveTab('sent');
      } else {
        showToast('Processing finished, but server reports delivery failure.', 'error');
      }
    } catch (err: any) {
      console.error('Email send failed:', err);
      showToast(err.message || 'Failed to send email. Check your RESEND_API_KEY.', 'error');
      fetchSentLog(); // Refresh because log is written regardless
    } finally {
      setSending(false);
    }
  };

  const handleOpenTemplateModal = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateName(template.name);
      setTemplateSubject(template.subject);
      setTemplateBody(template.body);
    } else {
      setEditingTemplate(null);
      setTemplateName('');
      setTemplateSubject('');
      setTemplateBody('');
    }
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName || !templateSubject || !templateBody) {
      showToast('All template fields are required.', 'error');
      return;
    }

    try {
      if (editingTemplate) {
        await api.updateEmailTemplate(editingTemplate.id, {
          name: templateName,
          subject: templateSubject,
          body: templateBody
        });
        showToast('Template updated successfully!');
      } else {
        await api.addEmailTemplate({
          name: templateName,
          subject: templateSubject,
          body: templateBody
        });
        showToast('Template created successfully!');
      }
      setIsTemplateModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      showToast(err.message || 'Failed to save template.', 'error');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.deleteEmailTemplate(id);
      showToast('Template deleted successfully.');
      fetchTemplates();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete template.', 'error');
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    // Insert template placeholder in template body text field
    setTemplateBody(prev => prev + ` {{${placeholder}}}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="email-center-view">
      
      {/* Toast Notification */}
      {toast && (
        <div 
          className={`fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 font-mono text-xs ${
            toast.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
          }`}
          id="email-center-toast"
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-theme pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary-theme" />
            Email Communication Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Compose reminders, send invoice status reports, and configure automated custom communication templates.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedCustomerId('');
            setRecipientEmail('');
            setSelectedTemplateId('');
            setEmailSubject('');
            setEmailBody('');
            setActiveTab('compose');
          }}
          className="bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-bold rounded-lg px-4 py-2 text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow self-start md:self-center cursor-pointer"
          id="btn-compose-header"
        >
          <Plus className="w-4 h-4" />
          <span>Compose Email</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#1e2028] bg-[#0c0d12]/50 p-1.5 rounded-xl max-w-md select-none">
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'sent' 
              ? 'bg-[#181922] text-primary-theme border border-[#2d303f] shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sent Log
        </button>
        <button
          onClick={() => {
            fetchTemplates();
            setActiveTab('templates');
          }}
          className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'templates' 
              ? 'bg-[#181922] text-primary-theme border border-[#2d303f] shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('compose')}
          className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'compose' 
              ? 'bg-[#181922] text-primary-theme border border-[#2d303f] shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Compose
        </button>
      </div>

      {/* TAB CONTENT: SENT LOG */}
      {activeTab === 'sent' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#13141a]/60 border border-[#1e2028] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search recipient, subject, customer..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-slate-500">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 rounded-lg text-xs px-3 py-1.5 text-white font-mono"
              />
              <span className="text-[10px] font-mono uppercase text-slate-500">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 rounded-lg text-xs px-3 py-1.5 text-white font-mono"
              />
            </div>

            <button
              onClick={fetchSentLog}
              disabled={loadingLog}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs uppercase tracking-wider font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loadingLog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Filter</span>
            </button>
          </div>

          {/* Table list */}
          <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl overflow-hidden shadow-xl">
            {loadingLog && sentLog.length === 0 ? (
              <div className="py-24 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
                <span>Synchronizing sent logs archive...</span>
              </div>
            ) : sentLog.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 max-w-xl mx-auto my-6 font-mono text-xs text-slate-500">
                <Mail className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>No email log entries found.</p>
                <p className="text-[10px] text-slate-600 mt-1">Try broadening your search keywords or clear date parameters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0c0d12]/60 border-b border-[#1e2028] font-mono uppercase text-slate-500 text-[10px] tracking-widest select-none">
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Recipient</th>
                      <th className="p-4">Subject</th>
                      <th className="p-4">Associated Client</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2028]/40 font-mono">
                    {sentLog.map((log) => {
                      const isSent = log.status === 'sent';
                      const formattedTime = new Date(log.sent_at).toLocaleString();
                      
                      return (
                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 text-slate-400 text-[11px] whitespace-nowrap">{formattedTime}</td>
                          <td className="p-4 text-slate-200 font-bold font-sans text-xs">{log.to_email}</td>
                          <td className="p-4 text-slate-300 font-medium font-sans text-xs max-w-xs truncate">{log.subject}</td>
                          <td className="p-4 whitespace-nowrap">
                            {log.to_customer_id ? (
                              <button
                                onClick={() => onNavigateToCustomer && onNavigateToCustomer(log.to_customer_id!)}
                                className="text-amber-500 hover:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 text-left"
                              >
                                <User className="w-3.5 h-3.5" />
                                <span>{log.customer_name || `ID #${log.to_customer_id}`}</span>
                              </button>
                            ) : (
                              <span className="text-slate-600">None</span>
                            )}
                          </td>
                          <td className="p-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isSent 
                                ? 'bg-emerald-950/55 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-rose-950/55 text-rose-400 border border-rose-500/20'
                            }`}>
                              {isSent ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-rose-400" />}
                              <span>{log.status}</span>
                            </span>
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
      )}

      {/* TAB CONTENT: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-500" />
              Custom Templates Catalogue
            </h2>
            <button
              onClick={() => handleOpenTemplateModal()}
              className="bg-slate-800 hover:bg-slate-750 text-white font-mono font-bold rounded-lg px-3 py-1.5 text-[10px] uppercase tracking-wider flex items-center gap-1 transition shadow cursor-pointer border border-[#2d303f]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Template</span>
            </button>
          </div>

          {loadingTemplates && templates.length === 0 ? (
            <div className="py-24 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
              <span>Loading saved templates library...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 max-w-xl mx-auto font-mono text-xs text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p>No templates loaded.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div 
                  key={template.id} 
                  className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] hover:border-[#2d303f] transition-all rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-lg group relative"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 truncate pr-4">
                        {template.name}
                      </h3>
                      <span className="text-[9px] font-mono text-slate-500 uppercase">
                        ID: #{template.id}
                      </span>
                    </div>
                    <p className="text-xs text-amber-500 font-mono font-bold truncate">
                      Subject: {template.subject}
                    </p>
                    <div className="text-xs text-slate-400 font-sans line-clamp-3 bg-[#0c0d12]/50 p-2.5 rounded-lg border border-[#1e2028]/40 h-16 overflow-hidden">
                      {template.body.replace(/<[^>]*>/g, '') /* Strip html tag highlights for list preview */}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#1e2028]/60 flex items-center justify-between gap-2">
                    <span className="text-[9px] font-mono text-slate-500">
                      Updated: {new Date(template.updated_at || template.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenTemplateModal(template)}
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition"
                        title="Edit Template"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                        title="Delete Template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: COMPOSE */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Form Box */}
          <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-6 shadow-2xl lg:col-span-2 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5 border-b border-[#1e2028] pb-3">
              <Mail className="w-4 h-4 text-amber-500" />
              Compose Communications Message
            </h2>

            <form onSubmit={handleSendEmail} className="space-y-4">
              
              {/* Client Selection & Template Match Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Customer selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase text-slate-400">
                    1. Target Customer Associated
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-[#0c0d12] border border-[#1e2028] text-white px-3 py-2.5 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 transition"
                  >
                    <option value="">-- Direct Manual Entry (No Client Association) --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.email ? `(${c.email})` : '[No Email Set]'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional Template Fill */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase text-slate-400">
                    2. Use Preset Layout Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-[#0c0d12] border border-[#1e2028] text-white px-3 py-2.5 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 transition"
                  >
                    <option value="">-- Start From Raw Blank Slate --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Recipient Input (Direct override) */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase text-slate-400">
                  Recipient Email Destination Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="customer@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full bg-[#0c0d12] border border-[#1e2028] text-white px-3 py-2.5 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Subject Field */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase text-slate-400">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Service Invoice Ready - Ragnarök Auto"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-[#0c0d12] border border-[#1e2028] text-white px-3 py-2.5 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* HTML Body Editor (Supports raw html) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-mono uppercase text-slate-400">
                    Message Rich HTML Body
                  </label>
                  <span className="text-[9px] font-mono text-slate-500 uppercase">
                    Variable placeholders fully supported
                  </span>
                </div>
                <textarea
                  required
                  rows={14}
                  placeholder="<h1>Enter your message</h1><p>Dear Customer, your vehicle is ready...</p>"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full bg-[#0c0d12] border border-[#1e2028] text-white p-4 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 transition resize-y font-mono leading-relaxed"
                />
              </div>

              {/* Submit / Trigger dispatch */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={sending}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-lg transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transmitting Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Transmit outbound email</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Guidelines Sidebar on Right */}
          <div className="space-y-6">
            
            {/* Variable definitions */}
            <div className="bg-[#13141a]/80 border border-[#1e2028] rounded-xl p-5 space-y-3 shadow-lg">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-300 font-mono border-b border-[#1e2028] pb-2 flex items-center gap-1">
                <Info className="w-4 h-4 text-amber-500" />
                Dynamic Variable Merging
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                When sending, any of these template codes will instantly merge with the selected customer's real history:
              </p>
              
              <div className="space-y-2 pt-1 font-mono">
                <div className="p-2.5 bg-[#0c0d12] border border-[#1e2028] rounded-lg">
                  <p className="text-[11px] text-amber-500 font-bold">{"{{customer_name}}"}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Resolves to the recipient's full name.</p>
                </div>
                <div className="p-2.5 bg-[#0c0d12] border border-[#1e2028] rounded-lg">
                  <p className="text-[11px] text-amber-500 font-bold">{"{{vehicle}}"}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Latest year, make, and model registered.</p>
                </div>
                <div className="p-2.5 bg-[#0c0d12] border border-[#1e2028] rounded-lg">
                  <p className="text-[11px] text-amber-500 font-bold">{"{{shop_name}}"}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Your official configured company name.</p>
                </div>
                <div className="p-2.5 bg-[#0c0d12] border border-[#1e2028] rounded-lg">
                  <p className="text-[11px] text-amber-500 font-bold">{"{{appointment_date}}"}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Resolves to the most future-scheduled date.</p>
                </div>
              </div>
            </div>

            {/* Quick Tips Box */}
            <div className="bg-[#13141a]/80 border border-[#1e2028] rounded-xl p-5 space-y-3.5 text-xs text-slate-400 leading-relaxed shadow-lg font-sans">
              <h4 className="text-[10px] font-mono uppercase font-black text-slate-200 tracking-wider">Quick Tips</h4>
              <ul className="list-disc list-inside space-y-2">
                <li>Double check that the recipient customer has an email address set in their profile.</li>
                <li>Write standard rich styling like <code className="text-amber-500 font-mono font-bold">&lt;strong&gt;</code> or <code className="text-amber-500 font-mono font-bold">&lt;div&gt;</code> to custom frame tables.</li>
                <li>Ensure outbound port routing is unobstructed on host environments.</li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* TEMPLATE EDITING MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#13141a] border border-[#1e2028] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1e2028] flex justify-between items-center bg-[#0c0d12]/40 select-none">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-200 font-mono flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-500" />
                {editingTemplate ? 'Modify Custom Template' : 'Design Custom Template'}
              </h2>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white transition p-1.5 hover:bg-slate-800 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Scroll form */}
            <form onSubmit={handleSaveTemplate} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              
              {/* Template Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase text-slate-400">
                  Template identifier Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Appointment Reminder"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-[#0c0d12] border border-[#1e2028] text-white px-3 py-2.5 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Template Subject */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase text-slate-400">
                  Subject Line Preset (Supports variable brackets)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Upcoming Appointment - {{shop_name}}"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  className="w-full bg-[#0c0d12] border border-[#1e2028] text-white px-3 py-2.5 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Placeholder helpers */}
              <div className="space-y-1.5 bg-[#0c0d12] p-3 rounded-lg border border-[#1e2028]/60">
                <span className="block text-[9px] font-mono uppercase text-slate-500 mb-2">
                  Insert Variables into Preset Body:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['customer_name', 'vehicle', 'shop_name', 'appointment_date'].map(pl => (
                    <button
                      type="button"
                      key={pl}
                      onClick={() => insertPlaceholder(pl)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] rounded transition cursor-pointer select-none border border-transparent hover:border-[#2d303f]"
                    >
                      +{`{{${pl}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Body */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase text-slate-400">
                  HTML Body Preset Layout
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="<div style='font-family: sans-serif;'><p>Hello {{customer_name}},</p></div>"
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  className="w-full bg-[#0c0d12] border border-[#1e2028] text-white p-3 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 transition resize-y leading-relaxed font-mono"
                />
              </div>

              {/* Footer row buttons */}
              <div className="pt-4 border-t border-[#1e2028] flex justify-end gap-2.5 select-none">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-lg transition border border-transparent hover:border-border-theme cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1 shadow-md shadow-amber-500/5"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Save Template</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
