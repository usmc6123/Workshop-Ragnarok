import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import {
  DollarSign, TrendingUp, Receipt, Activity, Search, ArrowLeft, User, Car,
  FileText, CreditCard, RefreshCw, Loader2, CheckCircle2, XCircle, RotateCcw,
  ChevronUp, ChevronDown
} from 'lucide-react';

interface Payment {
  id: number;
  user_id: number;
  job_id: number | null;
  customer_id: number | null;
  customer_name?: string;
  job_description?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  amount_cents: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'refunded';
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

interface PaymentsViewProps {
  onNavigateToJob: (jobId: number) => void;
  onNavigateToCustomer: () => void;
}

export default function PaymentsView({ onNavigateToJob, onNavigateToCustomer }: PaymentsViewProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'succeeded' | 'failed' | 'refunded'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPayments();
      setPayments(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const succeededPayments = payments.filter(p => p.status === 'succeeded');
  const totalRevenueCents = succeededPayments.reduce((sum, p) => sum + p.amount_cents, 0);
  const now = new Date();
  const thisMonthRevenueCents = succeededPayments
    .filter(p => {
      const d = new Date(p.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const totalTransactionCount = payments.length;
  const avgTransactionCents = succeededPayments.length > 0 ? totalRevenueCents / succeededPayments.length : 0;

  const filteredPayments = useMemo(() => {
    let rows = [...payments];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(p => (p.customer_name || '').toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      rows = rows.filter(p => p.status === statusFilter);
    }
    if (startDate) {
      rows = rows.filter(p => p.created_at >= startDate);
    }
    if (endDate) {
      rows = rows.filter(p => p.created_at <= `${endDate}T23:59:59`);
    }
    rows.sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'asc' ? diff : -diff;
    });
    return rows;
  }, [payments, search, statusFilter, startDate, endDate, sortDir]);

  const renderStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      succeeded: 'bg-emerald-950/55 text-emerald-400 border-emerald-500/20',
      failed: 'bg-rose-950/55 text-rose-400 border-rose-500/20',
      refunded: 'bg-amber-950/55 text-amber-400 border-amber-500/20',
    };
    const icons: Record<string, React.ReactNode> = {
      succeeded: <CheckCircle2 className="w-3 h-3" />,
      failed: <XCircle className="w-3 h-3" />,
      refunded: <RotateCcw className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${styles[status] || styles.succeeded}`}>
        {icons[status]}
        <span>{status}</span>
      </span>
    );
  };

  const vehicleLabel = (p: Payment) => {
    const v = [p.vehicle_year, p.vehicle_make, p.vehicle_model].filter(Boolean).join(' ');
    return v || p.job_description || `Job #${p.job_id}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="payments-view">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-theme pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-theme" />
            Payments
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Track invoice payments processed through Stripe Checkout.
          </p>
        </div>
        <button
          onClick={loadPayments}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs uppercase tracking-wider font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start md:self-center"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="payments-stats-deck">
        <div className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme border-l-[3px] border-l-border-theme rounded-xl p-5 flex items-center justify-between shadow min-h-[110px]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Total Revenue</span>
            <span className="text-3xl font-black text-white font-mono block">{formatCurrency(totalRevenueCents)}</span>
            <span className="text-[10px] text-slate-400 font-sans block">All-time succeeded payments</span>
          </div>
          <div className="bg-bg-theme p-2.5 rounded-lg border border-border-theme text-primary-theme">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme border-l-[3px] border-l-border-theme rounded-xl p-5 flex items-center justify-between shadow min-h-[110px]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Revenue This Month</span>
            <span className="text-3xl font-black text-white font-mono block">{formatCurrency(thisMonthRevenueCents)}</span>
            <span className="text-[10px] text-slate-400 font-sans block">{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="bg-bg-theme p-2.5 rounded-lg border border-border-theme text-primary-theme">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme border-l-[3px] border-l-border-theme rounded-xl p-5 flex items-center justify-between shadow min-h-[110px]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Total Transactions</span>
            <span className="text-3xl font-black text-white font-mono block">{totalTransactionCount}</span>
            <span className="text-[10px] text-slate-400 font-sans block">All statuses</span>
          </div>
          <div className="bg-bg-theme p-2.5 rounded-lg border border-border-theme text-primary-theme">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme border-l-[3px] border-l-border-theme rounded-xl p-5 flex items-center justify-between shadow min-h-[110px]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Avg Transaction</span>
            <span className="text-3xl font-black text-white font-mono block">{formatCurrency(avgTransactionCents)}</span>
            <span className="text-[10px] text-slate-400 font-sans block">Succeeded payments</span>
          </div>
          <div className="bg-bg-theme p-2.5 rounded-lg border border-border-theme text-primary-theme">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#13141a]/60 border border-[#1e2028] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 rounded-lg text-xs px-3 py-2 text-white font-mono"
        >
          <option value="all">All Statuses</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

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
      </div>

      {/* Payments Table */}
      <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl overflow-hidden shadow-xl">
        {loading && payments.length === 0 ? (
          <div className="py-24 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
            <span>Loading payments...</span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 max-w-xl mx-auto my-6 font-mono text-xs text-slate-500">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>No payments found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0c0d12]/60 border-b border-[#1e2028] font-mono uppercase text-slate-500 text-[10px] tracking-widest select-none">
                  <th className="p-4 cursor-pointer" onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>
                    <span className="flex items-center gap-1">
                      Date
                      {sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </span>
                  </th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Vehicle / Job</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2028]/40 font-mono">
                {filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPayment(p)}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="p-4 text-slate-400 text-[11px] whitespace-nowrap">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="p-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {p.customer_id ? (
                        <button
                          onClick={() => onNavigateToCustomer()}
                          className="text-amber-500 hover:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 text-left font-sans text-xs"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>{p.customer_name || `ID #${p.customer_id}`}</span>
                        </button>
                      ) : (
                        <span className="text-slate-600">Unknown</span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {p.job_id ? (
                        <button
                          onClick={() => onNavigateToJob(p.job_id!)}
                          className="text-amber-500 hover:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 text-left font-sans text-xs"
                        >
                          <Car className="w-3.5 h-3.5" />
                          <span>{vehicleLabel(p)}</span>
                        </button>
                      ) : (
                        <span className="text-slate-600">None</span>
                      )}
                    </td>
                    <td className="p-4 text-right text-slate-200 font-bold font-sans text-xs">{formatCurrency(p.amount_cents)}</td>
                    <td className="p-4 text-center">{renderStatusBadge(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAYMENT DETAIL MODAL */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="payment-detail-modal">
          <div className="bg-[#13141a] border border-[#1e2028] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-[#1e2028] flex justify-between items-center bg-[#0c0d12]/40 select-none">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-200 font-mono flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-500" />
                Payment Details
              </h2>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-slate-400 hover:text-white transition p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              <div className="bg-[#0c0d12]/60 border border-[#1e2028] rounded-xl p-4 space-y-3 font-mono text-xs text-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Amount</span>
                    <span className="text-slate-200 font-sans font-bold text-lg block mt-0.5">
                      {formatCurrency(selectedPayment.amount_cents)} {selectedPayment.currency.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-end items-start">
                    {renderStatusBadge(selectedPayment.status)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[#1e2028]/60">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Customer</span>
                    {selectedPayment.customer_id ? (
                      <button
                        onClick={() => { onNavigateToCustomer(); setSelectedPayment(null); }}
                        className="text-amber-500 hover:text-amber-400 font-bold hover:underline flex items-center gap-1 mt-0.5 cursor-pointer bg-transparent border-none p-0 text-left font-sans text-xs"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>{selectedPayment.customer_name || `ID #${selectedPayment.customer_id}`}</span>
                      </button>
                    ) : (
                      <span className="text-slate-500 block mt-0.5">Unknown</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Date</span>
                    <span className="text-slate-400 block mt-0.5">{new Date(selectedPayment.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-3 border-t border-[#1e2028]/60">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Linked Job / Invoice</span>
                    {selectedPayment.job_id ? (
                      <span className="text-slate-200 font-sans font-bold block mt-0.5">
                        Ticket #{selectedPayment.job_id.toString().padStart(4, '0')} — {vehicleLabel(selectedPayment)}
                      </span>
                    ) : (
                      <span className="text-slate-500 block mt-0.5">None</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Stripe Checkout Session ID</span>
                    <span className="text-slate-300 font-sans block mt-0.5 break-all">{selectedPayment.stripe_session_id || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Stripe Payment Intent ID</span>
                    <span className="text-slate-300 font-sans block mt-0.5 break-all">{selectedPayment.stripe_payment_intent_id || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-[#1e2028] bg-[#0c0d12]/20 flex flex-wrap gap-3 items-center justify-between select-none">
              <div className="flex items-center gap-3">
                {selectedPayment.job_id && (
                  <button
                    type="button"
                    onClick={() => { onNavigateToJob(selectedPayment.job_id!); setSelectedPayment(null); }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-lg transition active:scale-95 flex items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Invoice</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-slate-400 hover:text-white text-xs font-mono uppercase tracking-wider px-4 py-2.5 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
