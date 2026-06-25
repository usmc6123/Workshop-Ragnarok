/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { GarageVehicle, ServiceHistory } from '../types';
import { api } from '../lib/api';
import { 
  Car, Plus, Trash2, Edit2, BookOpen, Calendar, Milestone, 
  User, DollarSign, PenSquare, ChevronRight, ArrowLeft, Wrench, Package,
  Save, X, Info, Settings, ClipboardList
} from 'lucide-react';

interface GarageViewProps {
  onNavigateToBrowse: (make: string, year: string, model: string) => void;
  refreshTrigger: number;
}

export default function GarageView({ onNavigateToBrowse, refreshTrigger }: GarageViewProps) {
  const [vehicles, setVehicles] = useState<GarageVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<GarageVehicle | null>(null);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<GarageVehicle | null>(null);
  const [editingService, setEditingService] = useState<ServiceHistory | null>(null);

  // Form states - Vehicle
  const [vYear, setVYear] = useState('');
  const [vMake, setVMake] = useState('');
  const [vModel, setVModel] = useState('');
  const [vEngine, setVEngine] = useState('');
  const [vVin, setVVin] = useState('');
  const [vColor, setVColor] = useState('');
  const [vPurchaseDate, setVPurchaseDate] = useState('');
  const [vPurchaseMileage, setVPurchaseMileage] = useState('');
  const [vCurrentMileage, setVCurrentMileage] = useState('');
  const [vNotes, setVNotes] = useState('');

  // Form states - Service History
  const [sDate, setSDate] = useState('');
  const [sMileage, setSMileage] = useState('');
  const [sDescription, setSDescription] = useState('');
  const [sPartsUsed, setSPartsUsed] = useState('');
  const [sCost, setSCost] = useState('');
  const [sTechnician, setSTechnician] = useState('');
  const [sNotes, setSNotes] = useState('');

  // Inline edit state for notes and mileage on profile page
  const [profileMileage, setProfileMileage] = useState('');
  const [profileNotes, setProfileNotes] = useState('');
  const [isSavingProfileEdits, setIsSavingProfileEdits] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, [refreshTrigger]);

  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getGarageVehicles();
      setVehicles(data);
      // Sync selected vehicle if currently viewed
      if (selectedVehicle) {
        const updated = data.find(v => v.id === selectedVehicle.id);
        if (updated) {
          setSelectedVehicle(updated);
          setProfileMileage(updated.current_mileage.toString());
          setProfileNotes(updated.notes);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load garage vehicles.');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceHistory = async (vehicleId: number) => {
    setHistoryLoading(true);
    try {
      const data = await api.getServiceHistory(vehicleId);
      setServiceHistory(data);
    } catch (err) {
      console.error('Failed to load service history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectVehicle = (vehicle: GarageVehicle) => {
    setSelectedVehicle(vehicle);
    setProfileMileage(vehicle.current_mileage.toString());
    setProfileNotes(vehicle.notes);
    fetchServiceHistory(vehicle.id);
  };

  // Profile Save inline edits
  const handleSaveProfileEdits = async () => {
    if (!selectedVehicle) return;
    setIsSavingProfileEdits(true);
    try {
      const updated: GarageVehicle = {
        ...selectedVehicle,
        current_mileage: parseInt(profileMileage, 10) || selectedVehicle.current_mileage,
        notes: profileNotes
      };
      await api.updateGarageVehicle(selectedVehicle.id, updated);
      await fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Failed to update vehicle details.');
    } finally {
      setIsSavingProfileEdits(false);
    }
  };

  // Add / Edit Vehicle handlers
  const openVehicleModal = (veh: GarageVehicle | null = null) => {
    if (veh) {
      setEditingVehicle(veh);
      setVYear(veh.year);
      setVMake(veh.make);
      setVModel(veh.model);
      setVEngine(veh.engine);
      setVVin(veh.vin);
      setVColor(veh.color);
      setVPurchaseDate(veh.purchase_date);
      setVPurchaseMileage(veh.purchase_mileage.toString());
      setVCurrentMileage(veh.current_mileage.toString());
      setVNotes(veh.notes);
    } else {
      setEditingVehicle(null);
      setVYear('');
      setVMake('');
      setVModel('');
      setVEngine('');
      setVVin('');
      setVColor('');
      setVPurchaseDate(new Date().toISOString().split('T')[0]);
      setVPurchaseMileage('');
      setVCurrentMileage('');
      setVNotes('');
    }
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      year: vYear,
      make: vMake,
      model: vModel,
      engine: vEngine,
      vin: vVin,
      color: vColor,
      purchase_date: vPurchaseDate,
      purchase_mileage: parseInt(vPurchaseMileage, 10) || 0,
      current_mileage: parseInt(vCurrentMileage, 10) || 0,
      notes: vNotes
    };

    try {
      if (editingVehicle) {
        await api.updateGarageVehicle(editingVehicle.id, { ...editingVehicle, ...payload });
      } else {
        await api.addGarageVehicle(payload);
      }
      setIsVehicleModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Failed to save vehicle details.');
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this vehicle and all of its service history logs?')) {
      return;
    }
    try {
      await api.deleteGarageVehicle(id);
      setSelectedVehicle(null);
      fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Failed to delete vehicle.');
    }
  };

  // Add / Edit Service History Handlers
  const openServiceModal = (srv: ServiceHistory | null = null) => {
    if (srv) {
      setEditingService(srv);
      setSDate(srv.date);
      setSMileage(srv.mileage.toString());
      setSDescription(srv.description);
      setSPartsUsed(srv.parts_used);
      setSCost(srv.cost.toString());
      setSTechnician(srv.technician);
      setSNotes(srv.notes);
    } else {
      setEditingService(null);
      setSDate(new Date().toISOString().split('T')[0]);
      setSMileage(selectedVehicle?.current_mileage.toString() || '');
      setSDescription('');
      setSPartsUsed('');
      setSCost('');
      setSTechnician('');
      setSNotes('');
    }
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    const payload = {
      vehicle_id: selectedVehicle.id,
      date: sDate,
      mileage: parseInt(sMileage, 10) || 0,
      description: sDescription,
      parts_used: sPartsUsed,
      cost: parseFloat(sCost) || 0,
      technician: sTechnician,
      notes: sNotes
    };

    try {
      if (editingService) {
        await api.updateServiceEntry(editingService.id, { ...editingService, ...payload });
      } else {
        await api.addServiceEntry(payload);
      }
      setIsServiceModalOpen(false);
      fetchServiceHistory(selectedVehicle.id);
      fetchVehicles(); // refresh vehicle list for mileage sync
    } catch (err: any) {
      alert(err.message || 'Failed to save service history entry.');
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!window.confirm('Delete this service entry?')) return;
    try {
      await api.deleteServiceEntry(id);
      if (selectedVehicle) {
        fetchServiceHistory(selectedVehicle.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete service entry.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="garage-view-container">
      {/* 1. Header Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e2028] pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Car className="w-5 h-5 text-amber-500" />
            Personal Garage
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Log, track, and maintain your private stable of vehicles. Keep complete service logs and match service manuals.
          </p>
        </div>

        <button
          onClick={() => openVehicleModal()}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg px-4 py-2 text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow self-start md:self-center cursor-pointer"
          id="btn-add-garage-vehicle"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vehicle</span>
        </button>
      </div>

      {loading && vehicles.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Wrench className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-slate-400 text-sm">Synchronizing private garage...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[#1e2028] bg-[#13141a]/10 rounded-xl max-w-xl mx-auto space-y-4">
          <Car className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-300 uppercase">Your Garage is Empty</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Add your first personal vehicle to track service entries and match technical data.
            </p>
          </div>
          <button
            onClick={() => openVehicleModal()}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg px-4 py-2 text-xs uppercase tracking-wider transition shadow cursor-pointer"
          >
            Add My First Vehicle
          </button>
        </div>
      ) : !selectedVehicle ? (
        // List Mode
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="garage-vehicles-grid">
          {vehicles.map((v) => (
            <div
              key={v.id}
              onClick={() => handleSelectVehicle(v)}
              className="bg-gradient-to-b from-[#13141a] to-[#0f1015] border border-[#1e2028] hover:border-slate-700 hover:border-l-amber-500 border-l-[3px] border-l-[#1e2028] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer group shadow-lg"
              id={`garage-vehicle-card-${v.id}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold bg-[#1a1c24] text-slate-400 border border-[#1e2028] px-2.5 py-0.5 rounded">
                    {v.year}
                  </span>
                  <span className="text-[10px] font-mono text-amber-500/80 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                    {v.color || 'Unspecified Color'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-amber-500 transition-colors leading-snug">
                    {v.make} {v.model}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-1 truncate">{v.engine}</p>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 block">VIN</span>
                    <span className="text-slate-300 truncate block font-bold">{v.vin || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 block">Mileage</span>
                    <span className="text-slate-300 block font-bold">{v.current_mileage?.toLocaleString()} mi</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-[#1e2028]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/90 group-hover:text-amber-400 transition-colors flex items-center gap-1 font-sans">
                  <ClipboardList className="w-3.5 h-3.5" />
                  View Stable & Log
                </span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openVehicleModal(v)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1a1c24] rounded transition cursor-pointer"
                    title="Edit vehicle details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteVehicle(v.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-[#1a1c24] rounded transition cursor-pointer"
                    title="Delete vehicle record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Profile Detail Mode
        <div className="space-y-6 animate-fade-in" id="garage-vehicle-profile-root">
          {/* Top Return navigation */}
          <button
            onClick={() => setSelectedVehicle(null)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Stable Grid</span>
          </button>

          {/* Profile Overview Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Box: Vehicle Details Dashboard */}
            <div className="lg:col-span-8 bg-[#13141a] border border-[#1e2028] rounded-xl p-6 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#1e2028] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                      {selectedVehicle.year}
                    </span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded">
                      {selectedVehicle.color || 'Color unspecified'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">
                    {selectedVehicle.make} {selectedVehicle.model}
                  </h2>
                  <p className="text-xs font-mono text-slate-400">{selectedVehicle.engine}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onNavigateToBrowse(selectedVehicle.make, selectedVehicle.year, selectedVehicle.model)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Find Manual
                  </button>
                  <button
                    onClick={() => openVehicleModal(selectedVehicle)}
                    className="border border-slate-700 hover:border-amber-500 text-slate-300 px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Details
                  </button>
                </div>
              </div>

              {/* Specifications List */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="bg-[#0a0a0f] border border-[#1e2028] p-3 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">VIN Identification</span>
                  <span className="text-xs text-slate-200 font-bold block mt-1 truncate">{selectedVehicle.vin || 'N/A'}</span>
                </div>
                <div className="bg-[#0a0a0f] border border-[#1e2028] p-3 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Purchase Date</span>
                  <span className="text-xs text-slate-200 font-bold block mt-1">{selectedVehicle.purchase_date || 'N/A'}</span>
                </div>
                <div className="bg-[#0a0a0f] border border-[#1e2028] p-3 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Purchase Mileage</span>
                  <span className="text-xs text-slate-200 font-bold block mt-1">
                    {selectedVehicle.purchase_mileage ? `${selectedVehicle.purchase_mileage.toLocaleString()} mi` : 'N/A'}
                  </span>
                </div>
                <div className="bg-[#0a0a0f] border border-[#1e2028] p-3 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Stable Mileage</span>
                  <span className="text-xs text-amber-400 font-bold block mt-1">
                    {selectedVehicle.current_mileage ? `${selectedVehicle.current_mileage.toLocaleString()} mi` : '0 mi'}
                  </span>
                </div>
              </div>

              {/* Inline Editor for Notes & Mileage */}
              <div className="space-y-4 pt-2 border-t border-[#1e2028]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans">Quick Diagnostic Profile Sync</h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-4 space-y-1">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase">Current Mileage (mi)</label>
                    <input
                      type="number"
                      value={profileMileage}
                      onChange={(e) => setProfileMileage(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-[#1e2028] rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-6 space-y-1">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase">Vehicle Notes / Diagnostic State</label>
                    <input
                      type="text"
                      placeholder="Add comments on recent performance, pending updates..."
                      value={profileNotes}
                      onChange={(e) => setProfileNotes(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-[#1e2028] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button
                      onClick={handleSaveProfileEdits}
                      disabled={isSavingProfileEdits}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg py-2.5 text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      {isSavingProfileEdits ? 'Saving...' : 'Sync'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Box: Status Sidebar / Photo Placeholder */}
            <div className="lg:col-span-4 bg-[#13141a] border border-[#1e2028] rounded-xl p-6 text-center space-y-4 shadow-xl">
              <div className="bg-[#0a0a0f] border border-[#1e2028] h-40 rounded-lg flex flex-col items-center justify-center text-slate-650 text-slate-500 select-none">
                <Car className="w-12 h-12 text-slate-750 mb-2" />
                <span className="text-[10px] font-mono tracking-wider uppercase">Stable Photo Placeholder</span>
              </div>
              <div className="text-left text-xs text-slate-400 space-y-2 leading-relaxed bg-[#0a0a0f]/50 p-4 border border-[#1e2028] rounded-lg">
                <div className="flex items-center gap-1.5 text-amber-500 font-bold uppercase tracking-wider text-[10px] font-mono">
                  <Info className="w-4 h-4" />
                  <span>Workshop Diagnostics</span>
                </div>
                <p>
                  Keep this vehicle record updated to synchronize maintenance periods, estimated mileage increases, and parts lists. Use the left button to find technical procedures.
                </p>
              </div>
            </div>
          </div>

          {/* Service Log History Row */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2028] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-500" />
                Maintenance & Service Log History ({serviceHistory.length})
              </h3>
              <button
                onClick={() => openServiceModal()}
                className="bg-[#1a1c24] hover:bg-[#20232d] border border-[#1e2028] hover:border-amber-500/50 text-slate-300 hover:text-white font-bold rounded-lg px-3.5 py-1.5 text-xs uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-500" />
                <span>Log Service Entry</span>
              </button>
            </div>

            {historyLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Wrench className="w-4 h-4 animate-spin text-amber-500" />
                <span>Reading maintenance history logs...</span>
              </div>
            ) : serviceHistory.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-[#1e2028] rounded-xl text-slate-500 text-xs font-sans">
                No service entries logged for this vehicle yet. Click the log button above to add first.
              </div>
            ) : (
              <div className="space-y-4" id="service-history-list">
                {serviceHistory.map((sh) => (
                  <div
                    key={sh.id}
                    className="bg-gradient-to-b from-[#13141a] to-[#0f1015] border border-[#1e2028] rounded-xl p-5 space-y-4 shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e2028] pb-2.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-300 font-mono">
                        <span className="flex items-center gap-1 font-bold text-amber-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {sh.date}
                        </span>
                        <span className="text-slate-500">|</span>
                        <span className="flex items-center gap-1 font-bold">
                          <Milestone className="w-3.5 h-3.5 text-slate-500" />
                          {sh.mileage?.toLocaleString()} mi
                        </span>
                        <span className="text-slate-500">|</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          Tech: {sh.technician || 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-green-400 bg-green-500/5 border border-green-500/10 px-2.5 py-0.5 rounded">
                          ${sh.cost?.toFixed(2) || '0.00'}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openServiceModal(sh)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#1a1c24] transition cursor-pointer"
                            title="Edit log details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(sh.id)}
                            className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-[#1a1c24] transition cursor-pointer"
                            title="Delete log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Work Description</span>
                        <p className="text-sm font-bold text-slate-200 mt-0.5">{sh.description}</p>
                      </div>

                      {sh.parts_used && (
                        <div className="bg-[#0a0a0f] border border-[#1e2028] p-3 rounded-lg flex items-start gap-2">
                          <Package className="w-4 h-4 text-amber-500/80 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <span className="font-mono text-slate-500 uppercase block">Parts Installed</span>
                            <p className="text-slate-300 mt-0.5 font-sans">{sh.parts_used}</p>
                          </div>
                        </div>
                      )}

                      {sh.notes && (
                        <div>
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">Technician Comments / Inspection Findings</span>
                          <p className="text-xs text-slate-400 italic mt-0.5 leading-relaxed bg-[#0a0a0f]/30 p-2.5 rounded border border-[#1e2028] font-sans">
                            "{sh.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Vehicle Dialog Modal */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="w-full max-w-lg rounded-xl border border-[#1e2028] bg-[#13141a] text-slate-100 overflow-hidden shadow-2xl">
            <div className="bg-[#1a1c24] border-b border-[#1e2028] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4.5 h-4.5 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  {editingVehicle ? 'Edit Vehicle Profile' : 'Add Vehicle to Stable'}
                </h3>
              </div>
              <button onClick={() => setIsVehicleModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Year</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2012"
                    value={vYear}
                    onChange={(e) => setVYear(e.target.value)}
                    className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Color</label>
                  <input
                    type="text"
                    placeholder="e.g. Ingot Silver"
                    value={vColor}
                    onChange={(e) => setVColor(e.target.value)}
                    className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Manufacturer Make</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ford"
                    value={vMake}
                    onChange={(e) => setVMake(e.target.value)}
                    className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Model Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mustang"
                    value={vModel}
                    onChange={(e) => setVModel(e.target.value)}
                    className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Engine configuration</label>
                <input
                  type="text"
                  placeholder="e.g. 5.0L Coyote V8"
                  value={vEngine}
                  onChange={(e) => setVEngine(e.target.value)}
                  className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">VIN (Chassis Number)</label>
                <input
                  type="text"
                  placeholder="17-digit VIN identifier..."
                  value={vVin}
                  onChange={(e) => setVVin(e.target.value)}
                  className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Purchase Date</label>
                  <input
                    type="date"
                    value={vPurchaseDate}
                    onChange={(e) => setVPurchaseDate(e.target.value)}
                    className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Purchase Mileage (mi)</label>
                  <input
                    type="number"
                    placeholder="e.g. 40000"
                    value={vPurchaseMileage}
                    onChange={(e) => setVPurchaseMileage(e.target.value)}
                    className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Current Stable Mileage (mi)</label>
                <input
                  type="number"
                  placeholder="e.g. 43500"
                  value={vCurrentMileage}
                  onChange={(e) => setVCurrentMileage(e.target.value)}
                  className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Diagnostic Notes / stable comments</label>
                <textarea
                  placeholder="Add details about modifications, chronic failures, oil grades used..."
                  value={vNotes}
                  onChange={(e) => setVNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25 resize-none"
                />
              </div>

              <div className="pt-2 border-t border-[#1e2028] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2 text-xs font-black uppercase tracking-wider transition-all"
                >
                  {editingVehicle ? 'Update Profile' : 'Add to stable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Service Entry Dialog Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="w-full max-w-lg rounded-xl border border-[#1e2028] bg-[#13141a] text-slate-100 overflow-hidden shadow-2xl">
            <div className="bg-[#1a1c24] border-b border-[#1e2028] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4.5 h-4.5 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  {editingService ? 'Edit Service History Log' : 'Log Maintenance Event'}
                </h3>
              </div>
              <button onClick={() => setIsServiceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Service Date</label>
                  <input
                    type="date"
                    required
                    value={sDate}
                    onChange={(e) => setSDate(e.target.value)}
                    className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Odometer Mileage (mi)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 98500"
                    value={sMileage}
                    onChange={(e) => setSMileage(e.target.value)}
                    className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Service Work Completed</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engine Oil Flush & Oil Filter, Rear Diff Oil Swap"
                  value={sDescription}
                  onChange={(e) => setSDescription(e.target.value)}
                  className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Parts Installed / Fluid Types</label>
                <input
                  type="text"
                  placeholder="e.g. Motorcraft oil filter FL-500S, 6qt Pennzoil Ultra Platinum 5W-20"
                  value={sPartsUsed}
                  onChange={(e) => setSPartsUsed(e.target.value)}
                  className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Total Parts & Labor Cost ($)</label>
                  <input
                    type="text"
                    placeholder="e.g. 75.50"
                    value={sCost}
                    onChange={(e) => setSCost(e.target.value)}
                    className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Servicing Technician</label>
                  <input
                    type="text"
                    placeholder="e.g. David Miller"
                    value={sTechnician}
                    onChange={(e) => setSTechnician(e.target.value)}
                    className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Detailed Findings / Inspection Notes</label>
                <textarea
                  placeholder="Add details on wear check, bolt torques, diagnostic codes found, tire tread depth..."
                  value={sNotes}
                  onChange={(e) => setSNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/25 resize-none"
                />
              </div>

              <div className="pt-2 border-t border-[#1e2028] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2 text-xs font-black uppercase tracking-wider transition-all"
                >
                  {editingService ? 'Update Log' : 'Save Log Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
