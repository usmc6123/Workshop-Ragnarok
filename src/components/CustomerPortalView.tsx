import React, { useState, useEffect } from 'react';
import { api, getApiBase } from '../lib/api';
import { 
  Wrench, Check, X, Phone, MapPin, Car, User, 
  DollarSign, CheckCircle, Clock, AlertTriangle, Camera, Shield, ArrowRight
} from 'lucide-react';

interface CustomerPortalViewProps {
  token: string;
}

export default function CustomerPortalView({ token }: CustomerPortalViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<any | null>(null);
  const [selectedLightboxPhoto, setSelectedLightboxPhoto] = useState<any | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Parse URL search parameters for payment results
  const queryParams = new URLSearchParams(window.location.search);
  const isPaymentSuccess = queryParams.get('payment') === 'success';
  const isPaymentCancelled = queryParams.get('payment') === 'cancelled';

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPortalData(token);
      setPortalData(data);
    } catch (err: any) {
      console.error('Failed to load portal data:', err);
      setError(err.message || 'The request was invalid or the portal link has expired.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const handleAction = async (type: 'part' | 'service', id: number, status: 'approved' | 'declined') => {
    try {
      // Optimistic update
      setPortalData((prev: any) => {
        if (!prev) return prev;
        const targetList = type === 'part' ? 'parts' : 'services';
        const updatedList = prev[targetList].map((item: any) => {
          if (item.id === id) {
            return { ...item, approval_status: status };
          }
          return item;
        });
        return { ...prev, [targetList]: updatedList };
      });

      await api.approvePortalLineItem(token, type, id, status);
    } catch (err: any) {
      console.error('Failed to record action:', err);
      // Revert on error
      loadData();
    }
  };

  const handlePayNow = async () => {
    try {
      setPaymentLoading(true);
      const res = await api.createPortalCheckoutSession(token);
      if (res && res.url) {
        window.location.href = res.url;
      } else {
        throw new Error('Failed to retrieve checkout URL.');
      }
    } catch (err: any) {
      console.error('Payment redirect failed:', err);
      alert(err.message || 'Payment server is currently unreachable. Please contact the workshop.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center font-mono text-slate-400 p-6">
        <span className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-4" />
        <span className="tracking-wider uppercase text-xs">SYNCHRONIZING REPAIR PORTAL COORDINATES...</span>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-center select-none font-mono">
        <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-5 text-red-400">
          <AlertTriangle className="w-12 h-12" />
        </div>
        <h1 className="text-lg font-bold text-slate-200 uppercase tracking-widest">
          ACCESS EXPIRED OR INVALID
        </h1>
        <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
          The security key provided in the URL is incorrect, expired, or has been revoked. If you believe this is an error, please request a new link from the service advisor.
        </p>
      </div>
    );
  }

  const { job, parts, services, photos, shopSettings } = portalData;

  // Invoice calculations
  const approvedParts = parts.filter((p: any) => p.approval_status === 'approved');
  const totalPartsCost = approvedParts.reduce((sum: number, item: any) => {
    const qty = Math.max(0, parseInt(item.quantity, 10) || 0);
    const cost = Math.max(0, parseFloat(item.unit_cost) || 0);
    return sum + (qty * cost);
  }, 0);

  const approvedServices = services.filter((s: any) => s.approval_status === 'approved');
  const totalServicesCost = approvedServices.reduce((sum: number, item: any) => {
    return sum + (parseFloat(item.base_price_charged) || 0) + (parseFloat(item.additional_hours_cost) || 0);
  }, 0);

  const laborCost = job.labor_cost && !isNaN(parseFloat(job.labor_cost)) ? parseFloat(job.labor_cost) : 0;
  const taxRatePercent = shopSettings.tax_rate && !isNaN(parseFloat(shopSettings.tax_rate)) ? parseFloat(shopSettings.tax_rate) : 0;
  const taxAmount = (totalPartsCost + laborCost) * (taxRatePercent / 100);
  const grandTotal = totalPartsCost + totalServicesCost + laborCost + taxAmount;

  // Let's count how many items are currently approved
  const approvedCount = approvedParts.length + approvedServices.length;

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-200 selection:bg-amber-500/30 selection:text-white pb-16">
      
      {/* 1. Header & Shop Branding */}
      <header className="sticky top-0 z-40 bg-[#0e0f14]/95 backdrop-blur border-b border-white/5 shadow-md px-6 py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {shopSettings.shop_logo_url ? (
              <img 
                src={shopSettings.shop_logo_url} 
                alt={shopSettings.shop_name || 'Workshop Logo'} 
                className="w-12 h-12 object-contain rounded-lg border border-white/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Wrench className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-md font-black tracking-wider uppercase font-mono text-white">
                {shopSettings.shop_name || 'WORKSHOP: RAGNARÖK'}
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest mt-0.5">
                SECURE CUSTOMER PORTAL
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:items-end text-slate-400 font-mono text-xs gap-1">
            {shopSettings.shop_phone && (
              <a href={`tel:${shopSettings.shop_phone}`} className="flex items-center gap-1.5 hover:text-white transition">
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                <span>{shopSettings.shop_phone}</span>
              </a>
            )}
            {shopSettings.shop_address && (
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <MapPin className="w-3.5 h-3.5" />
                <span>{[shopSettings.shop_address, shopSettings.shop_city, shopSettings.shop_state].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">

        {/* Payment Confirmation Overlay */}
        {isPaymentSuccess && (
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-6 rounded-2xl flex flex-col items-center text-center shadow-lg animate-fade-in font-mono">
            <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-3 text-emerald-400">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-md font-bold text-emerald-400 uppercase tracking-wider">Payment Transaction Successful</h2>
            <p className="text-xs text-slate-400 max-w-md mt-2">
              Your payment has been completed and verified! The workshop queue has been updated automatically, and our technicians have been notified.
            </p>
          </div>
        )}

        {isPaymentCancelled && (
          <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-xl flex items-center gap-3 shadow-md font-mono text-xs text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Stripe Checkout was cancelled. Your invoice remains unpaid.</span>
          </div>
        )}

        {/* 2. Customer & Vehicle Info Grid */}
        <section className="bg-[#111218] border border-white/5 rounded-2xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
          <div className="space-y-4">
            <h3 className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Vehicle Fleet Profile</h3>
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white uppercase">
                  {job.vehicle_year} {job.vehicle_make} {job.vehicle_model}
                </h4>
                <p className="text-xs text-slate-400 mt-1 uppercase">
                  Engine: {job.vehicle_engine || 'N/A'}
                </p>
                {job.vehicle_vin && (
                  <p className="text-[10px] text-slate-500 mt-1 font-mono uppercase tracking-widest">
                    VIN: {job.vehicle_vin}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
            <h3 className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Client Summary</h3>
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white uppercase">{job.customer_name}</h4>
                <p className="text-xs text-slate-400 mt-1">Status Badge:</p>
                
                {/* 3. Job Status Badge */}
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-amber-500/10 text-amber-500 border-amber-500/20">
                  <Clock className="w-3 h-3" />
                  <span>Job Status: {job.status}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Job Details Card */}
        <section className="bg-[#111218] border border-white/5 rounded-2xl p-6 shadow-xl font-mono space-y-3">
          <h3 className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Service Overview / Primary Concern</h3>
          <p className="text-xs text-slate-300 leading-relaxed bg-[#0e0f14] p-4 rounded-xl border border-white/5">
            {job.description || 'No job description provided.'}
          </p>
        </section>

        {/* 4. Photo Gallery (Lightbox) */}
        {photos && photos.length > 0 && (
          <section className="bg-[#111218] border border-white/5 rounded-2xl p-6 shadow-xl font-mono space-y-4">
            <h3 className="text-slate-500 text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-500" />
              <span>Inspection Photos & Diagnostic Documentation ({photos.length})</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map((photo: any) => (
                <div 
                  key={photo.id}
                  onClick={() => setSelectedLightboxPhoto(photo)}
                  className="group relative aspect-video rounded-xl overflow-hidden border border-white/5 bg-black cursor-pointer hover:border-amber-500/40 transition-all duration-200 shadow-md"
                >
                  <img 
                    src={photo.photo_data} 
                    alt={photo.caption || 'Inspection photo'} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                    <span className="text-[9px] text-white font-bold tracking-wider truncate uppercase">
                      {photo.photo_type === 'before' ? 'Before Repairs' : 'After Repairs'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. Line Items Table */}
        <section className="bg-[#111218] border border-white/5 rounded-2xl shadow-xl overflow-hidden font-mono">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Required Parts & Services Approvals</h3>
            <span className="text-[10px] text-slate-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
              Interactive View
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider bg-[#0e0f14]/50">
                  <th className="px-6 py-3.5 font-bold">Line Item Description</th>
                  <th className="px-6 py-3.5 font-bold text-center">Type</th>
                  <th className="px-6 py-3.5 font-bold text-right">Unit Price</th>
                  <th className="px-6 py-3.5 font-bold text-center">Approve / Decline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                
                {/* Services Section */}
                {services.map((item: any) => {
                  const isApproved = item.approval_status === 'approved';
                  const isDeclined = item.approval_status === 'declined';
                  const totalCost = (parseFloat(item.base_price_charged) || 0) + (parseFloat(item.additional_hours_cost) || 0);

                  return (
                    <tr 
                      key={`srv-${item.id}`} 
                      className={`transition ${isDeclined ? 'opacity-40 line-through text-slate-500' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-bold text-white block">{item.service_name_snapshot}</span>
                        {item.additional_hours > 0 && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            +{item.additional_hours} additional tech hours logged
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/10 text-[9px] uppercase font-bold">
                          Service
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white">
                        ${totalCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                              <Check className="w-3.5 h-3.5" />
                              <span>Approved</span>
                            </span>
                          ) : isDeclined ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                              <X className="w-3.5 h-3.5" />
                              <span>Declined</span>
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleAction('service', item.id, 'approved')}
                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-lg text-[10px] font-bold transition uppercase tracking-wider cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction('service', item.id, 'declined')}
                                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 rounded-lg text-[10px] font-bold transition uppercase tracking-wider cursor-pointer"
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Parts Section */}
                {parts.map((item: any) => {
                  const isApproved = item.approval_status === 'approved';
                  const isDeclined = item.approval_status === 'declined';
                  const totalCost = (parseInt(item.quantity, 10) || 0) * (parseFloat(item.unit_cost) || 0);

                  return (
                    <tr 
                      key={`prt-${item.id}`} 
                      className={`transition ${isDeclined ? 'opacity-40 line-through text-slate-500' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-bold text-white block">{item.part_name}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Part #: {item.part_number || 'N/A'} • Qty: {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/10 text-[9px] uppercase font-bold">
                          Part
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white">
                        ${totalCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                              <Check className="w-3.5 h-3.5" />
                              <span>Approved</span>
                            </span>
                          ) : isDeclined ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                              <X className="w-3.5 h-3.5" />
                              <span>Declined</span>
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleAction('part', item.id, 'approved')}
                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-lg text-[10px] font-bold transition uppercase tracking-wider cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction('part', item.id, 'declined')}
                                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 rounded-lg text-[10px] font-bold transition uppercase tracking-wider cursor-pointer"
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Always include Labor row as standard and approved */}
                {laborCost > 0 && (
                  <tr className="bg-[#0e0f14]/20">
                    <td className="px-6 py-4">
                      <span className="font-bold text-white block">Technician Labor & Diagnostics</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Flat-rate shop labor schedule
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/10 text-[9px] uppercase font-bold">
                        Labor
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-white">
                      ${laborCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                      Included
                    </td>
                  </tr>
                )}

                {parts.length === 0 && services.length === 0 && laborCost === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No line items registered for this job profile.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 6. Running Total & Stripe Pay Now Section */}
        <section className="bg-[#111218] border border-white/5 rounded-2xl p-6 shadow-xl font-mono flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1.5">
            <h4 className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Approved Invoice Breakdown</h4>
            <div className="text-xs text-slate-400 space-y-1">
              <div>Approved parts total: <span className="text-slate-200 font-bold">${totalPartsCost.toFixed(2)}</span></div>
              {totalServicesCost > 0 && <div>Approved services total: <span className="text-slate-200 font-bold">${totalServicesCost.toFixed(2)}</span></div>}
              {laborCost > 0 && <div>Shop labor total: <span className="text-slate-200 font-bold">${laborCost.toFixed(2)}</span></div>}
              {taxAmount > 0 && <div>Sales Tax ({taxRatePercent}%): <span className="text-slate-200 font-bold">${taxAmount.toFixed(2)}</span></div>}
            </div>
            
            <div className="pt-2 border-t border-white/5 flex items-baseline gap-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Grand Total:</span>
              <span className="text-2xl font-black text-amber-500">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0 md:w-80">
            {job.payment_status === 'Paid' ? (
              <div className="bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-center flex flex-col items-center gap-1 shadow-inner">
                <CheckCircle className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Invoice Fully Paid</span>
                <span className="text-[10px] text-emerald-500 font-mono">Thank you for your business!</span>
              </div>
            ) : approvedCount === 0 ? (
              <div className="bg-[#0e0f14] border border-white/5 text-slate-500 p-4 rounded-xl text-center text-[11px] leading-relaxed">
                Please approve at least one part or service line item above to authorize checkout.
              </div>
            ) : (
              <button
                onClick={handlePayNow}
                disabled={paymentLoading}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-zinc-800 disabled:to-zinc-800 text-black disabled:text-zinc-500 font-black rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-[0_4px_20px_rgba(245,158,11,0.15)] cursor-pointer"
              >
                {paymentLoading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    <span>Connecting Secure Stripe Portal...</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    <span>Secure Stripe Pay Now</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            )}
            
            <div className="flex items-center justify-center gap-1 text-[9px] text-slate-500 font-mono mt-1">
              <Shield className="w-3 h-3 text-emerald-500" />
              <span>AES-256 Encrypted Stripe Checkout Protocol</span>
            </div>
          </div>
        </section>

      </main>

      {/* Lightbox photo portal */}
      {selectedLightboxPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setSelectedLightboxPhoto(null)}
        >
          <button 
            onClick={() => setSelectedLightboxPhoto(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedLightboxPhoto.photo_data} 
              alt={selectedLightboxPhoto.caption || 'Ticket photo'} 
              className="max-w-full max-h-[75vh] object-contain rounded-lg border border-white/10 shadow-2xl"
              referrerPolicy="no-referrer"
            />
            {selectedLightboxPhoto.caption && (
              <div className="bg-[#13141a]/95 border border-[#2b2d37] rounded-lg px-4 py-2 max-w-lg text-center shadow-xl">
                <p className="text-sm font-semibold text-slate-200 font-mono">{selectedLightboxPhoto.caption}</p>
                <span className="text-[10px] font-mono text-slate-500 uppercase mt-1 block">
                  {selectedLightboxPhoto.photo_type === 'before' ? 'Before Repairs' : 'After Repairs'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
