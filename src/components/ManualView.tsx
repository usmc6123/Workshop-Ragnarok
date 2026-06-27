/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Vehicle, GarageItem, CategoryPage, ContentPage, PageResponse, Block } from '../types';
import { api, getApiBase } from '../lib/api';
import TreeView from './TreeView';
import { 
  ArrowLeft, Star, StarOff, Menu, X, ChevronRight, FolderPlus, 
  HelpCircle, Eye, AlertCircle, CheckCircle, RefreshCw, Compass, 
  CheckSquare, Square, Info, ShieldAlert, Wrench, Folder, ClipboardList, 
  Sliders, Hammer, FileText, ZoomIn, ZoomOut, RotateCcw, RotateCw
} from 'lucide-react';

interface LightboxProps {
  imageSrc: string;
  imageAlt: string;
  isOpen: boolean;
  onClose: () => void;
}

function Lightbox({ imageSrc, imageAlt, isOpen, onClose }: LightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const touchStartDist = useRef<number | null>(null);
  const touchStartScale = useRef<number>(1);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Reset scale, position, and rotation when opening/closing
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Zoom helpers
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.3, 5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.3, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleRotateLeft = () => setRotation((prev) => prev - 90);
  const handleRotateRight = () => setRotation((prev) => prev + 90);

  // Drag/Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pinch-to-zoom & panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single finger drag
      const touch = e.touches[0];
      setIsDragging(true);
      dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      touchStartDist.current = null;
    } else if (e.touches.length === 2) {
      // Double finger pinch-to-zoom
      setIsDragging(false);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      touchStartDist.current = dist;
      touchStartScale.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.current.x,
        y: touch.clientY - dragStart.current.y,
      });
    } else if (e.touches.length === 2 && touchStartDist.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const factor = dist / touchStartDist.current;
      const newScale = Math.min(Math.max(touchStartScale.current * factor, 0.5), 5);
      setScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartDist.current = null;
  };

  const handleClose = () => {
    setRotation(0);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950/98 p-4 md:p-6"
      id="lightbox-backdrop"
      onKeyDown={(e) => { if (e.key === 'Escape') handleClose(); }}
      tabIndex={0}
    >
      {/* Top bar */}
      <div className="w-full flex items-center justify-between z-10 bg-slate-900/40 backdrop-blur-md rounded-lg p-3 border border-slate-800/50">
        <div className="flex flex-col">
          <span className="text-xs text-amber-500 font-mono tracking-wider font-semibold uppercase">Technical Drawing</span>
          <span className="text-xs md:text-sm text-slate-300 font-sans font-medium line-clamp-1">{imageAlt || 'Diagram Detail'}</span>
        </div>
        <button
          onClick={handleClose}
          className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          title="Close Lightbox (Esc)"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Stage */}
      <div 
        className="relative flex-1 w-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        id="lightbox-canvas-area"
      >
        <div 
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="relative max-h-full max-w-full origin-center"
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt={imageAlt}
            draggable={false}
            referrerPolicy="no-referrer"
            className="max-h-[80vh] max-w-[90vw] md:max-h-[85vh] md:max-w-[85vw] object-contain rounded shadow-2xl pointer-events-none"
          />
        </div>

        {/* Floating guide */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-850 text-[10px] text-slate-400 font-mono tracking-wider uppercase pointer-events-none text-center">
          Drag to Pan • Pinch or Scroll to Zoom • Rotate using buttons below
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-full border border-slate-800/80 flex items-center gap-4 z-10 shadow-lg">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-800 transition-all"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <span className="text-xs font-mono font-medium text-slate-300 min-w-[40px] text-center bg-slate-950/80 px-2.5 py-1 rounded-full border border-slate-850">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-800 transition-all"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        
        <div className="w-px h-4 bg-slate-800" />
        
        {/* Rotate Left Button */}
        <button
          onClick={handleRotateLeft}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-800 transition-all"
          title="Rotate Left (90° CCW)"
          aria-label="Rotate Left"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* Rotate Right Button */}
        <button
          onClick={handleRotateRight}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-800 transition-all"
          title="Rotate Right (90° CW)"
          aria-label="Rotate Right"
        >
          <RotateCw className="w-5 h-5" />
        </button>

        <div className="w-px h-4 bg-slate-800" />
        
        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-800 transition-all flex items-center gap-1 text-xs font-mono font-medium"
          title="Reset View"
          aria-label="Reset Zoom, Rotation and Centering"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}

interface ManualViewProps {
  vehicle: Vehicle;
  onBackToDashboard: () => void;
  onRefreshGarage: () => void;
  initialContent?: ContentPage;
  onBackToTree?: () => void;
}

