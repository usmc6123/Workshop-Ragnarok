import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Mail, Send, FileText, Plus, Trash2, Edit2, Search, Calendar, 
  CheckCircle2, XCircle, Info, Loader2, RefreshCw, User, Eye, ArrowLeft, CheckSquare,
  Printer, CornerUpLeft, CornerUpRight
} from 'lucide-react';
import { api } from '../lib/api';
import { Customer, EmailTemplate, EmailSent, EmailReceived } from '../types';

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
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'templates' | 'compose' | 'trash'>('inbox');
  const [trashSubTab, setTrashSubTab] = useState<'received' | 'sent'>('received');
  
  // Lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentLog, setSentLog] = useState<EmailSent[]>([]);
  const [receivedLog, setReceivedLog] = useState<EmailReceived[]>([]);
  const [trashLog, setTrashLog] = useState<any[]>([]);
  
  // Loading states
  const [loadingLog, setLoadingLog] = useState(false);
  const [loadingReceived, setLoadingReceived] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Search & Filters for Sent/Received Log
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

  // Sent Log Detail Modal State
  const [selectedLog, setSelectedLog] = useState<EmailSent | null>(null);
  const [selectedReceived, setSelectedReceived] = useState<EmailReceived | null>(null);
  
  // Status/Toast Banner
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load basic lists
  useEffect(() => {
    fetchCustomers();
    fetchTemplates();
    fetchSentLog();
    fetchReceivedEmails();
    fetchTrashLog();
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

      // Check for quick email pre-population from portal link sharing
      const quickSubject = localStorage.getItem('ragnarok_quick_email_subject');
      const quickBody = localStorage.getItem('ragnarok_quick_email_body');
      if (quickSubject) {
        setEmailSubject(quickSubject);
        localStorage.removeItem('ragnarok_quick_email_subject');
      }
      if (quickBody) {
        setEmailBody(quickBody);
        localStorage.removeItem('ragnarok_quick_email_body');
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

  const fetchReceivedEmails = async () => {
    setLoadingReceived(true);
    try {
      const res = await api.getReceivedEmails(logSearch || undefined, startDate || undefined, endDate || undefined);
      setReceivedLog(res || []);
    } catch (err) {
      console.error('Failed to fetch received emails:', err);
    } finally {
      setLoadingReceived(false);
    }
  };

  const fetchTrashLog = async () => {
    setLoadingTrash(true);
    try {
      const res = await api.getTrashedEmails();
      setTrashLog(res || []);
    } catch (err) {
      console.error('Failed to fetch trashed emails:', err);
    } finally {
      setLoadingTrash(false);
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

  const handleCloseDetailModal = () => {
    setSelectedLog(null);
    setSelectedReceived(null);
  };

  const handleReply = (email: EmailReceived) => {
    if (email.from_customer_id) {
      setSelectedCustomerId(email.from_customer_id.toString());
    } else {
      setSelectedCustomerId('');
    }
    setRecipientEmail(email.from_email);
    
    let subject = email.subject || '';
    if (!subject.toLowerCase().startsWith('re:')) {
      subject = `Re: ${subject}`;
    }
    setEmailSubject(subject);
    
    const dateStr = new Date(email.received_at).toLocaleString();
    const quotedBody = `\n\nOn ${dateStr}, ${email.from_email} wrote:\n> ${email.body.replace(/\n/g, '\n> ')}`;
    setEmailBody(quotedBody);
    
    setActiveTab('compose');
    handleCloseDetailModal();
  };

  const handleForward = (email: EmailReceived) => {
    setSelectedCustomerId('');
    setRecipientEmail('');
    
    let subject = email.subject || '';
    if (!subject.toLowerCase().startsWith('fwd:')) {
      subject = `Fwd: ${subject}`;
    }
    setEmailSubject(subject);
    
    const dateStr = new Date(email.received_at).toLocaleString();
    const quotedBody = `\n\n---------- Forwarded message ---------\nFrom: ${email.from_email}\nDate: ${dateStr}\nSubject: ${email.subject}\n\n${email.body}`;
    setEmailBody(quotedBody);
    
    setActiveTab('compose');
    handleCloseDetailModal();
  };

  const handlePrintEmail = () => {
    window.print();
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
      <div className="flex border-b border-[#1e2028] bg-[#0c0d12]/50 p-1.5 rounded-xl max-w-xl select-none">
        <button
          onClick={() => {
            fetchReceivedEmails();
            setActiveTab('inbox');
          }}
          className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'inbox' 
              ? 'bg-[#181922] text-primary-theme border border-[#2d303f] shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Inbox
        </button>
        <button
          onClick={() => {
            fetchSentLog();
            setActiveTab('sent');
          }}
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
        <button
          onClick={() => {
            fetchTrashLog();
            setActiveTab('trash');
          }}
          className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'trash' 
              ? 'bg-[#181922] text-primary-theme border border-[#2d303f] shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Trash
        </button>
      </div>

      {/* TAB CONTENT: INBOX */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#13141a]/60 border border-[#1e2028] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search sender, subject, customer..."
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
              onClick={fetchReceivedEmails}
              disabled={loadingReceived}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs uppercase tracking-wider font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loadingReceived ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Filter</span>
            </button>
          </div>

          {/* Table list */}
          <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl overflow-hidden shadow-xl">
            {loadingReceived && receivedLog.length === 0 ? (
              <div className="py-24 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
                <span>Synchronizing incoming email inbox...</span>
              </div>
            ) : receivedLog.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 max-w-xl mx-auto my-6 font-mono text-xs text-slate-500">
                <Mail className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>No incoming emails found.</p>
                <p className="text-[10px] text-slate-600 mt-1">Try broadening your search keywords or checking Webhook integrations.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0c0d12]/60 border-b border-[#1e2028] font-mono uppercase text-slate-500 text-[10px] tracking-widest select-none">
                      <th className="p-4">Received Time</th>
                      <th className="p-4">Sender</th>
                      <th className="p-4">Subject</th>
                      <th className="p-4">Associated Client</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2028]/40 font-mono">
                    {receivedLog.map((log) => {
                      const formattedTime = new Date(log.received_at).toLocaleString();
                      
                      return (
                        <tr 
                           key={log.id} 
                          onClick={() => setSelectedReceived(log)}
                          className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                        >
                          <td className="p-4 text-slate-400 text-[11px] whitespace-nowrap">{formattedTime}</td>
                          <td className="p-4 text-slate-200 font-bold font-sans text-xs">{log.from_email}</td>
                          <td className="p-4 text-slate-300 font-medium font-sans text-xs max-w-xs truncate">{log.subject}</td>
                          <td className="p-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {log.from_customer_id ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateToCustomer && onNavigateToCustomer(log.from_customer_id!);
                                }}
                                className="text-amber-500 hover:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 text-left"
                              >
                                <User className="w-3.5 h-3.5" />
                                <span>{log.customer_name || `ID #${log.from_customer_id}`}</span>
                              </button>
                            ) : (
                              <span className="text-slate-600">None</span>
                            )}
                          </td>
                          <td className="p-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to move this email to trash?')) {
                                  try {
                                    await api.trashEmail('received', log.id);
                                    showToast('Email moved to trash');
                                    fetchReceivedEmails();
                                    fetchTrashLog();
                                  } catch (err) {
                                    console.error(err);
                                    showToast('Failed to move email to trash', 'error');
                                  }
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition cursor-pointer bg-transparent border-none"
                              title="Move to Trash"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
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
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2028]/40 font-mono">
                    {sentLog.map((log) => {
                      const isSent = log.status === 'sent';
                      const formattedTime = new Date(log.sent_at).toLocaleString();
                      
                      return (
                        <tr 
                          key={log.id} 
                          onClick={() => setSelectedLog(log)}
                          className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                        >
                          <td className="p-4 text-slate-400 text-[11px] whitespace-nowrap">{formattedTime}</td>
                          <td className="p-4 text-slate-200 font-bold font-sans text-xs">{log.to_email}</td>
                          <td className="p-4 text-slate-300 font-medium font-sans text-xs max-w-xs truncate">{log.subject}</td>
                          <td className="p-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {log.to_customer_id ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateToCustomer && onNavigateToCustomer(log.to_customer_id!);
                                }}
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
                          <td className="p-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to move this email to trash?')) {
                                  try {
                                    await api.trashEmail('sent', log.id);
                                    showToast('Email moved to trash');
                                    fetchSentLog();
                                    fetchTrashLog();
                                  } catch (err) {
                                    console.error(err);
                                    showToast('Failed to move email to trash', 'error');
                                  }
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition cursor-pointer bg-transparent border-none"
                              title="Move to Trash"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
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

      {/* TAB CONTENT: TRASH */}
      {activeTab === 'trash' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex border-b border-[#1e2028] bg-[#0c0d12]/50 p-1 rounded-lg select-none self-start">
              <button
                onClick={() => setTrashSubTab('received')}
                className={`py-1.5 px-4 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                  trashSubTab === 'received'
                    ? 'bg-[#181922] text-primary-theme border border-[#2d303f] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Received Emails
              </button>
              <button
                onClick={() => setTrashSubTab('sent')}
                className={`py-1.5 px-4 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                  trashSubTab === 'sent'
                    ? 'bg-[#181922] text-primary-theme border border-[#2d303f] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sent Emails
              </button>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to permanently delete ALL trashed emails? This cannot be undone.')) {
                    try {
                      await api.emptyEmailTrash();
                      showToast('Trash emptied successfully');
                      fetchTrashLog();
                    } catch (err) {
                      console.error(err);
                      showToast('Failed to empty trash', 'error');
                    }
                  }
                }}
                disabled={loadingTrash || trashLog.length === 0}
                className="px-4 py-2 bg-rose-950/60 hover:bg-rose-900/60 text-rose-400 border border-rose-500/20 rounded-lg text-xs uppercase tracking-wider font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Permanently delete all trashed emails"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Empty Trash</span>
              </button>

              <button
                onClick={fetchTrashLog}
                disabled={loadingTrash}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs uppercase tracking-wider font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loadingTrash ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Refresh Trash</span>
              </button>
            </div>
          </div>

          {/* Table list */}
          <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl overflow-hidden shadow-xl">
            {loadingTrash && trashLog.length === 0 ? (
              <div className="py-24 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
                <span>Loading trash archive...</span>
              </div>
            ) : trashLog.filter(x => x.type === trashSubTab).length === 0 ? (
              <div className="py-16 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 max-w-xl mx-auto my-6 font-mono text-xs text-slate-500">
                <Trash2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>No trashed {trashSubTab} emails found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0c0d12]/60 border-b border-[#1e2028] font-mono uppercase text-slate-500 text-[10px] tracking-widest select-none">
                      <th className="p-4">Original Date</th>
                      <th className="p-4">Deleted Date</th>
                      <th className="p-4">{trashSubTab === 'received' ? 'Sender' : 'Recipient'}</th>
                      <th className="p-4">Subject</th>
                      <th className="p-4">Associated Client</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2028]/40 font-mono">
                    {trashLog.filter(x => x.type === trashSubTab).map((item) => {
                      const formattedOrigTime = new Date(item.date).toLocaleString();
                      const formattedDelTime = item.deleted_at ? new Date(item.deleted_at).toLocaleString() : 'N/A';
                      
                      return (
                        <tr 
                          key={`${item.type}-${item.id}`} 
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="p-4 text-slate-400 text-[11px] whitespace-nowrap">{formattedOrigTime}</td>
                          <td className="p-4 text-slate-400 text-[11px] whitespace-nowrap">{formattedDelTime}</td>
                          <td className="p-4 text-slate-200 font-bold font-sans text-xs">{item.email}</td>
                          <td className="p-4 text-slate-300 font-medium font-sans text-xs max-w-xs truncate">{item.subject}</td>
                          <td className="p-4 whitespace-nowrap">
                            {item.customer_id ? (
                              <button
                                onClick={() => {
                                  onNavigateToCustomer && onNavigateToCustomer(item.customer_id!);
                                }}
                                className="text-amber-500 hover:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 text-left font-sans text-xs"
                              >
                                <User className="w-3.5 h-3.5" />
                                <span>{item.customer_name || `ID #${item.customer_id}`}</span>
                              </button>
                            ) : (
                              <span className="text-slate-600">None</span>
                            )}
                          </td>
                          <td className="p-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    await api.restoreEmail(item.type, item.id);
                                    showToast('Email restored successfully');
                                    fetchTrashLog();
                                    if (item.type === 'received') {
                                      fetchReceivedEmails();
                                    } else {
                                      fetchSentLog();
                                    }
                                  } catch (err) {
                                    console.error(err);
                                    showToast('Failed to restore email', 'error');
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/60 font-sans font-bold text-[10px] uppercase tracking-wider rounded transition flex items-center gap-1 border border-emerald-500/20 cursor-pointer"
                                title="Restore Email"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Restore</span>
                              </button>
                              
                              <button
                                onClick={async () => {
                                  if (confirm('Are you sure you want to permanently delete this email? This cannot be undone.')) {
                                    try {
                                      await api.deleteEmailPermanently(item.type, item.id);
                                      showToast('Email deleted permanently');
                                      fetchTrashLog();
                                    } catch (err) {
                                      console.error(err);
                                      showToast('Failed to delete email permanently', 'error');
                                    }
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-rose-950/60 text-rose-400 hover:bg-rose-900/60 font-sans font-bold text-[10px] uppercase tracking-wider rounded transition flex items-center gap-1 border border-rose-500/20 cursor-pointer"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Purge</span>
                              </button>
                            </div>
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

      {/* SENT EMAIL DETAIL MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="sent-email-detail-modal">
          <div className="bg-[#13141a] border border-[#1e2028] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1e2028] flex justify-between items-center bg-[#0c0d12]/40 select-none">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-200 font-mono flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-amber-500" />
                Outbound Email Log Details
              </h2>
              <button
                onClick={handleCloseDetailModal}
                className="text-slate-400 hover:text-white transition p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              
              {/* Metadata Details */}
              <div className="bg-[#0c0d12]/60 border border-[#1e2028] rounded-xl p-4 space-y-3 font-mono text-xs text-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Subject Header</span>
                    <span className="text-slate-200 font-sans font-bold text-sm block mt-0.5">{selectedLog.subject}</span>
                  </div>
                  <div className="flex justify-end items-start gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      selectedLog.status === 'sent' 
                        ? 'bg-emerald-950/55 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-950/55 text-rose-400 border border-rose-500/20'
                    }`}>
                      {selectedLog.status === 'sent' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-rose-400" />}
                      <span>{selectedLog.status}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-[#1e2028]/60">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Recipient Destination</span>
                    <span className="text-slate-200 font-sans font-bold block mt-0.5">{selectedLog.to_email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Associated Customer</span>
                    {selectedLog.to_customer_id ? (
                      <button
                        onClick={() => {
                          onNavigateToCustomer && onNavigateToCustomer(selectedLog.to_customer_id!);
                          handleCloseDetailModal();
                        }}
                        className="text-amber-500 hover:text-amber-400 font-bold hover:underline flex items-center gap-1 mt-0.5 cursor-pointer bg-transparent border-none p-0 text-left font-sans text-xs"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>{selectedLog.customer_name || `ID #${selectedLog.to_customer_id}`}</span>
                      </button>
                    ) : (
                      <span className="text-slate-500 block mt-0.5">None</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Dispatched Timestamp</span>
                    <span className="text-slate-400 block mt-0.5">{new Date(selectedLog.sent_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Rendered HTML Body Preview Section */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-mono uppercase text-slate-400">
                  Rendered Email Body Message
                </span>
                <div className="bg-white text-slate-800 p-6 rounded-xl border border-slate-200 shadow-inner overflow-y-auto max-h-[42vh] font-sans">
                  <div 
                    className="email-rendered-body"
                    dangerouslySetInnerHTML={{ __html: selectedLog.body }} 
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-5 border-t border-[#1e2028] bg-[#0c0d12]/20 flex flex-wrap gap-3 items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrintEmail}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-lg transition active:scale-95 flex items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Email</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Are you sure you want to move this email to trash?')) {
                      try {
                        await api.trashEmail('sent', selectedLog.id);
                        showToast('Email moved to trash');
                        fetchSentLog();
                        fetchTrashLog();
                        handleCloseDetailModal();
                      } catch (err) {
                        console.error(err);
                        showToast('Failed to move email to trash', 'error');
                      }
                    }
                  }}
                  className="bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 font-mono font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg transition active:scale-95 flex items-center gap-1.5 border border-rose-500/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCloseDetailModal}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-lg transition border border-transparent hover:border-[#2d303f] cursor-pointer"
              >
                Close Details
              </button>
            </div>

          </div>

          {/* PRINT MEDIA STYLES */}
          <style>{`
            @media print {
              body > *:not(#print-only-email-content) {
                display: none !important;
              }
              #print-only-email-content {
                display: block !important;
              }
              tr {
                page-break-inside: avoid !important;
              }
            }
          `}</style>

          {/* Print only content portal */}
          {createPortal(
            <div id="print-only-email-content" style={{ display: 'none' }}>
              <div style={{ padding: '40px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', backgroundColor: '#ffffff' }}>
                <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '30px' }}>
                  <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 12px 0', color: '#0f172a', letterSpacing: '-0.025em' }}>
                    {selectedLog.subject}
                  </h1>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', fontSize: '14px', color: '#475569' }}>
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>Recipient:</span>
                    <span>{selectedLog.to_email} {selectedLog.customer_name ? `(${selectedLog.customer_name})` : ''}</span>
                    
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>Sent Date:</span>
                    <span>{new Date(selectedLog.sent_at).toLocaleString()}</span>
                    
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>Status:</span>
                    <span style={{ textTransform: 'uppercase', fontWeight: 'bold', color: selectedLog.status === 'sent' ? '#16a34a' : '#dc2626' }}>
                      {selectedLog.status}
                    </span>
                  </div>
                </div>
                <div 
                  style={{ fontSize: '15px', lineHeight: '1.6', color: '#334155' }}
                  dangerouslySetInnerHTML={{ __html: selectedLog.body }} 
                />
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* RECEIVED EMAIL DETAIL MODAL */}
      {selectedReceived && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="received-email-detail-modal">
          <div className="bg-[#13141a] border border-[#1e2028] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1e2028] flex justify-between items-center bg-[#0c0d12]/40 select-none">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-200 font-mono flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-amber-500" />
                Inbound Email Details
              </h2>
              <button
                onClick={handleCloseDetailModal}
                className="text-slate-400 hover:text-white transition p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              
              {/* Metadata Details */}
              <div className="bg-[#0c0d12]/60 border border-[#1e2028] rounded-xl p-4 space-y-3 font-mono text-xs text-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Subject Header</span>
                    <span className="text-slate-200 font-sans font-bold text-sm block mt-0.5">{selectedReceived.subject}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-[#1e2028]/60">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Sender Address</span>
                    <span className="text-slate-200 font-sans font-bold block mt-0.5">{selectedReceived.from_email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Associated Customer</span>
                    {selectedReceived.from_customer_id ? (
                      <button
                        onClick={() => {
                          onNavigateToCustomer && onNavigateToCustomer(selectedReceived.from_customer_id!);
                          handleCloseDetailModal();
                        }}
                        className="text-amber-500 hover:text-amber-400 font-bold hover:underline flex items-center gap-1 mt-0.5 cursor-pointer bg-transparent border-none p-0 text-left font-sans text-xs"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>{selectedReceived.customer_name || `ID #${selectedReceived.from_customer_id}`}</span>
                      </button>
                    ) : (
                      <span className="text-slate-500 block mt-0.5">None</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Received Timestamp</span>
                    <span className="text-slate-400 block mt-0.5">{new Date(selectedReceived.received_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Rendered HTML/Text Body Preview Section */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-mono uppercase text-slate-400">
                  Email Message Body
                </span>
                <div className="bg-white text-slate-800 p-6 rounded-xl border border-slate-200 shadow-inner overflow-y-auto max-h-[42vh] font-sans whitespace-pre-wrap">
                  {selectedReceived.body.includes('<') && selectedReceived.body.includes('>') ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedReceived.body }} />
                  ) : (
                    <div>{selectedReceived.body}</div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-5 border-t border-[#1e2028] bg-[#0c0d12]/20 flex flex-wrap gap-3 items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleReply(selectedReceived)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg transition active:scale-95 flex items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  <CornerUpLeft className="w-4 h-4" />
                  <span>Reply</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleForward(selectedReceived)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg transition active:scale-95 flex items-center gap-1.5 border border-[#2d303f] cursor-pointer"
                >
                  <CornerUpRight className="w-4 h-4" />
                  <span>Forward</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintEmail}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg transition active:scale-95 flex items-center gap-1.5 border border-[#2d303f] cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Email</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Are you sure you want to move this email to trash?')) {
                      try {
                        await api.trashEmail('received', selectedReceived.id);
                        showToast('Email moved to trash');
                        fetchReceivedEmails();
                        fetchTrashLog();
                        handleCloseDetailModal();
                      } catch (err) {
                        console.error(err);
                        showToast('Failed to move email to trash', 'error');
                      }
                    }
                  }}
                  className="bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 font-mono font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg transition active:scale-95 flex items-center gap-1.5 border border-rose-500/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCloseDetailModal}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-lg transition border border-transparent hover:border-[#2d303f] cursor-pointer"
              >
                Close Details
              </button>
            </div>

          </div>

          {/* PRINT MEDIA STYLES */}
          <style>{`
            @media print {
              body > *:not(#print-only-email-content) {
                display: none !important;
              }
              #print-only-email-content {
                display: block !important;
              }
              tr {
                page-break-inside: avoid !important;
              }
            }
          `}</style>

          {/* Print only content portal */}
          {createPortal(
            <div id="print-only-email-content" style={{ display: 'none' }}>
              <div style={{ padding: '40px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', backgroundColor: '#ffffff' }}>
                <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '30px' }}>
                  <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 12px 0', color: '#0f172a', letterSpacing: '-0.025em' }}>
                    {selectedReceived.subject}
                  </h1>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', fontSize: '14px', color: '#475569' }}>
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>Sender:</span>
                    <span>{selectedReceived.from_email} {selectedReceived.customer_name ? `(${selectedReceived.customer_name})` : ''}</span>
                    
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>Received:</span>
                    <span>{new Date(selectedReceived.received_at).toLocaleString()}</span>
                  </div>
                </div>
                {selectedReceived.body.includes('<') && selectedReceived.body.includes('>') ? (
                  <div 
                    style={{ fontSize: '15px', lineHeight: '1.6', color: '#334155' }}
                    dangerouslySetInnerHTML={{ __html: selectedReceived.body }} 
                  />
                ) : (
                  <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>
                    {selectedReceived.body}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

    </div>
  );
}
