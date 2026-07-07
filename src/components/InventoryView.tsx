import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { InventoryItem } from '../types';
import { 
  Search, Plus, Edit2, Trash2, Sliders, AlertTriangle, 
  TrendingUp, Layers, DollarSign, MapPin, Package, RotateCcw,
  CheckCircle, ArrowDown, ArrowUp, RefreshCw, X, AlertCircle,
  Upload, Camera
} from 'lucide-react';

interface ReviewItem {
  id: string;
  name: string;
  part_number: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sell_price: number;
  category: string;
  action: 'create' | 'update';
  selectedItemId: number | null;
}

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
  const [defaultMarkupPercent, setDefaultMarkupPercent] = useState<number>(0);

  useEffect(() => {
    const loadMarkup = async () => {
      try {
        const data = await api.getShopSettings();
        if (data && typeof data.default_parts_markup === 'number') {
          setDefaultMarkupPercent(data.default_parts_markup);
        }
      } catch (err) {
        console.error('Failed to load shop settings for markup percent:', err);
      }
    };
    loadMarkup();
  }, []);
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

  // Invoice Upload & Review States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [invoiceSupplier, setInvoiceSupplier] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const findMatchingItem = (itemName: string, itemPart: string | null) => {
    if (!itemName) return null;
    const cleanName = itemName.toLowerCase().trim();
    const cleanPart = itemPart?.toLowerCase().trim();
    
    if (cleanPart) {
      const match = items.find(i => i.part_number && i.part_number.toLowerCase().trim() === cleanPart);
      if (match) return match;
    }
    
    const exactMatch = items.find(i => i.name.toLowerCase().trim() === cleanName);
    if (exactMatch) return exactMatch;
    
    const partialMatch = items.find(i => i.name.toLowerCase().includes(cleanName) || cleanName.includes(i.name.toLowerCase()));
    if (partialMatch) return partialMatch;
    
    return null;
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPreview(reader.result as string);
    };
    reader.onerror = () => {
      setUploadError("Failed to read the selected file.");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setUploadError("Please drop an image file (PNG/JPG/WEBP).");
      return;
    }
    
    setUploadError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleParseInvoice = async () => {
    if (!uploadPreview) {
      setUploadError("Please select or capture an invoice image first.");
      return;
    }
    setIsParsing(true);
    setUploadError(null);
    try {
      const parsed = await api.parseInvoice(uploadPreview);
      setInvoiceSupplier(parsed.supplier_name || '');
      setInvoiceDate(parsed.date || new Date().toISOString().split('T')[0]);
      
      const mappedReviewItems: ReviewItem[] = parsed.line_items.map((pi, idx) => {
        const matched = findMatchingItem(pi.name, pi.part_number);
        const defaultSell = pi.unit_price ? Math.round(pi.unit_price * (1 + defaultMarkupPercent / 100) * 100) / 100 : 0;
        return {
          id: `review-${idx}-${Date.now()}`,
          name: pi.name || '',
          part_number: pi.part_number || '',
          quantity: typeof pi.quantity === 'number' ? pi.quantity : 1,
          unit_price: typeof pi.unit_price === 'number' ? pi.unit_price : 0,
          total_price: typeof pi.total_price === 'number' ? pi.total_price : 0,
          sell_price: defaultSell,
          category: matched ? matched.category : 'other',
          action: matched ? 'update' : 'create',
          selectedItemId: matched ? matched.id : null
        };
      });
      
      setReviewItems(mappedReviewItems);
      setIsUploadOpen(false);
      setIsReviewOpen(true);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Failed to parse the invoice. Please ensure it is a clear receipt/invoice photo.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportInvoice = async () => {
    setIsImporting(true);
    try {
      for (const rItem of reviewItems) {
        if (rItem.action === 'create') {
          const newItem = await api.createInventoryItem({
            name: rItem.name,
            part_number: rItem.part_number,
            category: rItem.category as any,
            quantity_on_hand: 0,
            cost_price: rItem.unit_price,
            sell_price: rItem.sell_price,
            supplier_name: invoiceSupplier,
            notes: `Imported via invoice parse on ${invoiceDate || new Date().toLocaleDateString()}`
          });
          await api.adjustInventoryItem(newItem.id, rItem.quantity, 'Invoice import');
        } else {
          if (rItem.selectedItemId) {
            const existing = items.find(i => i.id === rItem.selectedItemId);
            if (existing) {
              await api.updateInventoryItem(existing.id, {
                ...existing,
                name: rItem.name || existing.name,
                part_number: rItem.part_number || existing.part_number,
                cost_price: rItem.unit_price,
                sell_price: rItem.sell_price,
                supplier_name: invoiceSupplier || existing.supplier_name,
                category: rItem.category as any || existing.category
              });
            }
            await api.adjustInventoryItem(rItem.selectedItemId, rItem.quantity, 'Invoice import');
          }
        }
      }
      setIsReviewOpen(false);
      setUploadPreview(null);
      setReviewItems([]);
      fetchInventory();
      alert(`Invoice imported successfully! Added/adjusted ${reviewItems.length} items.`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred during invoice importing.");
    } finally {
      setIsImporting(false);
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setUploadPreview(null);
              setUploadError(null);
              setIsUploadOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-500 font-mono font-bold text-xs rounded-lg border border-amber-500/20 transition active:scale-95 shadow-md cursor-pointer"
            id="btn-upload-invoice"
          >
            <Upload className="w-4 h-4 shrink-0 text-amber-500" />
            Upload Invoice
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs rounded-lg transition active:scale-95 shadow-md cursor-pointer"
            id="btn-add-inventory"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Add Part to Stock
          </button>
        </div>
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
                    onChange={(e) => {
                      const cost = Math.max(0, parseFloat(e.target.value) || 0);
                      setCostPrice(cost);
                      const calculatedSell = Math.round(cost * (1 + defaultMarkupPercent / 100) * 100) / 100;
                      setSellPrice(calculatedSell);
                    }}
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
                    onChange={(e) => {
                      const cost = Math.max(0, parseFloat(e.target.value) || 0);
                      setCostPrice(cost);
                      const calculatedSell = Math.round(cost * (1 + defaultMarkupPercent / 100) * 100) / 100;
                      setSellPrice(calculatedSell);
                    }}
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

      {/* Upload Invoice Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="bg-[#12131a] border border-border-theme/80 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in text-left">
            <div className="px-6 py-4 bg-bg-theme/50 border-b border-border-theme/40 flex items-center justify-between">
              <h2 className="text-sm font-black font-mono tracking-wider uppercase text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" />
                Upload Invoice / Receipt
              </h2>
              <button 
                onClick={() => setIsUploadOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3.5 bg-red-950/20 border border-red-800/40 text-red-400 rounded-lg text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Drag and Drop Zone */}
              {!uploadPreview ? (
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-border-theme/40 hover:border-amber-500/40 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 transition bg-bg-theme/20 hover:bg-bg-theme/30 cursor-pointer relative"
                >
                  <div className="p-4 bg-amber-500/10 rounded-full text-amber-500 border border-amber-500/10">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-white font-bold">Drag & drop your invoice photo here</p>
                    <p className="text-[10px] font-mono text-slate-500">Supports PNG, JPG, JPEG, WEBP</p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <label className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-[10px] rounded cursor-pointer transition active:scale-95 shadow-md">
                      Browse Files
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                    <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-500 border border-amber-500/20 font-mono font-bold text-[10px] rounded cursor-pointer transition active:scale-95 flex items-center gap-1">
                      <Camera className="w-3 h-3 shrink-0" />
                      Take Photo
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative border border-border-theme/40 rounded-xl overflow-hidden bg-black/40 h-64 flex items-center justify-center">
                    <img 
                      src={uploadPreview} 
                      alt="Invoice Preview" 
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      onClick={() => setUploadPreview(null)}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Image ready for parsing</span>
                    <button 
                      onClick={() => setUploadPreview(null)}
                      className="text-amber-500 hover:underline"
                    >
                      Choose another file
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-border-theme/40 pt-4">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded border border-border-theme/60 hover:bg-bg-theme text-slate-400 hover:text-white transition text-xs font-mono"
                  disabled={isParsing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleParseInvoice}
                  disabled={!uploadPreview || isParsing}
                  className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-slate-950 font-mono font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isParsing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Parsing with Gemini...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Parse Invoice
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staging / Review Grid Modal */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none overflow-y-auto">
          <div className="bg-[#12131a] border border-border-theme/80 rounded-xl w-full max-w-6xl shadow-2xl overflow-hidden animate-fade-in text-left my-8">
            <div className="px-6 py-4 bg-bg-theme/50 border-b border-border-theme/40 flex items-center justify-between">
              <h2 className="text-sm font-black font-mono tracking-wider uppercase text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Review Parsed Invoice Items
              </h2>
              <button 
                onClick={() => {
                  if (window.confirm("Are you sure you want to cancel? All parsed line items will be lost.")) {
                    setIsReviewOpen(false);
                  }
                }}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Receipt Metadata Editor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-bg-theme/30 p-4 rounded-xl border border-border-theme/20">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={invoiceSupplier}
                    onChange={(e) => setInvoiceSupplier(e.target.value)}
                    placeholder="Supplier name"
                    className="w-full bg-[#12131a] border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-[#12131a] border border-border-theme/40 text-white px-3 py-2 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Items Staging Table */}
              <div className="border border-border-theme/20 rounded-xl overflow-hidden bg-[#12131a]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-theme/50 border-b border-border-theme/30 text-[9px] font-mono uppercase font-black text-slate-400 tracking-wider">
                        <th className="py-3 px-4 w-1/3">Part Name & Part Number</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 w-20">Quantity</th>
                        <th className="py-3 px-4 w-24">Unit Cost ($)</th>
                        <th className="py-3 px-4 w-24">Sell Price ($)</th>
                        <th className="py-3 px-4">Total Cost</th>
                        <th className="py-3 px-4 w-1/4">Import Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-theme/20 text-xs font-mono">
                      {reviewItems.map((item, index) => {
                        const totalCost = (item.quantity * item.unit_price) || 0;
                        return (
                          <tr key={item.id} className="hover:bg-bg-theme/10 transition">
                            {/* Name & Part Number */}
                            <td className="py-3 px-4 space-y-1.5">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const updated = [...reviewItems];
                                  updated[index].name = e.target.value;
                                  setReviewItems(updated);
                                }}
                                className="w-full bg-bg-theme/40 border border-border-theme/20 text-white px-2 py-1 rounded text-xs focus:outline-none focus:border-amber-500"
                              />
                              <input
                                type="text"
                                value={item.part_number}
                                placeholder="Part Number"
                                onChange={(e) => {
                                  const updated = [...reviewItems];
                                  updated[index].part_number = e.target.value;
                                  setReviewItems(updated);
                                }}
                                className="w-full bg-bg-theme/40 border border-border-theme/20 text-amber-500 font-bold px-2 py-0.5 rounded text-[10px] focus:outline-none focus:border-amber-500"
                              />
                            </td>

                            {/* Category Select */}
                            <td className="py-3 px-4">
                              <select
                                value={item.category}
                                onChange={(e) => {
                                  const updated = [...reviewItems];
                                  updated[index].category = e.target.value;
                                  setReviewItems(updated);
                                }}
                                className="bg-[#12131a] border border-border-theme/25 text-white px-1.5 py-1 rounded text-xs focus:outline-none focus:border-amber-500"
                              >
                                <option value="brakes">Brakes</option>
                                <option value="filters">Filters</option>
                                <option value="fluids">Fluids</option>
                                <option value="electrical">Electrical</option>
                                <option value="engine">Engine</option>
                                <option value="other">Other</option>
                              </select>
                            </td>

                            {/* Quantity */}
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...reviewItems];
                                  updated[index].quantity = Math.max(1, parseInt(e.target.value) || 1);
                                  updated[index].total_price = updated[index].quantity * updated[index].unit_price;
                                  setReviewItems(updated);
                                }}
                              className="w-16 bg-bg-theme/40 border border-border-theme/20 text-white px-2 py-1 rounded text-center text-xs focus:outline-none focus:border-amber-500"
                              />
                            </td>

                            {/* Unit Cost */}
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) => {
                                  const updated = [...reviewItems];
                                  const uPrice = Math.max(0, parseFloat(e.target.value) || 0);
                                  updated[index].unit_price = uPrice;
                                  updated[index].total_price = updated[index].quantity * uPrice;
                                  // Auto sell price recommendation using the default markup percent
                                  updated[index].sell_price = Math.round(uPrice * (1 + defaultMarkupPercent / 100) * 100) / 100;
                                  setReviewItems(updated);
                                }}
                                className="w-20 bg-bg-theme/40 border border-border-theme/20 text-white px-2 py-1 rounded text-right text-xs focus:outline-none focus:border-amber-500"
                              />
                            </td>

                            {/* Sell Price */}
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.sell_price}
                                onChange={(e) => {
                                  const updated = [...reviewItems];
                                  updated[index].sell_price = Math.max(0, parseFloat(e.target.value) || 0);
                                  setReviewItems(updated);
                                }}
                                className="w-20 bg-bg-theme/40 border border-border-theme/20 text-emerald-400 font-bold px-2 py-1 rounded text-right text-xs focus:outline-none focus:border-amber-500"
                              />
                            </td>

                            {/* Total Cost Display */}
                            <td className="py-3 px-4 text-slate-300">
                              ${totalCost.toFixed(2)}
                            </td>

                            {/* Import Action / Map Selector */}
                            <td className="py-3 px-4 space-y-2">
                              <select
                                value={item.action}
                                onChange={(e) => {
                                  const val = e.target.value as 'create' | 'update';
                                  const updated = [...reviewItems];
                                  updated[index].action = val;
                                  if (val === 'create') {
                                    updated[index].selectedItemId = null;
                                  } else {
                                    const matched = findMatchingItem(item.name, item.part_number);
                                    updated[index].selectedItemId = matched ? matched.id : (items[0]?.id || null);
                                    if (matched) {
                                      updated[index].category = matched.category;
                                    }
                                  }
                                  setReviewItems(updated);
                                }}
                                className="w-full bg-[#12131a] border border-border-theme/30 text-white px-2 py-1.5 rounded text-xs focus:outline-none focus:border-amber-500 font-sans font-bold"
                              >
                                <option value="create">🆕 Create as new part</option>
                                <option value="update">📥 Add to existing stock</option>
                              </select>

                              {item.action === 'update' && (
                                <div className="space-y-1">
                                  <label className="text-[9px] uppercase text-slate-500 font-sans tracking-wider block text-left">Select Matching Inventory Item:</label>
                                  <select
                                    value={item.selectedItemId || ''}
                                    onChange={(e) => {
                                      const updated = [...reviewItems];
                                      const itemId = parseInt(e.target.value, 10);
                                      updated[index].selectedItemId = itemId;
                                      const mapped = items.find(i => i.id === itemId);
                                      if (mapped) {
                                        updated[index].category = mapped.category;
                                      }
                                      setReviewItems(updated);
                                    }}
                                    className="w-full bg-[#161722] border border-amber-500/30 text-amber-400 px-2 py-1 rounded text-[10px] focus:outline-none focus:border-amber-500"
                                  >
                                    <option value="" disabled>-- Choose Existing Part --</option>
                                    {items.map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} {p.part_number ? `(${p.part_number})` : ''} - Stock: {p.quantity_on_hand}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-border-theme/40 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to go back? All staging review changes will be lost.")) {
                      setIsReviewOpen(false);
                      setIsUploadOpen(true);
                    }
                  }}
                  className="px-4 py-2 rounded border border-border-theme/60 hover:bg-bg-theme text-slate-400 hover:text-white transition text-xs font-mono"
                  disabled={isImporting}
                >
                  ← Back to Upload
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to cancel? All parsed line items will be lost.")) {
                        setIsReviewOpen(false);
                      }
                    }}
                    className="px-4 py-2 rounded border border-transparent hover:bg-bg-theme text-slate-400 hover:text-white transition text-xs font-mono cursor-pointer"
                    disabled={isImporting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportInvoice}
                    disabled={isImporting}
                    className="px-5 py-2.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-slate-950 font-mono font-black text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Importing Parts...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Import {reviewItems.length} Selected to Inventory
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
