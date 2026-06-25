/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { Job, JobPart } from '../types';
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
  const [loading, setLoading] = useState(true);
  const [partsLoading, setPartsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Job Form state
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [vYear, setVYear] = useState('');
  const [vMake, setVMake] = useState('');
  const [vModel, setVModel] = useState('');
  const [vVin, setVVin] = useState('');
  const [vMileageIn, setVMileageIn] = useState('');
  const [jDesc, setJDesc] = useState('');
  const [jNotes, setJNotes] = useState('');
  const [jStatus, setJStatus] = useState<'Pending' | 'In Progress' | 'Complete'>('Pending');
  const [jEstCompletion, setJEstCompletion] = useState('');

  // Part Form state
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [partQuantity, setPartQuantity] = useState('1');
  const [partUnitCost, setPartUnitCost] = useState('');
  const [partNotes, setPartNotes] = useState('');
  const [isAddingPart, setIsAddingPart] = useState(false);

  useEffect(() => {
    fetchJobs();
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
          <span className="bg-[#1a1c24] border border-slate-700 text-slate-400 px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Pending</span>
          </span>
        );
      case 'In Progress':
        return (
          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1">
            <Wrench className="w-3 h-3 text-amber-500" />
            <span>In Progress</span>
          </span>
        );
      case 'Complete':
        return (
          <span className="bg-green-950/20 border border-green-800/30 text-green-400 px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Complete</span>
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
      setCName(job.customer_name);
      setCPhone(job.customer_phone);
      setCEmail(job.customer_email);
      setVYear(job.vehicle_year);
      setVMake(job.vehicle_make);
      setVModel(job.vehicle_model);
      setVVin(job.vehicle_vin);
      setVMileageIn(job.vehicle_mileage_in.toString());
      setJDesc(job.description);
      setJNotes(job.notes);
      setJStatus(job.status);
      setJEstCompletion(job.estimated_completion);
    } else {
      setEditingJob(null);
      setCName('');
      setCPhone('');
      setCEmail('');
      setVYear('');
      setVMake('');
      setVModel('');
      setVVin('');
      setVMileageIn('');
      setJDesc('');
      setJNotes('');
      setJStatus('Pending');
      setJEstCompletion(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]); // 2 days default
    }
    setIsJobModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      customer_name: cName,
      customer_phone: cPhone,
      customer_email: cEmail,
      vehicle_year: vYear,
      vehicle_make: vMake,
      vehicle_model: vModel,
      vehicle_vin: vVin,
      vehicle_mileage_in: parseInt(vMileageIn, 10) || 0,
      description: jDesc,
      notes: jNotes,
      status: jStatus,
      estimated_completion: jEstCompletion
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
    if (!window.confirm('Delete this shop job? All parts entries associated with it will be removed.')) return;
    try {
      await api.deleteJob(id);
      setSelectedJob(null);
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete job.');
    }
  };

  // Status Selector change directly on Profile Page
  const handleUpdateJobStatus = async (status: Job['status']) => {
    if (!selectedJob) return;
    try {
      const updated = { ...selectedJob, status };
      await api.updateJob(selectedJob.id, updated);
      await fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to update job status.');
    }
  };

  // Job Parts handlers
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
      alert(err.message || 'Failed to add job part.');
    } finally {
      setIsAddingPart(false);
    }
  };

  const handleDeleteJobPart = async (partId: number) => {
    if (!selectedJob) return;
    if (!window.confirm('Remove this part from the job bill?')) return;
    try {
      await api.deleteJobPart(selectedJob.id, partId);
      fetchJobParts(selectedJob.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete job part.');
    }
  };

  // Totals calculations
  const totalPartsCost = jobParts.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="jobs-view-container">
      {/* 1. Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e2028] pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-500" />
            Shop Job Tracking
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor, update, and manage active service tickets. Keep parts bills updated and notify clients.
          </p>
        </div>

        <button
          onClick={() => openJobModal()}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg px-4 py-2 text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow self-start md:self-center cursor-pointer"
          id="btn-new-job"
        >
          <Plus className="w-4 h-4" />
          <span>New Job Ticket</span>
        </button>
      </div>

      {loading && jobs.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Wrench className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading service queue...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[#1e2028] bg-[#13141a]/10 rounded-xl max-w-xl mx-auto space-y-4">
          <ClipboardList className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-300 uppercase">No Active Tickets</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your service queue is completely clear. Click below to write a new diagnostic job ticket.
            </p>
          </div>
          <button
            onClick={() => openJobModal()}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg px-4 py-2 text-xs uppercase tracking-wider transition shadow cursor-pointer"
          >
            Create New Job Ticket
          </button>
        </div>
      ) : !selectedJob ? (
        // Grid Overview List
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="jobs-tickets-grid">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => handleSelectJob(job)}
              className="bg-gradient-to-b from-[#13141a] to-[#0f1015] border border-[#1e2028] hover:border-slate-700 hover:border-l-amber-500 border-l-[3px] border-l-[#1e2028] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer group shadow-lg"
              id={`job-ticket-card-${job.id}`}
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">
                    Ticket #{job.id.toString().padStart(4, '0')}
                  </span>
                  {renderStatusBadge(job.status)}
                </div>

                <div>
                  <span className="text-[10px] font-mono text-amber-500 uppercase font-bold block mb-1">
                    {job.vehicle_year} {job.vehicle_make} {job.vehicle_model}
                  </span>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-500 transition-colors leading-snug">
                    {job.description}
                  </h3>
                  <p className="text-xs text-slate-400 font-sans mt-2 line-clamp-2">
                    Client: <span className="text-slate-300 font-bold">{job.customer_name}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-[#1e2028] flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    Est: {job.estimated_completion || 'N/A'}
                  </span>
                  <span className="text-slate-300 font-bold bg-[#1a1c24] border border-[#1e2028] px-2 py-0.5 rounded">
                    {job.vehicle_mileage_in?.toLocaleString()} mi
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-2.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openJobModal(job);
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#1a1c24] transition cursor-pointer"
                  title="Edit ticket"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteJob(job.id);
                  }}
                  className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-[#1a1c24] transition cursor-pointer"
                  title="Delete ticket"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Ticket detailed Profile Mode
        <div className="space-y-6 animate-fade-in" id="job-ticket-detailed-profile">
          {/* Back Navigation Row */}
          <button
            onClick={() => setSelectedJob(null)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Active Queue</span>
          </button>

          {/* Core Layout Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Main Details Deck */}
            <div className="lg:col-span-8 space-y-6">
              {/* Profile Card */}
              <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-6 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#1e2028] pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-[#1a1c24] border border-[#1e2028] text-slate-300 px-2.5 py-0.5 rounded">
                        Ticket #{selectedJob.id.toString().padStart(4, '0')}
                      </span>
                      {renderStatusBadge(selectedJob.status)}
                    </div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight font-sans">
                      {selectedJob.vehicle_year} {selectedJob.vehicle_make} {selectedJob.vehicle_model}
                    </h2>
                    <p className="text-sm font-bold text-amber-500">{selectedJob.description}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openJobModal(selectedJob)}
                      className="border border-slate-700 hover:border-amber-500 text-slate-300 px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      Edit Ticket Form
                    </button>
                  </div>
                </div>

                {/* Sub specifications bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#0a0a0f] border border-[#1e2028] p-3.5 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Odometer In</span>
                    <span className="text-xs text-slate-200 font-bold block mt-1">
                      {selectedJob.vehicle_mileage_in?.toLocaleString() || '0'} mi
                    </span>
                  </div>
                  <div className="bg-[#0a0a0f] border border-[#1e2028] p-3.5 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">VIN Number</span>
                    <span className="text-xs text-slate-200 font-bold block mt-1 truncate">
                      {selectedJob.vehicle_vin || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-[#0a0a0f] border border-[#1e2028] p-3.5 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Est. Completion</span>
                    <span className="text-xs text-amber-400 font-bold block mt-1">
                      {selectedJob.estimated_completion || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* notes and findings block */}
                {selectedJob.notes && (
                  <div className="space-y-1.5 pt-2 border-t border-[#1e2028]">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Labor comments / diagnostic symptoms</span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-[#0a0a0f]/40 p-3.5 border border-[#1e2028] rounded-lg">
                      {selectedJob.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Parts list Billing module */}
              <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-6 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#1e2028] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Package className="w-4.5 h-4.5 text-amber-500" />
                    Parts List Bill / Materials ({jobParts.length})
                  </h3>
                  <span className="text-xs font-mono font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded">
                    Total Parts: ${totalPartsCost.toFixed(2)}
                  </span>
                </div>

                {/* Sub part additions form */}
                <form onSubmit={handleAddJobPart} className="bg-[#0a0a0f] border border-[#1e2028] rounded-lg p-4 space-y-3">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block">
                    Add Part / Fluid Expense Item
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3 space-y-1">
                      <label className="block text-[9px] font-mono text-slate-500 uppercase">Part Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Oil Filter"
                        value={partName}
                        onChange={(e) => setPartName(e.target.value)}
                        className="w-full bg-[#13141a] border border-[#1e2028] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="block text-[9px] font-mono text-slate-500 uppercase">Part Number</label>
                      <input
                        type="text"
                        placeholder="e.g. FL-500S"
                        value={partNumber}
                        onChange={(e) => setPartNumber(e.target.value)}
                        className="w-full bg-[#13141a] border border-[#1e2028] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
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
                        className="w-full bg-[#13141a] border border-[#1e2028] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-[9px] font-mono text-slate-500 uppercase">Unit Cost ($)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 12.99"
                        value={partUnitCost}
                        onChange={(e) => setPartUnitCost(e.target.value)}
                        className="w-full bg-[#13141a] border border-[#1e2028] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={isAddingPart}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
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
                  <div className="text-center py-6 border border-dashed border-[#1e2028] text-slate-500 text-xs rounded-lg">
                    No parts logged on this service ticket bill yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#1e2028] text-slate-500 uppercase font-mono tracking-wider">
                          <th className="pb-2">Part Details</th>
                          <th className="pb-2">Part #</th>
                          <th className="pb-2 text-right">Quantity</th>
                          <th className="pb-2 text-right">Unit Price</th>
                          <th className="pb-2 text-right">Total Price</th>
                          <th className="pb-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e2028] text-slate-300">
                        {jobParts.map((part) => (
                          <tr key={part.id} className="hover:bg-[#1a1c24]/35 transition">
                            <td className="py-3 font-semibold text-slate-200">{part.part_name}</td>
                            <td className="py-3 font-mono text-slate-400">{part.part_number || 'N/A'}</td>
                            <td className="py-3 text-right font-mono">{part.quantity}</td>
                            <td className="py-3 text-right font-mono">${part.unit_cost?.toFixed(2)}</td>
                            <td className="py-3 text-right font-bold text-slate-100 font-mono">
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

            {/* Right Customer Contact / Status Controls Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Status Update Card */}
              <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans">
                  Job Status Control
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['Pending', 'In Progress', 'Complete'] as Job['status'][]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateJobStatus(st)}
                      className={`py-2 rounded text-[10px] font-black uppercase tracking-wider transition ${
                        selectedJob.status === st
                          ? 'bg-amber-500 text-slate-950 font-bold shadow'
                          : 'bg-[#0a0a0f] border border-[#1e2028] text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer coordinates deck */}
              <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans border-b border-[#1e2028] pb-2">
                  Client Contact Coordinates
                </h3>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Client Name</span>
                      <span className="text-xs text-slate-200 font-bold block">{selectedJob.customer_name}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Telephone Number</span>
                      <a href={`tel:${selectedJob.customer_phone}`} className="text-xs text-slate-200 hover:text-amber-400 font-mono block underline">
                        {selectedJob.customer_phone || 'N/A'}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Email Address</span>
                      <a href={`mailto:${selectedJob.customer_email}`} className="text-xs text-slate-200 hover:text-amber-400 font-mono block underline truncate max-w-[180px]">
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

      {/* 3. Add / Edit Job Dialog Modal */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="w-full max-w-lg rounded-xl border border-[#1e2028] bg-[#13141a] text-slate-100 overflow-hidden shadow-2xl">
            <div className="bg-[#1a1c24] border-b border-[#1e2028] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4.5 h-4.5 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  {editingJob ? 'Edit Repair Ticket' : 'Create New Repair Ticket'}
                </h3>
              </div>
              <button onClick={() => setIsJobModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-[#1a1c24]/30 border border-[#1e2028] p-3.5 rounded-lg">
                <span className="text-[10px] font-mono text-amber-500 font-black uppercase tracking-wider block mb-2">
                  Client Contact Coordinates
                </span>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono text-slate-400 uppercase">Customer Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Connor"
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-xs px-3 py-2 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono text-slate-400 uppercase">Phone</label>
                      <input
                        type="text"
                        placeholder="e.g. 555-0199"
                        value={cPhone}
                        onChange={(e) => setCPhone(e.target.value)}
                        className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-xs px-3 py-2 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono text-slate-400 uppercase">Email</label>
                      <input
                        type="email"
                        placeholder="e.g. s@cyberdyne.net"
                        value={cEmail}
                        onChange={(e) => setCEmail(e.target.value)}
                        className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-xs px-3 py-2 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1c24]/30 border border-[#1e2028] p-3.5 rounded-lg">
                <span className="text-[10px] font-mono text-amber-500 font-black uppercase tracking-wider block mb-2">
                  Vehicle Specifications
                </span>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono text-slate-400 uppercase">Year</label>
                      <input
                        type="text"
                        placeholder="e.g. 2011"
                        value={vYear}
                        onChange={(e) => setVYear(e.target.value)}
                        className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-xs px-3 py-2 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono text-slate-400 uppercase">Make</label>
                      <input
                        type="text"
                        placeholder="e.g. Chevrolet"
                        value={vMake}
                        onChange={(e) => setVMake(e.target.value)}
                        className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-xs px-3 py-2 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono text-slate-400 uppercase">Model</label>
                      <input
                        type="text"
                        placeholder="e.g. Corvette"
                        value={vModel}
                        onChange={(e) => setVModel(e.target.value)}
                        className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-xs px-3 py-2 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono text-slate-400 uppercase">VIN</label>
                      <input
                        type="text"
                        placeholder="17-character VIN"
                        value={vVin}
                        onChange={(e) => setVVin(e.target.value)}
                        className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-xs px-3 py-2 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono text-slate-400 uppercase">Odometer In (mi)</label>
                      <input
                        type="number"
                        placeholder="e.g. 112000"
                        value={vMileageIn}
                        onChange={(e) => setVMileageIn(e.target.value)}
                        className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-xs px-3 py-2 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Main Diagnosis / Concern</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engine ticking noise on cold start, fluid leak check"
                  value={jDesc}
                  onChange={(e) => setJDesc(e.target.value)}
                  className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Job Status</label>
                  <select
                    value={jStatus}
                    onChange={(e) => setJStatus(e.target.value as Job['status'])}
                    className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Est. Completion</label>
                  <input
                    type="date"
                    value={jEstCompletion}
                    onChange={(e) => setJEstCompletion(e.target.value)}
                    className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Labor Notes / Technicians Instructions</label>
                <textarea
                  placeholder="Insert notes for mechanic... e.g. check spark plug gap, perform cylinder balance test"
                  value={jNotes}
                  onChange={(e) => setJNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25 resize-none"
                />
              </div>

              <div className="pt-2 border-t border-[#1e2028] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2 text-xs font-black uppercase tracking-wider transition-all"
                >
                  {editingJob ? 'Update Ticket' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