export default function ManualView({ 
  vehicle, 
  onBackToDashboard, 
  onRefreshGarage,
  initialContent,
  onBackToTree
}: ManualViewProps) {
  // Navigation & Tree states
  const [currentUri, setCurrentUri] = useState<string>(vehicle.uriPath);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rootCategoryPage, setRootCategoryPage] = useState<CategoryPage | null>(null);
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [dynamicChildren, setDynamicChildren] = useState<Record<string, any[]>>({});

  // Navigation Drill-Down State machine
  const [navLevel, setNavLevel] = useState<'root' | 'section'>('root');
  const [sectionTree, setSectionTree] = useState<any[]>([]);
  const [sectionTitle, setSectionTitle] = useState<string>('');
  const [sectionBaseUri, setSectionBaseUri] = useState<string>('');
  
  // Right content panel states
  const [activePage, setActivePage] = useState<PageResponse | null>(null);
  const [loadingActivePage, setLoadingActivePage] = useState(true);
  const [errorActivePage, setErrorActivePage] = useState<string | null>(null);
  const [errorSidebar, setErrorSidebar] = useState<string | null>(null);

  // Garage Bookmarks and Alternatives states
  const [availableSources, setAvailableSources] = useState<Vehicle[]>([]);
  const [garageStatus, setGarageStatus] = useState<{ isSaved: boolean; garageId: number | null }>({
    isSaved: false,
    garageId: null,
  });
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [savingGarage, setSavingGarage] = useState(false);

  // Interactive Checklist Step tracking
  const [completedSteps, setCompletedSteps] = useState<{ [stepIndex: number]: boolean }>({});

  // Lightbox visual diagram zoom
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('');

  // Save to Vehicle state
  const [garageVehicles, setGarageVehicles] = useState<any[]>([]);
  const [showSaveToVehicleModal, setShowSaveToVehicleModal] = useState(false);
  const [savingToVehicle, setSavingToVehicle] = useState(false);
  const [selectedGarageVehicleId, setSelectedGarageVehicleId] = useState<number | ''>('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const handleOpenSaveToVehicleModal = async () => {
    try {
      const data = await api.getGarageVehicles();
      setGarageVehicles(data);
      if (data.length > 0) {
        setSelectedGarageVehicleId(data[0].id);
      }
      setShowSaveToVehicleModal(true);
      setSaveSuccessMessage(null);
    } catch (err) {
      console.error('Failed to load garage vehicles', err);
      alert('Failed to load garage vehicles.');
    }
  };

  const handleSaveToVehicleConfirm = async () => {
    if (!selectedGarageVehicleId) {
      alert('Please select a vehicle.');
      return;
    }
    setSavingToVehicle(true);
    try {
      const payload = {
        garageVehicleId: Number(selectedGarageVehicleId),
        manualUri: currentUri,
        manualTitle: activePage?.title || vehicle.model,
        manualMake: vehicle.make,
        manualYear: vehicle.year,
        manualModel: vehicle.model,
        manualEngine: vehicle.engine
      };
      await api.saveVehicleManual(payload);
      setSaveSuccessMessage('Manual successfully saved to vehicle!');
      setTimeout(() => {
        setShowSaveToVehicleModal(false);
        setSaveSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      alert('Error saving manual to vehicle: ' + err.message);
    } finally {
      setSavingToVehicle(false);
    }
  };

  // 1. Resolve Garage bookmarks & companion manual alternatives
  const checkGarageAndAlternatives = async () => {
    try {
      const vehiclesInQuery = await api.getVehicles(vehicle.make, vehicle.year, vehicle.model);
      const filteredSources = vehiclesInQuery.filter((v) => v.engine === vehicle.engine);
      setAvailableSources(filteredSources);

      const garageItems = await api.getGarage();
      const match = garageItems.find((itm) => itm.id === vehicle.id);
      if (match) {
        setGarageStatus({ isSaved: true, garageId: match.garageId });
        setNicknameInput(match.nickname || '');
      } else {
        setGarageStatus({ isSaved: false, garageId: null });
      }
    } catch (err) {
      console.error('Failed to verify garage configuration', err);
    }
  };

  // 2. Load Left Sidebar Category Index Tree
  const loadSidebarTree = async () => {
    setLoadingSidebar(true);
    setErrorSidebar(null);
    setDynamicChildren({});
    try {
      const pageData = await api.getPage(vehicle.uriPath);
      if (pageData.pageType === 'category') {
        setRootCategoryPage(pageData);
      } else {
        setRootCategoryPage({
          pageType: 'category',
          title: vehicle.model,
          tree: [{ label: 'General Information', uri: vehicle.uriPath, children: [] }],
        });
      }
    } catch (err: any) {
      setErrorSidebar(err.message || 'Unable to download category index.');
    } finally {
      setLoadingSidebar(false);
    }
  };

  // 3. Load Right Panel Content Details
  const loadActivePageDetails = async (uri: string) => {
    setLoadingActivePage(true);
    setErrorActivePage(null);
    setCompletedSteps({}); // Reset checklists on page changes
    try {
      const data = await api.getPage(uri);
      if (data.pageType === 'category') {
        const firstNode = data.tree?.[0];
        const children = (firstNode && 'children' in firstNode ? firstNode.children : null) || data.tree || [];
        setDynamicChildren(prev => ({ ...prev, [uri]: children }));
      }
      setActivePage(data);
    } catch (err: any) {
      setErrorActivePage(err.message || 'Failed to download procedure instructions.');
    } finally {
      setLoadingActivePage(false);
    }
  };

  // Hook layout initialisation
  useEffect(() => {
    checkGarageAndAlternatives();
    if (initialContent) {
      setActivePage(initialContent);
      setLoadingActivePage(false);
      setLoadingSidebar(false);
    } else {
      loadSidebarTree();
      loadActivePageDetails(vehicle.uriPath);
    }
  }, [vehicle, initialContent]);

  // Refetch when currentUri path transitions
  useEffect(() => {
    if (!initialContent) {
      loadActivePageDetails(currentUri);
    }
  }, [currentUri, initialContent]);

  // Toggle checklist checkbox step
  const toggleStepCompleted = (idx: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Handle Garage bookmark star actions
  const handleToggleGarage = async () => {
    if (garageStatus.isSaved && garageStatus.garageId !== null) {
      if (window.confirm(`Remove ${vehicle.year} ${vehicle.make} ${vehicle.model} from your garage?`)) {
        try {
          await api.removeFromGarage(garageStatus.garageId);
          setGarageStatus({ isSaved: false, garageId: null });
          setNicknameInput('');
          onRefreshGarage();
        } catch (err: any) {
          alert('Error removing vehicle: ' + err.message);
        }
      }
    } else {
      setNicknameInput(`${vehicle.year} ${vehicle.make} ${vehicle.model}`);
      setShowNicknameModal(true);
    }
  };

  const handleSaveGarageConfirm = async () => {
    setSavingGarage(true);
    try {
      const savedItem = await api.addToGarage(vehicle.id, nicknameInput.trim() || undefined);
      setGarageStatus({ isSaved: true, garageId: savedItem.garageId });
      setShowNicknameModal(false);
      onRefreshGarage();
    } catch (err: any) {
      alert('Error bookmarking vehicle: ' + err.message);
    } finally {
      setSavingGarage(false);
    }
  };

  const goUpOneLevel = () => {
    if (currentUri === vehicle.uriPath) return;
    const cleanUri = currentUri.trim().replace(/^\/|\/$/g, '');
    const segments = cleanUri.split('/').filter(Boolean);
    if (segments.length <= 3) {
      setCurrentUri(vehicle.uriPath);
      return;
    }
    segments.pop();
    const parentUri = '/' + segments.join('/') + '/';
    setCurrentUri(parentUri);
  };

  // Form custom path trail
  const renderBreadcrumbs = () => {
    const cleanUri = currentUri.trim().replace(/^\/|\/$/g, '');
    const segments = cleanUri.split('/').filter(Boolean);
    const accumPaths: { label: string; uri: string }[] = [];
    let cumulative = '';
    
    segments.forEach((seg, idx) => {
      cumulative += '/' + seg;
      let label = decodeURIComponent(seg);
      if (idx === 2) {
        label = label.replace(/\s*\(.*\)/g, '').trim();
      }
      accumPaths.push({ label, uri: cumulative + '/' });
    });

    return (
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-sans font-medium mb-4 bg-surface-theme rounded-lg px-3 py-2 border border-border-theme">
        <button
          onClick={() => setCurrentUri(vehicle.uriPath)}
          className="hover:text-primary-theme transition-colors uppercase font-mono tracking-wider font-extrabold text-[10px] text-slate-300"
        >
          Root
        </button>
        
        {accumPaths.map((path, idx) => {
          const isModelNode = idx <= 2;
          const isLast = idx === accumPaths.length - 1;
          const targetUri = isModelNode ? vehicle.uriPath : path.uri;

          return (
            <React.Fragment key={path.uri}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {isLast ? (
                <span className="text-primary-theme font-semibold truncate max-w-[160px] md:max-w-xs">
                  {path.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentUri(targetUri)}
                  className="hover:text-primary-theme transition truncate max-w-[120px] md:max-w-xs text-slate-300 font-bold"
                >
                  {path.label}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    );
  };

  const resolveHref = (baseUri: string, href: string): string => {
    if (href.startsWith('/')) {
      return href;
    }
    return baseUri + href;
  };

  const handleSelectUri = async (resolvedUri: string, node: any) => {
    if (navLevel === 'root') {
      // Transition from root section list to the specific interactive chapter tree (e.g. Repair & Diagnosis)
      setLoadingActivePage(true);
      setErrorActivePage(null);
      try {
        const response = await api.getPage(resolvedUri);
        if (response.pageType === 'category') {
          setSectionTree(response.tree || []);
          setSectionTitle(response.title || node.title);
          setSectionBaseUri(resolvedUri);
          setNavLevel('section');
          
          // Clear active page to welcome/placeholder state
          setActivePage({
            pageType: 'category',
            title: response.title || node.title,
            tree: []
          });
          setCurrentUri(resolvedUri);
        } else {
          setActivePage(response);
          setCurrentUri(resolvedUri);
        }
      } catch (err: any) {
        setErrorActivePage(err.message || 'Failed to load this chapter category.');
      } finally {
        setLoadingActivePage(false);
      }
    } else {
      // Selecting a leaf procedure document within the expanded tree
      setCurrentUri(resolvedUri);
      setSidebarOpen(false); // Close mobile menu drawer
    }
  };

  const alternativeSource = availableSources.find((v) => v.id !== vehicle.id);

  const displayTree = navLevel === 'root' ? (rootCategoryPage?.tree || []) : sectionTree;
  const displayTitle = navLevel === 'root' ? (rootCategoryPage?.title || vehicle.model) : sectionTitle;
  const displayBaseUri = navLevel === 'root' ? vehicle.uriPath : sectionBaseUri;

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-64px)] overflow-hidden bg-[#0a0a0f]" id="manual-workspace">
      
      {/* 1. Header Toolbar Bar */}
      <div className="bg-[#13141a] border-b border-[#1e2028] px-4 py-3 flex items-center justify-between gap-4 select-none shrink-0" id="manual-toolbar">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition bg-[#0a0a0f] border border-[#1e2028] hover:border-slate-605 rounded px-3 py-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Close Manual</span>
          </button>
          
          {vehicle.isComplete === 0 && (
            <div className="hidden lg:flex items-center gap-1.5 bg-red-950/20 border border-red-900/30 text-red-400 px-2.5 py-1.5 rounded text-[10px] uppercase font-mono tracking-wider font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Partial Doc</span>
            </div>
          )}
        </div>

        {/* Mid Toolbar Vehicle label */}
        <div className="hidden lg:flex flex-col text-center">
          <span className="text-[9px] text-slate-500 font-mono tracking-widest font-semibold uppercase">SPEC MANUAL READOUT</span>
          <span className="text-xs font-bold text-slate-100 uppercase">
            {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.engine})
          </span>
        </div>

        {/* Toolbar Right tools */}
        <div className="flex items-center gap-2.5">
          {alternativeSource && (
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('swap-manual-source', { detail: alternativeSource }));
              }}
              className="text-[9px] bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 border border-indigo-500/20 rounded font-black px-2 py-1 uppercase tracking-wider transition duration-150"
            >
              Toggle {alternativeSource.source.toUpperCase()} Source
            </button>
          )}

          {/* Bookmark Button */}
          <button
            onClick={handleToggleGarage}
            className={`flex items-center gap-1.5 rounded text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 border transition ${
              garageStatus.isSaved
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-slate-950'
                : 'bg-[#0a0a0f] border-[#1e2028] text-slate-400 hover:border-slate-700 hover:text-white'
            }`}
            title={garageStatus.isSaved ? 'Saved in Garage' : 'Add to Garage'}
          >
            {garageStatus.isSaved ? <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> : <StarOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{garageStatus.isSaved ? 'Saved' : 'Save Garage'}</span>
          </button>

          {/* Save to Vehicle Button */}
          <button
            onClick={handleOpenSaveToVehicleModal}
            className="flex items-center gap-1.5 rounded text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 border bg-[#0a0a0f] border-[#1e2028] text-slate-400 hover:border-slate-700 hover:text-white transition cursor-pointer"
            title="Save manual page directly to a specific vehicle profile"
          >
            <FolderPlus className="w-4 h-4 text-primary-theme" />
            <span className="hidden sm:inline">Save to Vehicle</span>
          </button>

          {/* Mobile drawer toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden rounded bg-[#0a0a0f] border border-[#1e2028] p-2 text-slate-350 hover:bg-[#13141a]"
            aria-label="Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Main Sidebar & Stage Screen Container */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Aspect: Fixed Index Directory Sidebar (520px wide) */}
        <aside 
          className={`
            absolute md:static top-0 bottom-0 left-0 z-40
            w-[520px] max-w-full shrink-0 border-r border-[#1e2028] bg-[#0d0e14] flex flex-col h-full
            transform md:translate-x-0 transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
          id="manual-sidebar-menu"
        >
          {/* Mobile close sidebar header row */}
          <div className="flex items-center justify-between border-b border-[#1e2028] bg-[#0d0e14] p-3 md:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Chapters Index</span>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="p-1 rounded text-slate-400 hover:bg-[#13141a] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Top: Selected Model Specs Badge */}
          <div className="bg-[#13141a] border-b border-[#1e2028] p-4">
            <span className="text-[9px] text-amber-500 font-mono font-black uppercase tracking-wider block mb-1">
              CHAPTER DIRECTORY
            </span>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-tight truncate leading-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{vehicle.engine}</p>
          </div>

          {/* Scrollable Tree Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {loadingSidebar ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                <p className="text-xs text-slate-500">Unpacking index chapters...</p>
              </div>
            ) : errorSidebar ? (
              <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-300 rounded text-xs space-y-2">
                <p>{errorSidebar}</p>
                <button
                  onClick={loadSidebarTree}
                  className="w-full py-1.5 bg-[#13141a] hover:bg-slate-800 text-white font-mono uppercase tracking-wider text-[10px] rounded"
                >
                  Reload Tree
                </button>
              </div>
            ) : rootCategoryPage ? (
              <div className="space-y-3">
                {navLevel === 'section' && (
                  <button
                    type="button"
                    onClick={() => {
                      setNavLevel('root');
                      setActivePage(rootCategoryPage);
                      setCurrentUri(vehicle.uriPath);
                      setDynamicChildren({});
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-400 hover:border-amber-500/30 border border-amber-500/10 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 select-none cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    <span>Back to Sections</span>
                  </button>
                )}

                <TreeView
                  rootTitle={displayTitle}
                  rootTree={displayTree}
                  baseUri={displayBaseUri}
                  activeUri={currentUri}
                  onSelectUri={handleSelectUri}
                  dynamicChildren={dynamicChildren}
                />
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">
                No active directories found in index.
              </p>
            )}
          </div>
        </aside>

        {/* Mobile backdrop slide dark cover */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden" 
          />
        )}

        {/* Right Aspect: Content Reader Display Panel */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0f]" id="manual-viewer-stage">
          
          {/* Breadcrumbs Row */}
          <div className="px-4 md:px-6 pt-4 text-xs font-sans shrink-0 space-y-2 text-left">
            {currentUri !== vehicle.uriPath && (
              <button
                type="button"
                onClick={goUpOneLevel}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:text-white transition bg-surface-theme border border-border-theme hover:border-slate-700 rounded-lg px-3 py-1.5 shadow select-none cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-primary-theme" />
                <span>← Back</span>
              </button>
            )}
            {renderBreadcrumbs()}
          </div>

          {/* Core scrollable content container */}
          <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 pb-20">
            
            {loadingActivePage ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                <div className="text-center space-y-1">
                  <p className="text-slate-300 text-sm font-semibold tracking-wide">Syncing Diagnostic Section...</p>
                  <p className="text-slate-500 text-xs font-mono">Loading data payload</p>
                </div>
              </div>
            ) : errorActivePage ? (
              <div className="max-w-xl mx-auto py-16 text-center space-y-4">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                <div>
                  <h3 className="text-red-200 font-bold uppercase text-sm tracking-wider">Failed to load manual details</h3>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">{errorActivePage}</p>
                </div>
                <button
                  onClick={() => loadActivePageDetails(currentUri)}
                  className="px-4 py-2 bg-[#13141a] hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded border border-[#1e2028]"
                >
                  Retry Load
                </button>
              </div>
            ) : activePage ? (
              <div className="max-w-6xl mx-auto space-y-8 animate-fade-in" id="active-document-canvas">
                
                {/* 2A. When active selection is a folder category (welcome / select a procedure state) */}
                {activePage.pageType === 'category' ? (
                  <div className="flex flex-col items-center justify-center text-center py-24 px-6 max-w-lg mx-auto space-y-6" id="manual-welcome-pane">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/25 animate-pulse">
                      <Wrench className="w-7 h-7 text-amber-500" />
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-[10px] text-amber-500 font-mono tracking-widest font-bold uppercase block">
                        Ragnarök Manual Workspace
                      </span>
                      <h3 className="text-lg font-black text-slate-100 tracking-tight uppercase">
                        Select a Procedure Section
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Use the fully collapsible chapter directory on the left to navigate service manuals. Click any folder to toggle subchapters, or select a leaf diagnostic / repair page to load detailed diagrams and checklists.
                      </p>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-3.5 pt-4 text-left font-sans">
                      <div className="bg-[#13141a] border border-[#1e2028] p-4 rounded-xl">
                        <Folder className="w-4 h-4 text-amber-500 mb-2" />
                        <h4 className="text-xs font-bold text-slate-200">Interactive Tree</h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">Fully collapsible index showing deep-nested manual paths.</p>
                      </div>
                      <div className="bg-[#13141a] border border-[#1e2028] p-4 rounded-xl">
                        <CheckSquare className="w-4 h-4 text-amber-500 mb-2" />
                        <h4 className="text-xs font-bold text-slate-200">Leaf Procedures</h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">Clickable end documents showing guidelines, steps & specs.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  
                  // 2B. Content rendering mode
                  <div className="space-y-6" id="procedure-reader-content">
                    <div className="border-b border-[#1e2028] pb-4">
                      <span className="text-[10px] text-amber-500 font-mono tracking-widest font-semibold uppercase">
                        {vehicle.source.toUpperCase()} MANUAL • SERVICE DOCUMENT
                      </span>
                      <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight mt-1 leading-snug">
                        {activePage.title}
                      </h2>
                    </div>

                    {/* Core Sequential Blocks */}
                    <div className="space-y-6">
                      {activePage.blocks && activePage.blocks.length > 0 ? (
                        activePage.blocks.map((block: Block, blockIdx: number) => {
                          
                          // H1/H2 Headings styled in bold amber
                          if (block.type === 'heading') {
                            return (
                              <h3 
                                key={`heading-${blockIdx}`}
                                className="text-lg md:text-xl font-extrabold text-amber-400 uppercase tracking-wider border-l-2 border-amber-500 pl-4 pt-1 mt-10 leading-relaxed"
                              >
                                {block.text}
                              </h3>
                            );
                          }

                          // Descriptive content text
                          if (block.type === 'text') {
                            const text = block.text;
                            // check if block mentions torque to highlight
                            const hasTorque = /[\d.]+[\s]*(?:Nm|N-m|N·m|lb-ft|lb-in|foot-pounds|torque|spec)/i.test(text);
                            
                            return (
                              <p 
                                key={`text-${blockIdx}`}
                                className={`text-base leading-relaxed text-slate-300 font-sans ${
                                  hasTorque 
                                    ? 'bg-amber-500/5 border border-amber-500/10 p-4 rounded-lg text-amber-250 font-semibold font-mono'
                                    : ''
                                }`}
                              >
                                {text}
                              </p>
                            );
                          }

                          // Repair step checklist rendered as beautiful numbered cards
                          if (block.type === 'steps') {
                            const completedCount = Object.values(completedSteps).filter(Boolean).length;
                            const totalSteps = block.items.length;
                            const isFinished = completedCount === totalSteps && totalSteps > 0;

                            return (
                              <div key={`steps-${blockIdx}`} className="space-y-3.5">
                                {/* Checklist Title & Counter Banner */}
                                <div className="bg-[#13141a] border border-[#1e2028] px-4 py-3 flex items-center justify-between rounded-lg select-none">
                                  <div className="flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4 text-amber-500" />
                                    <span className="text-[11px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                                      Repair Checklist Procedure
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold bg-[#0a0a0f] border border-[#1e2028] text-slate-350 px-2.5 py-0.5 rounded-full">
                                      {completedCount} / {totalSteps} COMPLETE
                                    </span>
                                    {totalSteps > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setCompletedSteps({})}
                                        className="text-[9px] text-amber-500 hover:text-amber-400 font-mono tracking-wider font-extrabold uppercase transition"
                                      >
                                        RESET
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Checklist Steps as clean individual Numbered Cards */}
                                <div className="space-y-2.5">
                                  {block.items.map((step, sIdx) => {
                                    const isDone = !!completedSteps[sIdx];
                                    
                                    return (
                                      <div
                                        key={`step-${sIdx}`}
                                        onClick={() => toggleStepCompleted(sIdx)}
                                        className={`group/step p-4 rounded-xl border bg-[#13141a] hover:bg-[#1a1c24] border-l-[3px] transition-all duration-150 cursor-pointer flex items-start gap-4 ${
                                          isDone ? 'border-amber-500/20 bg-amber-500/5 border-l-amber-500' : 'border-[#1e2028] border-l-transparent'
                                        }`}
                                      >
                                        {/* Left Side: Step Number Badge */}
                                        <div className="shrink-0 flex flex-col items-center">
                                          <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                            {(sIdx + 1).toString().padStart(2, '0')}
                                          </span>
                                        </div>

                                        {/* Step Description Content */}
                                        <div className="flex-1">
                                          <p className={`text-slate-200 text-base leading-relaxed ${isDone ? 'line-through text-slate-500' : ''}`}>
                                            {step}
                                          </p>
                                        </div>

                                        {/* Right Side: Toggle Box */}
                                        <div className="shrink-0 mt-0.5 select-none">
                                          {isDone ? (
                                            <div className="w-5 h-5 rounded border border-amber-500 bg-amber-500/20 flex items-center justify-center text-amber-400">
                                              <CheckSquare className="w-3.5 h-3.5" />
                                            </div>
                                          ) : (
                                            <div className="w-5 h-5 rounded border border-slate-700 bg-[#0a0a0f] flex items-center justify-center text-transparent group-hover/step:border-amber-500/50 transition">
                                              <Square className="w-3.5 h-3.5" />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Completed banner */}
                                {isFinished && (
                                  <div className="bg-green-950/20 border border-green-800/30 p-4 text-center text-green-300 text-xs flex items-center justify-center gap-2 font-medium rounded-lg shadow-sm">
                                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                    <span>All task steps checked off. Procedure verification complete.</span>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // Image diagrams centered with lightbox on click
                          if (block.type === 'image') {
                            const apiBase = getApiBase();
                            const proxiedSrc = `${apiBase}/api/image?src=${block.src}`;
                            
                            return (
                              <div 
                                key={`image-${blockIdx}`}
                                className="group relative rounded-xl overflow-hidden border border-[#1e2028] bg-[#13141a] p-3 text-center max-w-3xl mx-auto cursor-zoom-in shadow-lg"
                                onClick={() => {
                                  setLightboxSrc(proxiedSrc);
                                  setLightboxAlt(activePage.title);
                                }}
                              >
                                <img
                                  src={proxiedSrc}
                                  alt={activePage.title}
                                  referrerPolicy="no-referrer"
                                  className="max-h-[520px] object-contain rounded-lg mx-auto filter bg-[#020204]/70 pointer-events-none group-hover:brightness-105 duration-150"
                                />
                                <div className="absolute inset-2 bg-black/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-all text-sm gap-1.5 font-mono uppercase tracking-wider font-bold select-none rounded-lg">
                                  <Eye className="w-5 h-5 text-amber-500" />
                                  <span>Zoom Diagram Blueprint</span>
                                </div>
                              </div>
                            );
                          }

                           if (block.type === 'table') {
                            const hasHeaders = block.headers && block.headers.length > 0;
                            const tableHeaders = hasHeaders ? block.headers : (block.rows && block.rows.length > 0 ? block.rows[0] : []);
                            const tableRows = hasHeaders ? block.rows : (block.rows && block.rows.length > 1 ? block.rows.slice(1) : (block.rows || []));

                            return (
                              <div key={`table-${blockIdx}`} className="overflow-x-auto rounded-xl border border-[#1e2028] my-8 font-mono text-sm">
                                <table className="w-full text-left border-collapse bg-[#0c0d12]">
                                  {tableHeaders && tableHeaders.length > 0 && (
                                    <thead className="bg-[#1a1c24] border-b border-amber-500/30">
                                      <tr>
                                        {tableHeaders.map((h: string, i: number) => (
                                          <th key={i} className="px-5 py-4 text-left text-amber-500 font-bold uppercase tracking-wider text-xs md:text-sm">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                  )}
                                  <tbody>
                                    {tableRows && tableRows.map((row: string[], i: number) => (
                                      <tr key={i} className={`border-b border-[#1e2028]/40 hover:bg-[#1a1c24]/30 transition-colors ${i % 2 === 0 ? 'bg-[#13141a]' : 'bg-[#0a0a0f]'}`}>
                                        {row.map((cell: string, j: number) => (
                                          <td key={j} className="px-5 py-3.5 text-slate-300">{cell}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          }

                          return null;
                        })
                      ) : (
                        <div className="text-center py-16">
                          <HelpCircle className="w-10 h-10 text-slate-600 mx-auto" />
                          <p className="text-sm text-slate-500 mt-2">This procedure manual page does not define rendering blocks.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            ) : null}

          </div>
        </main>
      </div>

      {/* Full-screen lightbox */}
      <Lightbox
        isOpen={lightboxSrc !== null}
        imageSrc={lightboxSrc || ''}
        imageAlt={lightboxAlt}
        onClose={() => setLightboxSrc(null)}
      />

      {/* Nickname bookmark dialog */}
      {showNicknameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-[#1e2028] bg-[#13141a] text-slate-100 overflow-hidden shadow-2xl">
            <div className="bg-[#1a1c24] border-b border-[#1e2028] p-4 flex items-center gap-2">
              <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Bookmark Vehicle Profile</h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">
                  Profile Nickname (e.g. My Daily, Work Truck)
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="Insert nickname identifier..."
                  className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-200 text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                  autoFocus
                />
              </div>

              <div className="bg-[#1a1c24]/50 border border-[#1e2028] p-3 rounded-lg text-xs leading-relaxed text-slate-400 flex gap-2">
                <Info className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                <p>Pinning this vehicle puts it directly on your garage dashboard row for rapid offline lookup.</p>
              </div>
            </div>

            <div className="bg-[#1a1c24] p-3.5 border-t border-[#1e2028] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNicknameModal(false)}
                className="px-4 py-2 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGarageConfirm}
                disabled={savingGarage}
                className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {savingGarage ? 'Saving...' : 'Pin in Garage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save to Vehicle dialog modal */}
      {showSaveToVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in" id="save-to-vehicle-modal">
          <div className="w-full max-w-sm rounded-xl border border-[#1e2028] bg-[#13141a] text-slate-100 overflow-hidden shadow-2xl">
            <div className="bg-[#1a1c24] border-b border-[#1e2028] p-4 flex items-center gap-2">
              <FolderPlus className="w-4.5 h-4.5 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Save Manual to Vehicle</h3>
            </div>
            
            <div className="p-4 space-y-4">
              {saveSuccessMessage ? (
                <div className="bg-green-950/20 border border-green-800/30 p-4 text-center text-green-300 text-xs flex items-center justify-center gap-2 font-medium rounded-lg shadow-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
              ) : garageVehicles.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-slate-400">No registered vehicles found in your garage.</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">Please register a vehicle first in the Vehicles or Garage tabs.</p>
                </div>
              ) : (
                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">
                    Select Vehicle Profile
                  </label>
                  <select
                    value={selectedGarageVehicleId}
                    onChange={(e) => setSelectedGarageVehicleId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded bg-[#0a0a0f] border border-[#1e2028] text-slate-205 text-text-theme text-sm px-3.5 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 cursor-pointer"
                  >
                    {garageVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} ({v.customer_name || 'Personal'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">This links the active manual page directly to the vehicle's diagnostic profile.</p>
                </div>
              )}
            </div>

            <div className="bg-[#1a1c24] p-3.5 border-t border-[#1e2028] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSaveToVehicleModal(false)}
                className="px-4 py-2 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-200 cursor-pointer"
              >
                Close
              </button>
              {garageVehicles.length > 0 && !saveSuccessMessage && (
                <button
                  type="button"
                  onClick={handleSaveToVehicleConfirm}
                  disabled={savingToVehicle}
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingToVehicle ? 'Saving...' : 'Link to Profile'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prominent Search/Filter Style Overrides */}
      <style>{`
        #tree-search-input {
          padding-top: 0.75rem !important;
          padding-bottom: 0.75rem !important;
          padding-left: 2.5rem !important;
          padding-right: 2.5rem !important;
          font-size: 0.875rem !important; /* text-sm */
          line-height: 1.25rem !important;
          border-color: #3f3f46 !important; /* border-zinc-700 */
          background-color: #0c0d12 !important;
          width: 100% !important;
          border-radius: 0.5rem !important;
        }
        #tree-search-input:focus {
          border-color: #f59e0b !important; /* border-amber-500 */
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2) !important;
        }
        #category-tree-panel .relative svg {
          top: 0.95rem !important;
          left: 0.85rem !important;
          width: 1.125rem !important;
          height: 1.125rem !important;
        }
        #category-tree-panel .relative button {
          top: 0.75rem !important;
          right: 0.75rem !important;
        }
        #category-tree-panel .relative button svg {
          top: auto !important;
          left: auto !important;
          width: 0.875rem !important;
          height: 0.875rem !important;
        }
      `}</style>

    </div>
  );
}
