import React, { useState, useEffect } from 'react';
import { Customer, CustomerVehicle, Job } from '../types';
import { api } from '../lib/api';
import { 
  Users, Plus, Search, Edit2, Trash2, ArrowLeft, Phone, Mail, 
  MapPin, ClipboardList, Car, FileText, ChevronRight, X, User,
  Calendar, Wrench, Package, Info
} from 'lucide-react';

interface CustomersViewProps {
  onNavigateToTab: (tab: string, vehicleId?: number) => void;
  onSelectVehicleForManual?: (vehicle: any) => void;
}

export default function CustomersView({ onNavigateToTab }: CustomersViewProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Profile associations
  const [customerVehicles, setCustomerVehicles] = useState<CustomerVehicle[]>([]);
  const [customerJobs, setCustomerJobs] = useState<Job[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form states
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cNotes, setCNotes] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCustomers();
      setCustomers(data);
      // Sync selected profile if open
      if (selectedCustomer) {
        const updated = data.find(c => c.id === selectedCustomer.id);
        if (updated) {
          setSelectedCustomer(updated);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customer index.');
    } finally {
      setLoading(false);
    }
  };

  const loadProfileAssociations = async (customerId: number) => {
    try {
      const vehicles = await api.getCustomerVehicles(customerId);
      setCustomerVehicles(vehicles);

      const allJobs = await api.getJobs();
      const matchJobs = allJobs.filter(j => j.customer_id === customerId);
      setCustomerJobs(matchJobs);
    } catch (err) {
      console.error('Failed to load associations for customer profile:', err);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    loadProfileAssociations(customer.id);
  };

  const openCustomerModal = (customer: Customer | null = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setCName(customer.name);
      setCPhone(customer.phone);
      setCEmail(customer.email);
      setCAddress(customer.address);
      setCNotes(customer.notes);
    } else {
      setEditingCustomer(null);
      setCName('');
      setCPhone('');
      setCEmail('');
      setCAddress('');
      setCNotes('');
    }
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: cName,
      phone: cPhone,
      email: cEmail,
      address: cAddress,
      notes: cNotes
    };

    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, { ...editingCustomer, ...payload });
      } else {
        await api.addCustomer(payload);
      }
      setIsCustomerModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to save customer account.');
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this?')) {
      return;
    }
    try {
      await api.deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer account.');
    }
  };

  // Filter list by name/phone/email
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="customers-view-container">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-theme pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-theme" />
            Customer Directory
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage contact credentials, client history, vehicle fleets, and billing items.
          </p>
        </div>

        <button
          onClick={() => openCustomerModal()}
          className="bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-bold rounded-lg px-4 py-2 text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow self-start md:self-center cursor-pointer"
          id="btn-add-customer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {loading && customers.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Users className="w-8 h-8 text-primary-theme animate-spin" />
          <p className="text-slate-400 text-sm">Synchronizing customer accounts database...</p>
        </div>
      ) : !selectedCustomer ? (
        // TABLE/LIST VIEW MODE
        <div className="space-y-4">
          
          {/* Search bar */}
          <div className="relative max-w-md select-none">
            <input
              type="text"
              placeholder="Search by client name, telephone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg bg-surface-theme border border-border-theme focus:border-primary-theme pl-10 pr-4 py-2 text-xs text-text-theme placeholder-slate-500 focus:outline-none transition"
              id="customer-search-input"
            />
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border-theme rounded-xl bg-surface-theme/10 max-w-xl mx-auto">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-xs uppercase font-bold">No Customers Found</p>
              <p className="text-slate-500 text-xs mt-1">Refine your keyword search or add a new customer.</p>
            </div>
          ) : (
            <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="border-b border-border-theme text-slate-500 uppercase font-mono tracking-wider bg-bg-theme/50">
                      <th className="p-4">Customer Name</th>
                      <th className="p-4">Telephone</th>
                      <th className="p-4">Email</th>
                      <th className="p-4 text-center">Vehicles Owned</th>
                      <th className="p-4">Last Visit</th>
                      <th className="p-4 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-theme text-slate-300">
                    {filteredCustomers.map((c) => (
                      <tr 
                        key={c.id} 
                        onClick={() => handleSelectCustomer(c)}
                        className="hover:bg-bg-theme/30 cursor-pointer transition"
                      >
                        <td className="p-4 font-bold text-slate-100 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-theme/10 border border-primary-theme/20 flex items-center justify-center text-primary-theme font-mono font-black text-[11px]">
                            {c.name.charAt(0)}
                          </div>
                          <span>{c.name}</span>
                        </td>
                        <td className="p-4 font-mono">{c.phone || 'N/A'}</td>
                        <td className="p-4 font-sans truncate max-w-[180px]">{c.email || 'N/A'}</td>
                        <td className="p-4 text-center font-mono font-bold">
                          <span className="bg-bg-theme border border-border-theme px-2 py-0.5 rounded text-slate-350">
                            {c.vehicle_count || 0}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-400">{c.last_visit || 'Never'}</td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openCustomerModal(c)}
                              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-bg-theme transition cursor-pointer"
                              title="Edit account credentials"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(c.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-bg-theme transition cursor-pointer"
                              title="Delete customer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        // PROFILE VIEW MODE
        <div className="space-y-6 animate-fade-in text-left" id="customer-profile-page">
          <button
            onClick={() => setSelectedCustomer(null)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-450 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Accounts Table</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Box: customer card details */}
            <div className="lg:col-span-4 bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-border-theme pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-theme" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">Profile Credentials</h3>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openCustomerModal(selectedCustomer)}
                    className="p-1.5 border border-border-theme hover:border-slate-500 rounded text-slate-300 hover:text-white transition cursor-pointer"
                    title="Edit account"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                    className="p-1.5 border border-border-theme hover:border-red-500 rounded text-slate-500 hover:text-red-400 transition cursor-pointer"
                    title="Delete customer account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Information Row Stack */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-theme/10 border border-primary-theme/20 flex items-center justify-center text-primary-theme font-black text-lg">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">{selectedCustomer.name}</h2>
                    <p className="text-[10px] text-slate-500 font-mono">Registered Account #{selectedCustomer.id.toString().padStart(4, '0')}</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs bg-bg-theme/40 p-4 border border-border-theme rounded-xl">
                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Telephone Number</span>
                      <a href={`tel:${selectedCustomer.phone}`} className="text-slate-200 hover:text-primary-theme font-mono underline block">
                        {selectedCustomer.phone || 'No phone recorded'}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-border-theme/40 pt-2.5">
                    <Mail className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Email Address</span>
                      <a href={`mailto:${selectedCustomer.email}`} className="text-slate-200 hover:text-primary-theme block underline truncate max-w-[200px]">
                        {selectedCustomer.email || 'No email recorded'}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-border-theme/40 pt-2.5">
                    <MapPin className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Billing / Mailing Address</span>
                      <span className="text-slate-300 block">{selectedCustomer.address || 'No billing address recorded'}</span>
                    </div>
                  </div>
                </div>

                {selectedCustomer.notes && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">CRM Client Memo Notes</span>
                    <p className="text-xs text-slate-400 italic bg-bg-theme/20 border border-border-theme p-3 rounded-lg leading-relaxed">
                      {selectedCustomer.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Box: associated vehicles & jobs */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Customer Vehicles Fleet Section */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-border-theme pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                    <Car className="w-4.5 h-4.5 text-primary-theme" />
                    Registered Vehicles Fleet ({customerVehicles.length})
                  </h3>
                  <button
                    onClick={() => onNavigateToTab('vehicles')}
                    className="bg-bg-theme hover:bg-bg-theme/80 border border-border-theme text-slate-300 px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary-theme" />
                    <span>Register Vehicle</span>
                  </button>
                </div>

                {customerVehicles.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 italic text-center">No vehicles registered for this client account yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customerVehicles.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => onNavigateToTab('vehicles', v.id)}
                        className="bg-bg-theme/40 hover:bg-bg-theme border border-border-theme hover:border-slate-700 p-4 rounded-xl cursor-pointer transition space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold bg-surface-theme text-slate-350 px-2 py-0.5 rounded">
                              {v.year}
                            </span>
                            <span className="text-[10px] font-mono text-primary-theme/90 font-bold">{v.color}</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-100 mt-2 truncate">
                            {v.make} {v.model}
                          </h4>
                          <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{v.engine}</p>
                        </div>
                        <div className="pt-2 border-t border-border-theme/40 flex justify-between items-center text-[10px] font-mono text-slate-400">
                          <span>Mileage: {v.current_mileage?.toLocaleString()} mi</span>
                          <span className="text-primary-theme text-[9px] uppercase font-bold flex items-center gap-0.5">
                            View Log <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer repair job histories */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-border-theme pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                    <ClipboardList className="w-4.5 h-4.5 text-primary-theme" />
                    Repair Orders & Work Service History ({customerJobs.length})
                  </h3>
                  <button
                    onClick={() => onNavigateToTab('jobs')}
                    className="bg-bg-theme hover:bg-bg-theme/80 border border-border-theme text-slate-300 px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary-theme" />
                    <span>New Ticket</span>
                  </button>
                </div>

                {customerJobs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 italic text-center">No service history files recorded for this customer.</p>
                ) : (
                  <div className="space-y-3">
                    {customerJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => onNavigateToTab('jobs')}
                        className="bg-bg-theme/40 hover:bg-bg-theme border border-border-theme hover:border-slate-700 p-4 rounded-xl cursor-pointer transition flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500">Ticket #{job.id.toString().padStart(4, '0')}</span>
                            <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                              job.status === 'Complete'
                                ? 'bg-green-950/20 text-green-400 border-green-800/30'
                                : job.status === 'In Progress'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-slate-900 text-slate-400 border-slate-750'
                            }`}>
                              {job.status}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-200">
                            {job.vehicle_year} {job.vehicle_make} {job.vehicle_model}
                          </h4>
                          <p className="text-xs text-slate-400 leading-normal">{job.description}</p>
                        </div>
                        <div className="text-right shrink-0 flex flex-col justify-center">
                          <span className="text-[10px] font-mono text-slate-500">EST COMPLETION</span>
                          <span className="text-xs font-bold text-primary-theme font-mono">{job.estimated_completion}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Customer Form Dialog Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="w-full max-w-lg rounded-xl border border-border-theme bg-surface-theme text-slate-100 overflow-hidden shadow-2xl">
            <div className="bg-bg-theme border-b border-border-theme px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-primary-theme" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  {editingCustomer ? 'Edit Customer Account' : 'Register Customer Account'}
                </h3>
              </div>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Miles Dyson"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Telephone *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 555-0199"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. mdyson@cyberdyne.net"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Billing / Mailing Address</label>
                <input
                  type="text"
                  placeholder="Street name, City, Zip"
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Internal Accounts Memo Notes</label>
                <textarea
                  placeholder="Preferred communication times, special diagnostic requests, discount groups..."
                  value={cNotes}
                  onChange={(e) => setCNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 border-t border-border-theme flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-200 animate-fade-in"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-theme hover:bg-primary-theme/90 text-slate-950 px-5 py-2 text-xs font-black uppercase tracking-wider transition-all"
                >
                  {editingCustomer ? 'Update Account' : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
