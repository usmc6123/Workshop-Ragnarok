import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { InventoryItem } from '../types';
import { 
  Search, Plus, Edit2, Trash2, Sliders, AlertTriangle, 
  TrendingUp, Layers, DollarSign, MapPin, Package, RotateCcw,
  CheckCircle, ArrowDown, ArrowUp, RefreshCw, X, AlertCircle
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'brakes', label: 'Brakes' },
  { id: 'filters', label: 'Filters' },
  { id: 'fluids', label: 'Fluids' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'engine', label: 'Engine' },
  { id: 'other', label: 'Other' }
];

export default function InventoryView() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  
  // Selected Item for Actions
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);

  // Form States
  const [partNumber, setPartNumber] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryItem['category']>('other');
  const [quantityOnHand, setQuantityOnHand] = useState(0);
  const [reorderThreshold, setReorderThreshold] = useState(0);
  const [unitType, setUnitType] = useState('each');
  const [costPrice, setCostPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [supplierName, setSupplierName] = useState('');
  const [location, setLocation] = useState('');
  const [coreCharge, setCoreCharge] = useState(0);
  const [notes, setNotes] = useState('');

  // Adjustment form states
  const [adjustDelta, setAdjustDelta] = useState(1);
  const [adjustReason, setAdjustReason] = useState('manual correction');

  useEffect(() => {
    fetchInventory();
  }, [search, selectedCategory]);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const catFilter = selectedCategory === 'all' ? undefined : selectedCategory;
      const data = await api.getInventory(search || undefined, catFilter);
      setItems(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch workshop inventory items.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setPartNumber('');
    setName('');
    setCategory('other');
    setQuantityOnHand(0);
    setReorderThreshold(0);
    setUnitType('each');
    setCostPrice(0);
    setSellPrice(0);
    setSupplierName('');
    setLocation('');
    setCoreCharge(0);
    setNotes('');
    setIsAddOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setActiveItem(item);
    setPartNumber(item.part_number);
    setName(item.name);
    setCategory(item.category);
    setQuantityOnHand(item.quantity_on_hand);
    setReorderThreshold(item.reorder_threshold);
    setUnitType(item.unit_type || 'each');
    setCostPrice(item.cost_price);
    setSellPrice(item.sell_price);
    setSupplierName(item.supplier_name || '');
    setLocation(item.location || '');
    setCoreCharge(item.core_charge || 0);
    setNotes(item.notes || '');
    setIsEditOpen(true);
  };

  const openAdjustModal = (item: InventoryItem) => {
    setActiveItem(item);
    setAdjustDelta(0);
    setAdjustReason('received shipment');
    setIsAdjustOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await api.createInventoryItem({
        part_number: partNumber,
        name,
        category,
        quantity_on_hand: Number(quantityOnHand),
        reorder_threshold: Number(reorderThreshold),
        unit_type: unitType,
        cost_price: Number(costPrice),
        sell_price: Number(sellPrice),
        supplier_name: supplierName,
        location,
        core_charge: Number(coreCharge),
        notes
      });
      setIsAddOpen(false);
      fetchInventory();
    } catch (err) {
      console.error(err);
      setError('Failed to create new inventory item.');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem || !name) return;
    try {
      await api.updateInventoryItem(activeItem.id, {
        part_number: partNumber,
        name,
        category,
        quantity_on_hand: Number(quantityOnHand),
        reorder_threshold: Number(reorderThreshold),
        unit_type: unitType,
        cost_price: Number(costPrice),
        sell_price: Number(sellPrice),
        supplier_name: supplierName,
        location,
        core_charge: Number(coreCharge),
        notes
      });
      setIsEditOpen(false);
      fetchInventory();
    } catch (err) {
      console.error(err);
      setError('Failed to update inventory item.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you absolutely sure you want to delete this inventory item? This action is permanent.')) return;
    try {
      await api.deleteInventoryItem(id);
      fetchInventory();
    } catch (err) {
      console.error(err);
      setError('Failed to delete inventory item.');
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem || adjustDelta === 0 || !adjustReason) return;
    try {
      await api.adjustInventoryItem(activeItem.id, adjustDelta, adjustReason);
      setIsAdjustOpen(false);
      fetchInventory();
    } catch (err) {
      console.error(err);
      setError('Failed to adjust item quantity.');
    }
  };

  // Stats Calculations
  const totalItems = items.length;
  const lowStockItems = items.filter(item => item.quantity_on_hand <= item.reorder_threshold).length;
  const totalValuation = items.reduce((sum, item) => sum + (item.quantity_on_hand * item.cost_price), 0);
  const potentialRevenue = items.reduce((sum, item) => sum + (item.quantity_on_hand * item.sell_price), 0);
  const potentialProfit = potentialRevenue - totalValuation;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" id="inventory-view-root">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-theme/40 pb-5">
        <div className="text-left">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
            Inventory & Spare Parts
          </h1>
          <p className="text-xs text-slate-400 font-mono tracking-wide mt-1">
            Real-time workshop supply, reorder management, and job-order stock tracking
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs rounded-lg transition active:scale-95 shadow-md"
          id="btn-add-inventory"
        >
          <Plus className="w-4 h-4 shrink-0" />
          Add Part to Stock
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-800/40 text-red-400 rounded-lg text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Overview Metrics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="inventory-metrics-grid">
        <div className="p-5 bg-surface-theme/50 border border-border-theme/40 rounded-xl flex items-center justify-between shadow-sm">
          <div className="text-left space-y-1">
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">
              Total Parts Listed
            </span>
            <span className="text-2xl font-black text-white block">
              {totalItems}
            </span>
            <span className="text-[9px] text-slate-400 font-mono block">Unique supply profiles</span>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/10">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-5 border rounded-xl flex items-center justify-between shadow-sm transition ${
          lowStockItems > 0 
            ? 'bg-amber-950/20 border-amber-800/30 text-amber-400' 
            : 'bg-surface-theme/50 border-border-theme/40 text-slate-400'
        }`}>
          <div className="text-left space-y-1">
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">
              Low Stock Alerts
            </span>
            <span className={`text-2xl font-black block ${lowStockItems > 0 ? 'text-amber-500 animate-pulse' : 'text-white'}`}>
              {lowStockItems}
            </span>
            <span className="text-[9px] font-mono block">Below reorder limits</span>
          </div>
          <div className={`p-3 rounded-lg border ${
            lowStockItems > 0 
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
              : 'bg-slate-500/10 border-slate-500/10 text-slate-400'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-surface-theme/50 border border-border-theme/40 rounded-xl flex items-center justify-between shadow-sm">
          <div className="text-left space-y-1">
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">
              Total Asset Value
            </span>
            <span className="text-2xl font-black text-emerald-400 block">
              ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-slate-400 font-mono block">At cost price valuation</span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/10">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-surface-theme/50 border border-border-theme/40 rounded-xl flex items-center justify-between shadow-sm">
          <div className="text-left space-y-1">
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">
              Potential Margin Profit
            </span>
            <span className="text-2xl font-black text-amber-500 block">
              ${potentialProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-slate-400 font-mono block">Estimated inventory margin</span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/10">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 bg-surface-theme/35 p-4 rounded-xl border border-border-theme/30" id="inventory-filters-bar">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search parts by name, number, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-theme/60 border border-border-theme/40 text-white rounded-lg font-mono text-xs focus:outline-none focus:border-amber-500 transition"
            id="input-inventory-search"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase font-black tracking-wider transition ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-bg-theme/40 text-slate-400 hover:bg-bg-theme hover:text-white border border-border-theme/20'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Table view of Inventory items */}
      <div className="bg-surface-theme/40 border border-border-theme/40 rounded-xl overflow-hidden shadow-sm" id="inventory-items-panel">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Loading workshop supply roster...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3">
            <div className="p-4 bg-border-theme/25 rounded-full text-slate-500">
              <Package className="w-10 h-10" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">No Parts Found</h3>
            <p className="text-xs text-slate-400 font-mono">
              There are no supplies matches for your current selection or search term. Try adjusting your query or create a new part profile.
            </p>
            <button
              onClick={openAddModal}
              className="mt-2 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono rounded-lg transition"
            >
              Register First Supply Profile
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="inventory-table">
              <thead>
                <tr className="bg-bg-theme/50 border-b border-border-theme/40 text-[9px] font-mono uppercase font-black text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Part Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Stock Level</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Sell Price</th>
                  <th className="py-3 px-4 text-center">Margin</th>
                  <th className="py-3 px-4">Shelf / Location</th>
                  <th className="py-3 px-4 text-right">Core Charge</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme/25 text-xs">
                {items.map((item) => {
                  const isLow = item.quantity_on_hand < item.reorder_threshold;
                  const profit = item.sell_price - item.cost_price;
                  const marginPct = item.sell_price > 0 ? (profit / item.sell_price) * 100 : 0;
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-bg-theme/20 transition ${isLow ? 'bg-amber-500/[0.02]' : ''}`}
                    >
                      {/* Name & Part Number */}
                      <td className="py-4 px-4 text-left">
                        <div className="font-bold text-slate-100">{item.name}</div>
                        <div className="text-[10px] font-mono text-amber-500 mt-1 font-bold">
                          {item.part_number || 'NO PART #'}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 uppercase text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                          {item.category}
                        </span>
                      </td>

                      {/* Stock Level */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-black ${
                            isLow 
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse' 
                              : item.quantity_on_hand === 0
                              ? 'bg-slate-800 text-slate-500'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                          }`}>
                            {item.quantity_on_hand} {item.unit_type}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono mt-1">
                            Min: {item.reorder_threshold}
                          </span>
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="py-4 px-4 text-right font-mono text-slate-300">
                        ${item.cost_price.toFixed(2)}
                      </td>

                      {/* Sell */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-white">
                        ${item.sell_price.toFixed(2)}
                      </td>

                      {/* Margin */}
                      <td className="py-4 px-4 text-center">
                        <span className={`text-[10px] font-mono font-bold ${marginPct >= 40 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {marginPct.toFixed(0)}%
                        </span>
                      </td>

                      {/* Shelf / Location */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                          <span className="truncate font-mono text-[11px] max-w-[120px]">
                            {item.location || 'Unassigned'}
                          </span>
                        </div>
                        {item.supplier_name && (
                          <div className="text-[9px] font-mono text-slate-500 mt-0.5 truncate max-w-[120px]">
                            {item.supplier_name}
                          </div>
                        )}
                      </td>

                      {/* Core Charge */}
                      <td className="py-4 px-4 text-right font-mono text-amber-500/80">
                        {item.core_charge && item.core_charge > 0 
                          ? `$${item.core_charge.toFixed(2)}` 
                          : '—'
                        }
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openAdjustModal(item)}
                            title="Adjust quantity"
                            className="p-1.5 rounded hover:bg-slate-800 text-amber-500 border border-transparent hover:border-amber-500/20 transition cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit supply profile"
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent hover:border-border-theme transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            title="Delete supply profile"
                            className="p-1.5 rounded hover:bg-red-950/20 text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/20 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* 5. Create Part Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="bg-[#12131a] border border-border-theme/80 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in text-left">
            <div className="px-6 py-4 bg-bg-theme/50 border-b border-border-theme/40 flex items-center justify-between">
              <h2 className="text-sm font-black font-mono tracking-wider uppercase text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                Register New Supply Profile
              </h2>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Part Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Semi-Metallic Brake Pads"
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Part / SKU Number</label>
                  <input
                    type="text"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    placeholder="e.g. SP-101"
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#161720] border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="brakes">Brakes</option>
                    <option value="filters">Filters</option>
                    <option value="fluids">Fluids</option>
                    <option value="electrical">Electrical</option>
                    <option value="engine">Engine</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Quantity on Hand</label>
                  <input
                    type="number"
                    min="0"
                    value={quantityOnHand}
                    onChange={(e) => setQuantityOnHand(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Reorder Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderThreshold}
                    onChange={(e) => setReorderThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Unit Type (e.g. quart, each)</label>
                  <input
                    type="text"
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    placeholder="each"
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Shelf A-2"
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Cost Price ($ shop pays)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Sell Price ($ client charges)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. NAPA Auto Parts"
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Core Charge Deposit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={coreCharge}
                    onChange={(e) => setCoreCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Notes / Supply Memo</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any specific instructions, applications, or compatible vehicle specifications..."
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border-theme/40 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded border border-border-theme/60 hover:bg-bg-theme text-slate-400 hover:text-white transition text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs transition"
                >
                  Save Supply Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit Part Modal */}
      {isEditOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="bg-[#12131a] border border-border-theme/80 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in text-left">
            <div className="px-6 py-4 bg-bg-theme/50 border-b border-border-theme/40 flex items-center justify-between">
              <h2 className="text-sm font-black font-mono tracking-wider uppercase text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-500" />
                Edit Supply Profile: {activeItem.name}
              </h2>
              <button 
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Part Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Part / SKU Number</label>
                  <input
                    type="text"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#161720] border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="brakes">Brakes</option>
                    <option value="filters">Filters</option>
                    <option value="fluids">Fluids</option>
                    <option value="electrical">Electrical</option>
                    <option value="engine">Engine</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Quantity on Hand</label>
                  <input
                    type="number"
                    min="0"
                    value={quantityOnHand}
                    onChange={(e) => setQuantityOnHand(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Reorder Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderThreshold}
                    onChange={(e) => setReorderThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Unit Type</label>
                  <input
                    type="text"
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Sell Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Core Charge Deposit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={coreCharge}
                    onChange={(e) => setCoreCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Notes / Supply Memo</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-bg-theme/60 border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border-theme/40 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded border border-border-theme/60 hover:bg-bg-theme text-slate-400 hover:text-white transition text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Manual Stock Adjustment Modal */}
      {isAdjustOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="bg-[#12131a] border border-border-theme/80 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in text-left">
            <div className="px-6 py-4 bg-bg-theme/50 border-b border-border-theme/40 flex items-center justify-between">
              <h2 className="text-sm font-black font-mono tracking-wider uppercase text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                Adjust Stock Quantity
              </h2>
              <button 
                onClick={() => setIsAdjustOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAdjust} className="p-6 space-y-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-400 font-mono">Item Profile:</div>
                <div className="font-bold text-white text-sm">{activeItem.name}</div>
                <div className="text-[10px] font-mono text-slate-500">Current Qty: {activeItem.quantity_on_hand} {activeItem.unit_type}</div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Adjustment Delta (+ or -)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustDelta(prev => prev - 1)}
                    className="w-10 h-10 flex items-center justify-center rounded border border-border-theme/40 bg-bg-theme hover:bg-slate-800 font-black text-white"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    required
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 h-10 text-center bg-bg-theme/60 border border-border-theme/40 text-white rounded font-mono text-sm focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustDelta(prev => prev + 1)}
                    className="w-10 h-10 flex items-center justify-center rounded border border-border-theme/40 bg-bg-theme hover:bg-slate-800 font-black text-white"
                  >
                    +
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 font-mono mt-1">
                  Use negative values (e.g. -5) to write off damaged, used, or missing stock.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Reason for Adjustment</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-[#161720] border border-border-theme/40 text-white px-3 py-2.5 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="received shipment">Received Supply Shipment (+)</option>
                  <option value="manual correction">Audit Correction (+/-)</option>
                  <option value="damaged">Damaged / Expired (-)</option>
                  <option value="missing">Unaccounted / Missing (-)</option>
                  <option value="used on customer job">Direct Job Override (-)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-900/40 rounded border border-border-theme/20 text-[11px] font-mono text-slate-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  This will set the stock to <span className="font-bold text-white">{activeItem.quantity_on_hand + adjustDelta}</span> {activeItem.unit_type}. A permanent history log of this delta change will be locked.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border-theme/40 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="px-4 py-2 rounded border border-border-theme/60 hover:bg-bg-theme text-slate-400 hover:text-white transition text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustDelta === 0}
                  className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-slate-950 font-mono font-bold text-xs transition"
                >
                  Apply Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
