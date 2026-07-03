import React, { useState, useEffect } from 'react';
import { Customer, CustomerVehicle, ServiceHistory, Vehicle, VehicleManual } from '../types';
import { api } from '../lib/api';
import { 
  Car, Plus, Search, Edit2, Trash2, ArrowLeft, BookOpen, Calendar, 
  Milestone, User, Phone, Mail, Package, Wrench, X, Info, ClipboardList
} from 'lucide-react';

interface VehiclesViewProps {
  onNavigateToManualWithSearch: (make: string, year: string, model: string) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  refreshTrigger: number;
}

export default function VehiclesView({ onNavigateToManualWithSearch, onSelectVehicle, refreshTrigger }: VehiclesViewProps) {
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<CustomerVehicle | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Saved Manuals State
  const [savedManuals, setSavedManuals] = useState<VehicleManual[]>([]);
  const [manualsLoading, setManualsLoading] = useState(false);

  // Modals state
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<CustomerVehicle | null>(null);
  const [editingService, setEditingService] = useState<ServiceHistory | null>(null);

  // Form states - Vehicle
  const [vCustomerId, setVCustomerId] = useState('');
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

  // Inline profile editing
  const [profileMileage, setProfileMileage] = useState('');
  const [profileNotes, setProfileNotes] = useState('');
  const [findPartName, setFindPartName] = useState('');
  const [isSavingProfileEdits, setIsSavingProfileEdits] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchCustomers();
  }, [refreshTrigger]);

  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVehiclesAll();
      setVehicles(data);
      // Sync selected profile if open
      if (selectedVehicle) {
        const updated = data.find(v => v.id === selectedVehicle.id);
        if (updated) {
          setSelectedVehicle(updated);
          setProfileMileage(updated.current_mileage.toString());
          setProfileNotes(updated.notes);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vehicles inventory.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers dropdown:', err);
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

  const fetchSavedManuals = async (garageVehicleId: number) => {
    setManualsLoading(true);
    try {
      const data = await api.getVehicleManuals(garageVehicleId);
      setSavedManuals(data);
    } catch (err) {
      console.error('Failed to load saved manuals:', err);
    } finally {
      setManualsLoading(false);
    }
  };

  const handleDeleteSavedManual = async (manualId: number) => {
    if (!window.confirm('Are you sure you want to remove this saved manual from this vehicle?')) return;
    try {
      await api.deleteVehicleManual(manualId);
      if (selectedVehicle) {
        fetchSavedManuals(selectedVehicle.id);
      }
    } catch (err: any) {
      alert('Failed to delete saved manual: ' + err.message);
    }
  };

  const handleOpenSavedManual = (manual: VehicleManual) => {
    if (onSelectVehicle) {
      const vehicleToOpen: Vehicle = {
        id: -1,
        source: 'lemon',
        make: manual.manualMake,
        year: manual.manualYear,
        model: manual.manualModel,
        engine: manual.manualEngine,
        uriPath: manual.manualUri,
        isComplete: 1
      };
      onSelectVehicle(vehicleToOpen);
    } else {
      onNavigateToManualWithSearch(manual.manualMake, manual.manualYear, manual.manualModel);
    }
  };

  const handleSelectVehicle = (vehicle: CustomerVehicle) => {
    setSelectedVehicle(vehicle);
    setProfileMileage(vehicle.current_mileage.toString());
    setProfileNotes(vehicle.notes || '');
    setFindPartName('');
    fetchServiceHistory(vehicle.id);
    fetchSavedManuals(vehicle.id);
  };

  // Opens a Google Shopping search pre-filled with this vehicle + part name
  // — a legitimate, free way to get a real local price comparison sourced
  // from retailers' own opted-in product feeds, rather than scraping each
  // store directly. Remembers the shop's zip code in localStorage after the
  // first search (shared with the same feature on the Jobs ticket view).
  const handleFindNearbyParts = () => {
    if (!selectedVehicle) return;
    if (!findPartName.trim()) {
      alert('Enter a part name first, then click Find Nearby Price.');
      return;
    }

    let zip = localStorage.getItem('workshop_shop_zip') || '';
    if (!zip) {
      const entered = window.prompt('Enter your zip code for local price search (saved for next time):');
      if (!entered || !entered.trim()) return;
      zip = entered.trim();
      localStorage.setItem('workshop_shop_zip', zip);
    }

    const vehicleParts = [
      selectedVehicle.year,
      selectedVehicle.make,
      selectedVehicle.model,
      selectedVehicle.engine,
    ].filter(Boolean).join(' ');

    const query = `${vehicleParts} ${findPartName}`.replace(/\s+/g, ' ').trim();
    const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}&near=${encodeURIComponent(zip)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveProfileEdits = async () => {
    if (!selectedVehicle) return;
    setIsSavingProfileEdits(true);
    try {
      const updated: CustomerVehicle = {
        ...selectedVehicle,
        current_mileage: parseInt(profileMileage, 10) || selectedVehicle.current_mileage,
        notes: profileNotes
      };
      await api.updateVehicle(selectedVehicle.id, updated);
      await fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Failed to update vehicle notes.');
    } finally {
      setIsSavingProfileEdits(false);
    }
  };

  const openVehicleModal = (veh: CustomerVehicle | null = null) => {
    if (veh) {
      setEditingVehicle(veh);
      setVCustomerId(veh.customer_id.toString());
      setVYear(veh.year);
      setVMake(veh.make);
      setVModel(veh.model);
      setVEngine(veh.engine || '');
      setVVin(veh.vin || '');
      setVColor(veh.color || '');
      setVPurchaseDate(veh.purchase_date || '');
      setVPurchaseMileage(veh.purchase_mileage?.toString() || '');
      setVCurrentMileage(veh.current_mileage?.toString() || '');
      setVNotes(veh.notes || '');
    } else {
      setEditingVehicle(null);
      setVCustomerId(customers.length > 0 ? customers[0].id.toString() : '');
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
    if (!vCustomerId) {
      alert('Please select a Customer for this vehicle.');
      return;
    }

    const payload = {
      customer_id: parseInt(vCustomerId, 10),
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
        await api.updateVehicle(editingVehicle.id, { ...editingVehicle, ...payload });
      } else {
        await api.addVehicle(payload);
      }
      setIsVehicleModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Failed to save vehicle details.');
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this?')) {
      return;
    }
    try {
      await api.deleteVehicle(id);
      setVehicles(prev => prev.filter(v => v.id !== id));
      setSelectedVehicle(null);
      fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Failed to delete vehicle.');
    }
  };

  const openServiceModal = (srv: ServiceHistory | null = null) => {
    if (srv) {
      setEditingService(srv);
      setSDate(srv.date);
      setSMileage(srv.mileage.toString());
      setSDescription(srv.description);
      setSPartsUsed(srv.parts_used || '');
      setSCost(srv.cost.toString());
      setSTechnician(srv.technician || '');
      setSNotes(srv.notes || '');
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
      fetchVehicles(); // refresh list for mileage synch
    } catch (err: any) {
      alert(err.message || 'Failed to save service log.');
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!window.confirm('Delete this service history log?')) return;
    try {
      await api.deleteServiceEntry(id);
      if (selectedVehicle) {
        fetchServiceHistory(selectedVehicle.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete service entry.');
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.year.includes(searchTerm) ||
    (v.customer_name && v.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="vehicles-view-container">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-theme pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Car className="w-5 h-5 text-primary-theme" />
            Vehicles Inventory
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track customer vehicles, maintain service logs, and quickly map manuals.
          </p>
        </div>

        <button
          onClick={() => openVehicleModal()}
          className="bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-bold rounded-lg px-4 py-2 text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow self-start md:self-center cursor-pointer"
          id="btn-add-vehicle"
        >
          <Plus className="w-4 h-4" />
          <span>Register Vehicle</span>
        </button>
      </div>

      {loading && vehicles.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Wrench className="w-8 h-8 text-primary-theme animate-spin" />
          <p className="text-slate-400 text-sm">Synchronizing vehicles inventory...</p>
        </div>
      ) : !selectedVehicle ? (
        // TABLE/LIST OF ALL VEHICLES
        <div className="space-y-4">
          <div className="relative max-w-md select-none">
            <input
              type="text"
              placeholder="Search by make, model, year, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg bg-surface-theme border border-border-theme focus:border-primary-theme pl-10 pr-4 py-2 text-xs text-text-theme placeholder-slate-500 focus:outline-none transition"
              id="vehicle-search-input"
            />
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
          </div>

          {filteredVehicles.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border-theme rounded-xl bg-surface-theme/10 max-w-xl mx-auto">
              <Car className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm font-bold uppercase mt-2">No Vehicles Registered</p>
              <p className="text-slate-500 text-xs mt-1">Add a customer vehicle above to log service items.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="vehicles-grid">
              {filteredVehicles.map((v) => (
                <div
                  key={v.id}
                  onClick={() => handleSelectVehicle(v)}
                  className="bg-gradient-to-b from-[#13141a]/80 to-bg-theme/80 backdrop-blur-sm border border-[#1e2028] hover:border-slate-700 hover:border-l-primary-theme border-l-[3px] border-l-[#1e2028] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer group shadow-lg"
                  id={`vehicle-card-${v.id}`}
                >
                  <div className="space-y-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold bg-surface-theme text-slate-400 border border-border-theme px-2.5 py-0.5 rounded">
                        {v.year}
                      </span>
                      <span className="text-[10px] font-mono text-primary-theme bg-primary-theme/5 px-2 py-0.5 rounded border border-primary-theme/10 truncate max-w-[120px]">
                        {v.color || 'Unspecified Color'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-100 group-hover:text-primary-theme transition-colors leading-snug">
                        {v.make} {v.model}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-1 truncate">{v.engine}</p>
                    </div>

                    <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 border-t border-border-theme/40">
                      <div>
                        <span className="text-[9px] uppercase text-slate-500 block">Owner</span>
                        <span className="text-slate-350 truncate block font-bold">{v.customer_name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-500 block">Mileage</span>
                        <span className="text-slate-350 block font-bold">{v.current_mileage?.toLocaleString()} mi</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-border-theme">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary-theme group-hover:text-primary-theme/80 transition-colors flex items-center gap-1 font-sans">
                      <ClipboardList className="w-3.5 h-3.5" />
                      Service Log History
                    </span>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openVehicleModal(v)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-theme rounded transition cursor-pointer"
                        title="Edit vehicle details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(v.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-surface-theme rounded transition cursor-pointer"
                        title="Delete vehicle record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // INDIVIDUAL VEHICLE PROFILE MODE
        <div className="space-y-6 animate-fade-in text-left" id="vehicle-profile-page">
          <button
            onClick={() => setSelectedVehicle(null)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition animate-fade-in"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Inventory List</span>
          </button>

          {/* Profile overview box split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Box: Specifications details */}
            <div className="lg:col-span-8 bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-6 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border-theme pb-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-primary-theme bg-primary-theme/10 px-2.5 py-0.5 rounded border border-primary-theme/20">
                      {selectedVehicle.year}
                    </span>
                    <span className="text-xs font-mono text-slate-400 bg-bg-theme border border-border-theme px-2.5 py-0.5 rounded">
                      {selectedVehicle.color || 'Color unspecified'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight font-sans">
                    {selectedVehicle.make} {selectedVehicle.model}
                  </h2>
                  <p className="text-xs font-mono text-slate-400">{selectedVehicle.engine}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onNavigateToManualWithSearch(selectedVehicle.make, selectedVehicle.year, selectedVehicle.model)}
                    className="bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Find Manual
                  </button>
                  <button
                    onClick={() => openVehicleModal(selectedVehicle)}
                    className="border border-border-theme hover:border-primary-theme text-slate-350 px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Details
                  </button>
                </div>
              </div>

              {/* Specifications block */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 select-none">
                <div className="bg-bg-theme border border-border-theme p-3 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">VIN Identification</span>
                  <span className="text-xs text-slate-200 font-bold block mt-1 truncate">{selectedVehicle.vin || 'N/A'}</span>
                </div>
                <div className="bg-bg-theme border border-border-theme p-3 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Purchase Date</span>
                  <span className="text-xs text-slate-200 font-bold block mt-1">{selectedVehicle.purchase_date || 'N/A'}</span>
                </div>
                <div className="bg-bg-theme border border-border-theme p-3 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Purchase Mileage</span>
                  <span className="text-xs text-slate-200 font-bold block mt-1">
                    {selectedVehicle.purchase_mileage ? `${selectedVehicle.purchase_mileage.toLocaleString()} mi` : 'N/A'}
                  </span>
                </div>
                <div className="bg-bg-theme border border-border-theme p-3 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Current Odometer</span>
                  <span className="text-xs text-primary-theme font-bold block mt-1 font-mono">
                    {selectedVehicle.current_mileage ? `${selectedVehicle.current_mileage.toLocaleString()} mi` : '0 mi'}
                  </span>
                </div>
              </div>

              {/* Quick sync editor */}
              <div className="space-y-4 pt-2 border-t border-border-theme">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans">Quick Diagnostic Profile Sync</h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-4 space-y-1">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase">Odometer Reading (mi)</label>
                    <input
                      type="number"
                      value={profileMileage}
                      onChange={(e) => setProfileMileage(e.target.value)}
                      className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:border-primary-theme focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-6 space-y-1">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase">Profile Notes / Diagnostic State</label>
                    <input
                      type="text"
                      placeholder="Add brief memo updates..."
                      value={profileNotes}
                      onChange={(e) => setProfileNotes(e.target.value)}
                      className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-primary-theme focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button
                      onClick={handleSaveProfileEdits}
                      disabled={isSavingProfileEdits}
                      className="w-full bg-primary-theme hover:bg-primary-theme/95 text-slate-950 font-bold rounded-lg py-2.5 text-xs uppercase tracking-wider transition cursor-pointer"
                    >
                      {isSavingProfileEdits ? 'Saving...' : 'Sync'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Box: Linked Customer Contact Card & Saved Manuals */}
            <div className="lg:col-span-4 space-y-6">
              {/* Find Nearby Parts Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-primary-theme/10 via-[#13141a]/90 to-[#13141a]/90 backdrop-blur-sm border border-primary-theme/30 rounded-xl p-5 space-y-4 shadow-xl shadow-primary-theme/5">
                <div className="absolute -top-8 -right-8 w-28 h-28 bg-primary-theme/10 rounded-full blur-2xl pointer-events-none" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary-theme border-b border-primary-theme/20 pb-2 flex items-center gap-1.5 relative">
                  <Search className="w-4 h-4" />
                  Find Nearby Parts
                </h3>
                <p className="text-[10px] text-slate-400 leading-relaxed relative">
                  Search local retailers for a price on this exact vehicle — {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}.
                </p>
                <div className="space-y-2 relative">
                  <input
                    type="text"
                    placeholder="e.g. Front Brake Pads"
                    value={findPartName}
                    onChange={(e) => setFindPartName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleFindNearbyParts(); }}
                    className="w-full bg-bg-theme border border-primary-theme/30 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-primary-theme focus:outline-none"
                  />
                  <button
                    onClick={handleFindNearbyParts}
                    className="w-full flex items-center justify-center gap-1.5 bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-bold rounded-lg py-2.5 text-xs uppercase tracking-wider transition shadow-lg shadow-primary-theme/20 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Find Nearby Price
                  </button>
                </div>
              </div>

              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350 border-b border-border-theme pb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary-theme" />
                  Linked Customer Account
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Client Name</span>
                      <span className="text-xs text-slate-200 font-bold block">
                        {selectedVehicle.customer_name || 'Unassigned Customer'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 border-t border-border-theme/40 pt-2.5">
                    <Phone className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Telephone Number</span>
                      <a href={`tel:${selectedVehicle.customer_phone}`} className="text-xs text-slate-200 hover:text-primary-theme font-mono block underline">
                        {selectedVehicle.customer_phone || 'N/A'}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 border-t border-border-theme/40 pt-2.5">
                    <Mail className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Email Address</span>
                      <a href={`mailto:${selectedVehicle.customer_email}`} className="text-xs text-slate-200 hover:text-primary-theme font-mono block underline truncate max-w-[180px]">
                        {selectedVehicle.customer_email || 'N/A'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saved Manuals Section */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl" id="saved-manuals-card">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350 border-b border-border-theme pb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-primary-theme" />
                  Saved Procedures & Manuals ({savedManuals.length})
                </h3>

                {manualsLoading ? (
                  <div className="py-4 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                    <Wrench className="w-4 h-4 animate-spin text-primary-theme" />
                    <span>Loading saved manuals...</span>
                  </div>
                ) : savedManuals.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">
                    No manuals saved yet. Browse the Manual Library and save manuals to this vehicle.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {savedManuals.map((manual) => (
                      <div key={manual.id} className="bg-bg-theme border border-border-theme rounded-lg p-3 space-y-2 text-left relative group">
                        <div className="pr-6">
                          <h4 className="text-xs font-bold text-slate-200 leading-snug line-clamp-2">
                            {manual.manualTitle}
                          </h4>
                          <span className="text-[9px] font-mono text-slate-500 uppercase block mt-1">
                            {manual.manualYear} {manual.manualMake} {manual.manualModel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            onClick={() => handleOpenSavedManual(manual)}
                            className="bg-primary-theme/10 hover:bg-primary-theme hover:text-slate-950 border border-primary-theme/20 text-primary-theme text-[10px] font-mono uppercase tracking-wider font-extrabold px-2.5 py-1 rounded transition duration-155 cursor-pointer"
                          >
                            Open Manual
                          </button>
                          <button
                            onClick={() => handleDeleteSavedManual(manual.id)}
                            className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-surface-theme transition cursor-pointer"
                            title="Remove manual link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Maintenance list row */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-theme pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-primary-theme" />
                Maintenance & Service Log History ({serviceHistory.length})
              </h3>
              <button
                onClick={() => openServiceModal()}
                className="bg-bg-theme hover:bg-bg-theme/80 border border-border-theme text-slate-300 font-bold rounded-lg px-3.5 py-1.5 text-xs uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-primary-theme" />
                <span>Log Service Entry</span>
              </button>
            </div>

            {historyLoading ? (
              <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <Wrench className="w-4 h-4 animate-spin text-primary-theme" />
                <span>Reading maintenance history files...</span>
              </div>
            ) : serviceHistory.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-border-theme rounded-xl text-slate-500 text-xs font-sans">
                No service history entries logged for this vehicle yet. Click the log button above to add first.
              </div>
            ) : (
              <div className="space-y-4" id="service-history-list">
                {serviceHistory.map((sh) => (
                  <div
                    key={sh.id}
                    className="bg-gradient-to-b from-[#13141a]/80 to-bg-theme/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-theme pb-2.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-300 font-mono">
                        <span className="flex items-center gap-1 font-bold text-primary-theme">
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
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-bg-theme transition cursor-pointer"
                            title="Edit log details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(sh.id)}
                            className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-bg-theme transition cursor-pointer"
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
                        <div className="bg-bg-theme border border-border-theme p-3 rounded-lg flex items-start gap-2">
                          <Package className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <span className="font-mono text-slate-500 uppercase block">Parts Installed</span>
                            <p className="text-slate-300 mt-0.5 font-sans">{sh.parts_used}</p>
                          </div>
                        </div>
                      )}

                      {sh.notes && (
                        <div>
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">Technician Comments / Inspection Findings</span>
                          <p className="text-xs text-slate-400 italic mt-0.5 leading-relaxed bg-bg-theme/30 p-2.5 rounded border border-border-theme font-sans">
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

      {/* Vehicle Register Dialog Modal */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="w-full max-w-lg rounded-xl border border-border-theme bg-surface-theme text-slate-100 overflow-hidden shadow-2xl">
            <div className="bg-bg-theme border-b border-border-theme px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4.5 h-4.5 text-primary-theme" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  {editingVehicle ? 'Edit Vehicle Profile' : 'Register Customer Vehicle'}
                </h3>
              </div>
              <button onClick={() => setIsVehicleModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Associated Customer *</label>
                <select
                  required
                  value={vCustomerId}
                  onChange={(e) => setVCustomerId(e.target.value)}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-205 text-text-theme text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>Select registered owner...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id.toString()}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Year</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2012"
                    value={vYear}
                    onChange={(e) => setVYear(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Color</label>
                  <input
                    type="text"
                    placeholder="e.g. Shadow Black"
                    value={vColor}
                    onChange={(e) => setVColor(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Make</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ford"
                    value={vMake}
                    onChange={(e) => setVMake(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Model</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. F-150"
                    value={vModel}
                    onChange={(e) => setVModel(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Engine specs</label>
                <input
                  type="text"
                  placeholder="e.g. 3.5L V6 EcoBoost"
                  value={vEngine}
                  onChange={(e) => setVEngine(e.target.value)}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">VIN Number</label>
                <input
                  type="text"
                  placeholder="Chassis VIN string..."
                  value={vVin}
                  onChange={(e) => setVVin(e.target.value)}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-205 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Purchase Date</label>
                  <input
                    type="date"
                    value={vPurchaseDate}
                    onChange={(e) => setVPurchaseDate(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Purchase Mileage (mi)</label>
                  <input
                    type="number"
                    placeholder="Odometer at purchase"
                    value={vPurchaseMileage}
                    onChange={(e) => setVPurchaseMileage(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Current Odometer (mi)</label>
                <input
                  type="number"
                  placeholder="Odometer currently"
                  value={vCurrentMileage}
                  onChange={(e) => setVCurrentMileage(e.target.value)}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">General comments / Diagnostic history</label>
                <textarea
                  placeholder="Insert memos about modifications, chronic failures, oils gapped..."
                  value={vNotes}
                  onChange={(e) => setVNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-202 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 border-t border-border-theme flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-theme hover:bg-primary-theme/90 text-slate-950 px-5 py-2 text-xs font-black uppercase tracking-wider transition-all"
                >
                  {editingVehicle ? 'Update Profile' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Entry Log Dialog Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="w-full max-w-lg rounded-xl border border-border-theme bg-surface-theme text-slate-100 overflow-hidden shadow-2xl">
            <div className="bg-bg-theme border-b border-border-theme px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4.5 h-4.5 text-primary-theme" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  {editingService ? 'Edit Service History Log' : 'Log Maintenance Event'}
                </h3>
              </div>
              <button onClick={() => setIsServiceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Service Date</label>
                  <input
                    type="date"
                    required
                    value={sDate}
                    onChange={(e) => setSDate(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
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
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Service Work Completed</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engine Oil Flush & Oil Filter, Rear Diff Oil Swap"
                  value={sDescription}
                  onChange={(e) => setSDescription(e.target.value)}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Parts Installed / Fluid Types</label>
                <input
                  type="text"
                  placeholder="e.g. Motorcraft oil filter, 6qt 5W-20 Mobil 1 Synthetic"
                  value={sPartsUsed}
                  onChange={(e) => setSPartsUsed(e.target.value)}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Total Parts & Labor Cost ($)</label>
                  <input
                    type="text"
                    placeholder="e.g. 150.00"
                    value={sCost}
                    onChange={(e) => setSCost(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Servicing Technician</label>
                  <input
                    type="text"
                    placeholder="e.g. David Miller"
                    value={sTechnician}
                    onChange={(e) => setSTechnician(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Detailed Findings / Inspection Notes</label>
                <textarea
                  placeholder="Add details on wear check, tires depths, torques checked, diagnostic DTC findings..."
                  value={sNotes}
                  onChange={(e) => setSNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 border-t border-border-theme flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-theme hover:bg-primary-theme/90 text-slate-950 px-5 py-2 text-xs font-black uppercase tracking-wider transition-all"
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
