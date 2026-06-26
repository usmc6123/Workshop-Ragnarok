import React, { useState, useEffect } from 'react';
import { Job, JobPart, Customer, CustomerVehicle } from '../types';
import { api } from '../lib/api';
import { 
  ClipboardList, Plus, Trash2, Edit2, Calendar, Milestone, 
  User, Phone, Mail, FileText, CheckCircle, Clock, AlertTriangle,
  ArrowLeft, Package, DollarSign, PlusCircle, X, Wrench, FileEdit
} from 'lucide-react';

interface JobsViewProps {
  refreshTrigger: number;
}

export default function JobsView({ refreshTrigger }: JobsViewProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobParts, setJobParts] = useState<JobPart[]>([]);
  
  // Association lists for the forms
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [partsLoading, setPartsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status filters
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'In Progress' | 'Complete' | 'Cancelled'>('All');

  // Modals
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Job Form state
  const [vCustomerId, setVCustomerId] = useState('');
  const [vVehicleId, setVVehicleId] = useState('');
  const [jDesc, setJDesc] = useState('');
  const [jDiagnosisNotes, setJDiagnosisNotes] = useState('');
  const [jLaborNotes, setJNotes] = useState('');
  const [jStatus, setJStatus] = useState<Job['status']>('Pending');
  const [jEstCompletion, setJEstCompletion] = useState('');
  const [jLaborCost, setJLaborCost] = useState('0');

  // Part Form state
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [partQuantity, setPartQuantity] = useState('1');
  const [partUnitCost, setPartUnitCost] = useState('');
  const [partNotes, setPartNotes] = useState('');
  const [isAddingPart, setIsAddingPart] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchFormAssociations();
  }, [refreshTrigger]);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getJobs();
      setJobs(data);
      // Sync selected job if opened
      if (selectedJob) {
        const updated = data.find(j => j.id === selectedJob.id);
        if (updated) {
          setSelectedJob(updated);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load shop jobs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormAssociations = async () => {
    try {
      const custs = await api.getCustomers();
      setCustomers(custs);
      const vehs = await api.getVehiclesAll();
      setVehicles(vehs);
    } catch (err) {
      console.error('Failed to load associations for Job modal:', err);
    }
  };

  const fetchJobParts = async (jobId: number) => {
    setPartsLoading(true);
    try {
      const data = await api.getJobParts(jobId);
      setJobParts(data);
    } catch (err) {
      console.error('Failed to load job parts:', err);
    } finally {
      setPartsLoading(false);
    }
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
    fetchJobParts(job.id);
  };

  // Status Badge Helper
  const renderStatusBadge = (status: Job['status']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="bg-bg-theme border border-slate-700 text-slate-400 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Pending</span>
          </span>
        );
      case 'In Progress':
        return (
          <span className="bg-primary-theme/10 border border-primary-theme/20 text-primary-theme px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1">
            <Wrench className="w-3 h-3 text-primary-theme" />
            <span>In Progress</span>
          </span>
        );
      case 'Complete':
        return (
          <span className="bg-green-950/20 border border-green-800/30 text-green-400 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Complete</span>
          </span>
        );
      case 'Cancelled':
        return (
          <span className="bg-red-950/20 border border-red-800/30 text-red-400 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1">
            <X className="w-3 h-3 text-red-500" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Job add/edit dialog opening
  const openJobModal = (job: Job | null = null) => {
    if (job) {
      setEditingJob(job);
      setVCustomerId(job.customer_id.toString());
      setVVehicleId(job.vehicle_id.toString());
      setJDesc(job.description);
      setJDiagnosisNotes(job.diagnosis_notes || '');
      setJNotes(job.labor_notes || '');
      setJStatus(job.status);
      setJEstCompletion(job.estimated_completion);
      setJLaborCost(job.labor_cost?.toString() || '0');
    } else {
      setEditingJob(null);
      setVCustomerId(customers.length > 0 ? customers[0].id.toString() : '');
      setVVehicleId('');
      setJDesc('');
      setJDiagnosisNotes('');
      setJNotes('');
      setJStatus('Pending');
      setJEstCompletion(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]); // 2 days default
      setJLaborCost('0');
    }
    setIsJobModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vCustomerId || !vVehicleId) {
      alert('Required customer and vehicle associations missing.');
      return;
    }

    const payload = {
      customer_id: parseInt(vCustomerId, 10),
      vehicle_id: parseInt(vVehicleId, 10),
      description: jDesc,
      diagnosis_notes: jDiagnosisNotes,
      labor_notes: jLaborNotes,
      status: jStatus,
      estimated_completion: jEstCompletion,
      labor_cost: parseFloat(jLaborCost) || 0
    };

    try {
      if (editingJob) {
        await api.updateJob(editingJob.id, { ...editingJob, ...payload });
      } else {
        await api.addJob(payload);
      }
      setIsJobModalOpen(false);
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to save job details.');
    }
  };

  const handleDeleteJob = async (id: number) => {
    if (!window.confirm('Delete this repair work order permanently? Associated parts bills will also be deleted.')) return;
    try {
      await api.deleteJob(id);
      setSelectedJob(null);
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete job.');
    }
  };

  // Update status from within profile page
  const handleUpdateJobStatus = async (status: Job['status']) => {
    if (!selectedJob) return;
    try {
      const updated = { ...selectedJob, status };
      await api.updateJob(selectedJob.id, updated);
      await fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  // Parts handlers
  const handleAddJobPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setIsAddingPart(true);
    const payload = {
      part_name: partName,
      part_number: partNumber,
      quantity: parseInt(partQuantity, 10) || 1,
      unit_cost: parseFloat(partUnitCost) || 0,
      notes: partNotes
    };

    try {
      await api.addJobPart(selectedJob.id, payload);
      setPartName('');
      setPartNumber('');
      setPartQuantity('1');
      setPartUnitCost('');
      setPartNotes('');
      fetchJobParts(selectedJob.id);
    } catch (err: any) {
      alert(err.message || 'Failed to add part billing line.');
    } finally {
      setIsAddingPart(false);
    }
  };

  const handleDeleteJobPart = async (partId: number) => {
    if (!selectedJob) return;
    if (!window.confirm('Remove this part line from the work order?')) return;
    try {
      await api.deleteJobPart(selectedJob.id, partId);
      fetchJobParts(selectedJob.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete part item.');
    }
  };

  // Calculations
  const totalPartsCost = jobParts.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  const totalWorkOrderCost = totalPartsCost + (selectedJob?.labor_cost || 0);

  // Filter list by status tabs and search keywords
  const filteredJobs = jobs.filter(j => {
    if (statusFilter !== 'All' && j.status !== statusFilter) return false;
    return true;
  });

  // Filter vehicles selection dropdown in form based on chosen customer
  const availableVehiclesForForm = vehicles.filter(v => v.customer_id.toString() === vCustomerId);

  // Sync default vehicle ID when customer changes in form
  useEffect(() => {
    if (availableVehiclesForForm.length > 0) {
      setVVehicleId(availableVehiclesForForm[0].id.toString());
    } else {
      setVVehicleId('');
    }
  }, [vCustomerId, vehicles]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="jobs-view-container">
      
      {/* 1. Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-theme pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-theme" />
            Repair Tickets & Work Orders
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor diagnostics, maintain billing records, parts expenses, and work statuses.
          </p>
        </div>

        <button
          onClick={() => openJobModal()}
          className="bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-bold rounded-lg px-4 py-2 text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow self-start md:self-center cursor-pointer"
          id="btn-new-job"
        >
          <Plus className="w-4 h-4" />
          <span>Create Work Order</span>
        </button>
      </div>

      {loading && jobs.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Wrench className="w-8 h-8 text-primary-theme animate-spin" />
          <p className="text-slate-400 text-sm">Querying workshop jobs queue...</p>
        </div>
      ) : !selectedJob ? (
        // JOBS LIST & STATUS FILTER DECK
        <div className="space-y-4">
          
          {/* Status Tabs Filter */}
          <div className="flex flex-wrap gap-1.5 border-b border-border-theme pb-2 select-none">
            {(['All', 'Pending', 'In Progress', 'Complete', 'Cancelled'] as const).map((tab) => {
              const isActive = statusFilter === tab;
              const count = tab === 'All' 
                ? jobs.length 
                : jobs.filter(j => j.status === tab).length;

              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    isActive
                      ? 'bg-primary-theme text-slate-950 shadow font-black'
                      : 'text-slate-400 hover:text-white bg-transparent hover:bg-surface-theme'
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>

          {/* Grid Layout list */}
          {filteredJobs.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-border-theme bg-surface-theme/10 rounded-xl max-w-xl mx-auto space-y-4">
              <ClipboardList className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-350 uppercase">Queue is Empty</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No active service tickets match this status filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="jobs-tickets-grid">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => handleSelectJob(job)}
                  className="bg-gradient-to-b from-[#13141a]/80 to-bg-theme/80 backdrop-blur-sm border border-[#1e2028] hover:border-slate-700 hover:border-l-primary-theme border-l-[3px] border-l-[#1e2028] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer group shadow-lg"
                  id={`job-ticket-card-${job.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">
                        Ticket #{job.id.toString().padStart(4, '0')}
                      </span>
                      {renderStatusBadge(job.status)}
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] font-mono text-primary-theme uppercase font-bold block mb-1">
                        {job.vehicle_year} {job.vehicle_make} {job.vehicle_model}
                      </span>
                      <h3 className="text-sm font-bold text-slate-101 group-hover:text-primary-theme transition-colors leading-snug truncate">
                        {job.description}
                      </h3>
                      <p className="text-xs text-slate-400 font-sans mt-2 line-clamp-1">
                        Client: <span className="text-slate-300 font-bold">{job.customer_name}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border-theme/40 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        Est: {job.estimated_completion || 'N/A'}
                      </span>
                      <span className="text-slate-300 font-bold bg-surface-theme border border-border-theme px-2 py-0.5 rounded">
                        {job.vehicle_current_mileage?.toLocaleString() || 0} mi
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-border-theme/40">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openJobModal(job);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-surface-theme transition cursor-pointer"
                      title="Edit ticket"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteJob(job.id);
                      }}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-surface-theme transition cursor-pointer"
                      title="Delete ticket"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // TICKET PROFILE DETAIL MODE
        <div className="space-y-6 animate-fade-in text-left" id="job-ticket-detailed-profile">
          <button
            onClick={() => setSelectedJob(null)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition animate-fade-in"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Active Queue</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Box: Specs, Diagnostics, Parts, Billing */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Core Details Profile */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-6 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border-theme pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-bg-theme border border-border-theme text-slate-300 px-2.5 py-0.5 rounded">
                        Ticket #{selectedJob.id.toString().padStart(4, '0')}
                      </span>
                      {renderStatusBadge(selectedJob.status)}
                    </div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight font-sans">
                      {selectedJob.vehicle_year} {selectedJob.vehicle_make} {selectedJob.vehicle_model}
                    </h2>
                    <p className="text-sm font-bold text-primary-theme">{selectedJob.description}</p>
                  </div>

                  <button
                    onClick={() => openJobModal(selectedJob)}
                    className="border border-border-theme hover:border-primary-theme text-slate-350 px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer self-start"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    Edit Ticket Form
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-bg-theme border border-border-theme p-3.5 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Odometer In</span>
                    <span className="text-xs text-slate-200 font-bold block mt-1">
                      {selectedJob.vehicle_current_mileage?.toLocaleString() || '0'} mi
                    </span>
                  </div>
                  <div className="bg-bg-theme border border-border-theme p-3.5 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">VIN Number</span>
                    <span className="text-xs text-slate-200 font-bold block mt-1 truncate">
                      {selectedJob.vehicle_vin || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-bg-theme border border-border-theme p-3.5 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Est. Completion</span>
                    <span className="text-xs text-primary-theme font-bold block mt-1 font-mono">
                      {selectedJob.estimated_completion || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-bg-theme border border-border-theme p-3.5 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Labor Cost Estimate</span>
                    <span className="text-xs text-green-400 font-bold block mt-1 font-mono">
                      ${selectedJob.labor_cost?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>

                {selectedJob.diagnosis_notes && (
                  <div className="space-y-1.5 pt-2 border-t border-border-theme/40">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Diagnostics & Findings</span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-bg-theme/40 p-3.5 border border-border-theme rounded-lg font-sans">
                      {selectedJob.diagnosis_notes}
                    </p>
                  </div>
                )}

                {selectedJob.labor_notes && (
                  <div className="space-y-1.5 pt-2 border-t border-border-theme/40">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Labor comments / Technicians Instructions</span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-bg-theme/40 p-3.5 border border-border-theme rounded-lg font-sans">
                      {selectedJob.labor_notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Parts billing line items list */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-6 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-theme pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Package className="w-4.5 h-4.5 text-primary-theme" />
                    Parts List Bill / Materials ({jobParts.length})
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs font-mono font-bold">
                    <span className="text-slate-350 bg-bg-theme border border-border-theme px-3 py-1 rounded">
                      Parts Total: ${totalPartsCost.toFixed(2)}
                    </span>
                    <span className="text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded">
                      Work Order Total: ${totalWorkOrderCost.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Sub part additions form */}
                <form onSubmit={handleAddJobPart} className="bg-bg-theme border border-border-theme rounded-lg p-4 space-y-3">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block">
                    Add Part / Fluid Expense Item
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3 space-y-1">
                      <label className="block text-[9px] font-mono text-slate-500 uppercase">Part Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Brake Pads"
                        value={partName}
                        onChange={(e) => setPartName(e.target.value)}
                        className="w-full bg-surface-theme border border-border-theme rounded px-2.5 py-1.5 text-xs text-slate-205 focus:border-primary-theme focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="block text-[9px] font-mono text-slate-500 uppercase">Part Number</label>
                      <input
                        type="text"
                        placeholder="e.g. EBC-8290"
                        value={partNumber}
                        onChange={(e) => setPartNumber(e.target.value)}
                        className="w-full bg-surface-theme border border-border-theme rounded px-2.5 py-1.5 text-xs text-slate-202 focus:border-primary-theme focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-[9px] font-mono text-slate-500 uppercase">Qty</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={partQuantity}
                        onChange={(e) => setPartQuantity(e.target.value)}
                        className="w-full bg-surface-theme border border-border-theme rounded px-2.5 py-1.5 text-xs text-slate-202 focus:border-primary-theme focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-[9px] font-mono text-slate-500 uppercase">Unit Cost ($)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 45.99"
                        value={partUnitCost}
                        onChange={(e) => setPartUnitCost(e.target.value)}
                        className="w-full bg-surface-theme border border-border-theme rounded px-2.5 py-1.5 text-xs text-slate-202 focus:border-primary-theme focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={isAddingPart}
                        className="w-full bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-bold py-2 rounded text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* Parts Table */}
                {partsLoading ? (
                  <div className="text-center py-6 text-slate-500 text-xs">Loading items...</div>
                ) : jobParts.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-border-theme text-slate-500 text-xs rounded-lg select-none">
                    No parts logged on this service ticket bill yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto select-none">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border-theme text-slate-500 uppercase font-mono tracking-wider">
                          <th className="pb-2">Part Details</th>
                          <th className="pb-2">Part #</th>
                          <th className="pb-2 text-right">Quantity</th>
                          <th className="pb-2 text-right">Unit Price</th>
                          <th className="pb-2 text-right">Total Price</th>
                          <th className="pb-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-theme text-slate-300">
                        {jobParts.map((part) => (
                          <tr key={part.id} className="hover:bg-bg-theme/35 transition">
                            <td className="py-3 font-semibold text-slate-200">{part.part_name}</td>
                            <td className="py-3 font-mono text-slate-400">{part.part_number || 'N/A'}</td>
                            <td className="py-3 text-right font-mono">{part.quantity}</td>
                            <td className="py-3 text-right font-mono">${part.unit_cost?.toFixed(2)}</td>
                            <td className="py-3 text-right font-bold text-slate-101 font-mono">
                              ${(part.quantity * part.unit_cost)?.toFixed(2)}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleDeleteJobPart(part.id)}
                                className="text-slate-500 hover:text-red-400 p-1 rounded transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Status Updates + Contact Coordinates */}
            <div className="lg:col-span-4 space-y-6 select-none">
              
              {/* Status Update Card */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350 font-sans border-b border-border-theme pb-2 text-left">
                  Job Status Control
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['Pending', 'In Progress', 'Complete', 'Cancelled'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateJobStatus(st)}
                      className={`py-2 rounded text-[10px] font-black uppercase tracking-wider transition ${
                        selectedJob.status === st
                          ? 'bg-primary-theme text-slate-950 font-bold shadow'
                          : 'bg-bg-theme border border-border-theme text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Coordinates Card */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-355 border-b border-border-theme pb-2">
                  Client Contact Coordinates
                </h3>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Client Name</span>
                      <span className="text-xs text-slate-202 font-bold block">{selectedJob.customer_name}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-border-theme/40 pt-2.5">
                    <Phone className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Telephone Number</span>
                      <a href={`tel:${selectedJob.customer_phone}`} className="text-xs text-slate-202 hover:text-primary-theme font-mono block underline">
                        {selectedJob.customer_phone || 'N/A'}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-border-theme/40 pt-2.5">
                    <Mail className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Email Address</span>
                      <a href={`mailto:${selectedJob.customer_email}`} className="text-xs text-slate-202 hover:text-primary-theme font-mono block underline truncate max-w-[180px]">
                        {selectedJob.customer_email || 'N/A'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Create / Edit Job Modal */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="w-full max-w-lg rounded-xl border border-border-theme bg-surface-theme text-slate-100 overflow-hidden shadow-2xl">
            <div className="bg-bg-theme border-b border-border-theme px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4.5 h-4.5 text-primary-theme" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-202 font-mono">
                  {editingJob ? 'Edit Repair Work Order' : 'Create Repair Work Order'}
                </h3>
              </div>
              <button onClick={() => setIsJobModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-4 text-left">
                {/* Customer Select dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Customer *</label>
                  <select
                    required
                    value={vCustomerId}
                    onChange={(e) => setVCustomerId(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-205 text-text-theme text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>Select Customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id.toString()}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Vehicle Select dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Vehicle *</label>
                  <select
                    required
                    value={vVehicleId}
                    onChange={(e) => setVVehicleId(e.target.value)}
                    disabled={!vCustomerId || availableVehiclesForForm.length === 0}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-205 text-text-theme text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none disabled:opacity-40 cursor-pointer"
                  >
                    <option value="" disabled>Select Vehicle...</option>
                    {availableVehiclesForForm.map((v) => (
                      <option key={v.id} value={v.id.toString()}>{v.year} {v.make} {v.model}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Repair Description / Customer Concern *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engine ticking noise on cold start, fluid leak checks"
                  value={jDesc}
                  onChange={(e) => setJDesc(e.target.value)}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Job Status</label>
                  <select
                    value={jStatus}
                    onChange={(e) => setJStatus(e.target.value as Job['status'])}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-202 text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Complete">Complete</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Est. Completion</label>
                  <input
                    type="date"
                    value={jEstCompletion}
                    onChange={(e) => setJEstCompletion(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-202 text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Labor Cost ($)</label>
                  <input
                    type="text"
                    value={jLaborCost}
                    onChange={(e) => setJLaborCost(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-202 text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Diagnosis Findings & Notes</label>
                <textarea
                  placeholder="Insert findings from initial diagnostic check..."
                  value={jDiagnosisNotes}
                  onChange={(e) => setJDiagnosisNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-202 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Detailed Technicians Labor / Action Instructions</label>
                <textarea
                  placeholder="Mechanic instructions... e.g. check spark plug gap, check coil packs"
                  value={jLaborNotes}
                  onChange={(e) => setJNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-202 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 border-t border-border-theme flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold tracking-wider text-slate-450 uppercase hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-theme hover:bg-primary-theme/90 text-slate-950 px-5 py-2 text-xs font-black uppercase tracking-wider transition-all"
                >
                  {editingJob ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

