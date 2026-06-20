/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Vehicle, GarageItem, CategoryPage, ContentPage, PageResponse, TreeItem, Block } from '../types';
import { api, ApiError } from '../lib/api';
import TreeView from './TreeView';
import Lightbox from './Lightbox';
import { 
  ArrowLeft, Star, StarOff, Menu, X, ChevronRight, FolderMinus, FolderPlus, 
  HelpCircle, Eye, AlertCircle, CheckCircle, RefreshCw, Layers, Compass, 
  CheckSquare, Square, Info, ShieldAlert, MonitorCheck
} from 'lucide-react';

interface ManualViewProps {
  vehicle: Vehicle;
  onBackToDashboard: () => void;
  onRefreshGarage: () => void;
}

export default function ManualView({ vehicle, onBackToDashboard, onRefreshGarage }: ManualViewProps) {
  // Navigation & Tree state
  const [currentUri, setCurrentUri] = useState<string>(vehicle.uriPath);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rootCategoryPage, setRootCategoryPage] = useState<CategoryPage | null>(null);
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  
  // Right content pane state
  const [activePage, setActivePage] = useState<PageResponse | null>(null);
  const [loadingActivePage, setLoadingActivePage] = useState(true);
  const [errorActivePage, setErrorActivePage] = useState<string | null>(null);
  const [errorSidebar, setErrorSidebar] = useState<string | null>(null);

  // Alternative manual sources state
  const [availableSources, setAvailableSources] = useState<Vehicle[]>([]);
  const [garageStatus, setGarageStatus] = useState<{ isSaved: boolean; garageId: number | null }>({
    isSaved: false,
    garageId: null,
  });
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [savingGarage, setSavingGarage] = useState(false);

  // Checklist Step tracking - cleared on page URI change
  const [completedSteps, setCompletedSteps] = useState<{ [stepIndex: number]: boolean }>({});

  // Lightbox selection state
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('');

  // 1. Check garage status & available source manuals
  const checkGarageAndAlternatives = async () => {
    try {
      // Find matches for same make, model, year, engine to let users switch sources on the fly
      const vehiclesInQuery = await api.getVehicles(vehicle.make, vehicle.year, vehicle.model);
      const filteredSources = vehiclesInQuery.filter((v) => v.engine === vehicle.engine);
      setAvailableSources(filteredSources);

      // Check if this active manual instance is in My Garage
      const garageItems = await api.getGarage();
      const match = garageItems.find((itm) => itm.id === vehicle.id);
      if (match) {
        setGarageStatus({ isSaved: true, garageId: match.garageId });
        setNicknameInput(match.nickname || '');
      } else {
        setGarageStatus({ isSaved: false, garageId: null });
      }
    } catch (err) {
      console.error('Failed to resolve garage check', err);
    }
  };

  // 2. Fetch Left Sidebar Category Tree (fetched once at root vehicle URI path)
  const loadSidebarTree = async () => {
    setLoadingSidebar(true);
    setErrorSidebar(null);
    try {
      const pageData = await api.getPage(vehicle.uriPath);
      if (pageData.pageType === 'category') {
        setRootCategoryPage(pageData);
      } else {
        // Fallback or page type is content, build flat tree
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

  // 3. Fetch Right Pane Page Details
  const loadActivePageDetails = async (uri: string) => {
    setLoadingActivePage(true);
    setErrorActivePage(null);
    // Standard rule: tick checklists are reset on page change
    setCompletedSteps({});
    try {
      const data = await api.getPage(uri);
      setActivePage(data);
    } catch (err: any) {
      setErrorActivePage(err.message || 'Failed to download topic content.');
    } finally {
      setLoadingActivePage(false);
    }
  };

  // Synchronize layout initialization
  useEffect(() => {
    checkGarageAndAlternatives();
    loadSidebarTree();
    loadActivePageDetails(vehicle.uriPath);
  }, [vehicle]);

  // Synchronize whenever current URI triggers load
  useEffect(() => {
    loadActivePageDetails(currentUri);
  }, [currentUri]);

  // Handle Select Tree Node
  const handleSelectNode = (node: TreeItem) => {
    setCurrentUri(node.uri);
    setSidebarOpen(false); // Close mobile drawer overlay
  };

  // Toggle checklist checkboxes
  const toggleStepCompleted = (idx: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Trigger Action Add/Remove Garage bookmarks
  const handleToggleGarage = async () => {
    if (garageStatus.isSaved && garageStatus.garageId !== null) {
      // Remove
      if (window.confirm(`Remove ${vehicle.year} ${vehicle.make} ${vehicle.model} from your garage?`)) {
        try {
          await api.removeFromGarage(garageStatus.garageId);
          setGarageStatus({ isSaved: false, garageId: null });
          setNicknameInput('');
          onRefreshGarage(); // Notify parent dashboard
        } catch (err: any) {
          alert('Error removing vehicle: ' + err.message);
        }
      }
    } else {
      // Prompt modal for Nickname
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
      onRefreshGarage(); // Notify parent dashboard
    } catch (err: any) {
      alert('Error bookmarking vehicle: ' + err.message);
    } finally {
      setSavingGarage(false);
    }
  };

  // Parse custom breadcrumb list from active URI
  const renderBreadcrumbs = () => {
    // A standard uri follows paths: /VehicleMake/Year/Model/...
    // Let's split and build step URIs
    const cleanUri = currentUri.trim().replace(/^\/|\/$/g, '');
    const segments = cleanUri.split('/').filter(Boolean);
    
    // We want to make the parts clickable, so build accumulation link paths
    const accumPaths: { label: string; uri: string }[] = [];
    let cumulative = '';
    
    segments.forEach((seg, i) => {
      cumulative += '/' + seg;
      let label = decodeURIComponent(seg);
      // Skip redundant parameters or render cleanly
      accumPaths.push({ label, uri: cumulative + '/' });
    });

    return (
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-sans font-medium mb-3 bg-slate-900/60 rounded-lg p-2.5 border border-slate-800">
        <button
          onClick={() => setCurrentUri(vehicle.uriPath)}
          className="hover:text-amber-500 transition-colors uppercase font-mono tracking-wider font-extrabold text-[10px]"
        >
          ROOT INDEX
        </button>
        
        {accumPaths.map((path, idx) => {
          // If segment is first three details (Make, Year, Model), simplify link clicks to root for tidy navigation
          const isModelNode = idx <= 2;
          const isLast = idx === accumPaths.length - 1;

          return (
            <React.Fragment key={path.uri}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-650 shrink-0" />
              {isLast ? (
                <span className="text-amber-400 font-semibold truncate max-w-[180px] md:max-w-xs font-sans">
                  {path.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentUri(isModelNode ? vehicle.uriPath : path.uri)}
                  className="hover:text-amber-500 transition duration-150 truncate max-w-[120px] md:max-w-xs text-slate-300"
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

  const currentSourceLabel = vehicle.source === 'lemon' ? 'LEMON Manual' : 'CHARM Manual';
  const alternativeSource = availableSources.find((v) => v.id !== vehicle.id);

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-64px)] overflow-hidden" id="manual-workspace">
      
      {/* 1. Technical Utility bar above workspace */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-4 select-none shrink-0" id="manual-toolbar">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-0.5" />
            <span>Close Workspace</span>
          </button>
          
          {/* Complete Warning indicator */}
          {vehicle.isComplete === 0 && (
            <div className="hidden lg:flex items-center gap-1.5 bg-red-950/40 border border-red-900 text-red-400 px-2.5 py-1.5 rounded-lg text-[10px] uppercase font-mono tracking-wider font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Partial Documentation</span>
            </div>
          )}
        </div>

        {/* Dynamic vehicle configuration titles */}
        <div className="hidden md:flex flex-col text-center">
          <span className="text-[10px] text-amber-500 font-mono tracking-widest font-semibold uppercase">ACTIVE WORKSPACE REF</span>
          <span className="text-sm font-extrabold text-white">
            {vehicle.year} {vehicle.make} {vehicle.model} — <code className="text-xs text-slate-350">{vehicle.engine}</code>
          </span>
        </div>

        {/* Bookmark & Multi-Source Quick Swap buttons */}
        <div className="flex items-center gap-2.5">
          {/* Dual Manual switcher if alternative code exists */}
          {alternativeSource && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1.5 rounded-lg">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider hidden lg:inline px-1">Source:</span>
              <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded uppercase mr-1 ${
                vehicle.source === 'lemon' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'
              }`}>
                {vehicle.source === 'lemon' ? 'Lemon' : 'Charm'}
              </span>
              <button
                type="button"
                onClick={() => {
                  // Swap active workspace source vehicle directly!
                  const urlToPreserve = currentUri; // Keep reading same uri node
                  // We can select the other vehicle row
                  // Wait, the parent app manages active selection, we can just trigger a reload or update
                  // But wait, the alternate has same model, so calling SelectVehicle works
                  // Let's pass item to open page
                  // But wait, what if active path works on both? That's perfect
                  window.dispatchEvent(new CustomEvent('swap-manual-source', { detail: alternativeSource }));
                }}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold px-1.5 py-0.5 uppercase tracking-wider border border-slate-700 transition"
              >
                Switch Manual
              </button>
            </div>
          )}

          {/* Floater bookmark button */}
          <button
            onClick={handleToggleGarage}
            className={`flex items-center gap-1.5 rounded-lg text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 border transition ${
              garageStatus.isSaved
                ? 'bg-amber-500/10 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-slate-950'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-650 hover:text-white'
            }`}
            title={garageStatus.isSaved ? 'Bookmarked in Garage' : 'Add to Garage'}
          >
            {garageStatus.isSaved ? <Star className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" /> : <StarOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{garageStatus.isSaved ? 'Saved in Garage' : 'Add Garage'}</span>
          </button>

          {/* Sidebar drawer toggle on mobile sizes */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden rounded-lg bg-slate-900 border border-slate-800 p-2 text-slate-300 hover:bg-slate-800"
            aria-label="Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side Sidebar - Category Index Tree */}
        <aside 
          className={`
            absolute md:static top-0 bottom-0 left-0 z-40
            w-72 md:w-80 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col h-full
            transform md:translate-x-0 transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          id="manual-sidebar-menu"
        >
          {/* Close drawer trigger on mobile */}
          <div className="flex items-center justify-between border-b border-slate-900 bg-slate-950 p-3.5 md:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Chapters / Contents</span>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="p-1 rounded text-slate-400 hover:bg-slate-900 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">Manual Directory</span>
              <span className="text-[10px] bg-slate-900 font-mono border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                v2.1
              </span>
            </div>

            {loadingSidebar ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                <p className="text-xs text-slate-500">Unpacking index data...</p>
              </div>
            ) : errorSidebar ? (
              <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-300 rounded-lg text-xs leading-relaxed space-y-2">
                <p>{errorSidebar}</p>
                <button
                  onClick={loadSidebarTree}
                  className="w-full py-1.5 bg-slate-850 hover:bg-slate-800 text-white font-mono uppercase tracking-wider text-[10px] rounded"
                >
                  Recall Index Diagnostic
                </button>
              </div>
            ) : rootCategoryPage && rootCategoryPage.tree.length > 0 ? (
              <TreeView 
                tree={rootCategoryPage.tree} 
                selectedUri={currentUri} 
                onSelectNode={handleSelectNode} 
              />
            ) : (
              <p className="text-xs text-slate-500 text-center py-6 leading-relaxed">
                No active chapters declared inside this manual index.
              </p>
            )}
          </div>
        </aside>

        {/* Mobile menu backdrop blur */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs z-30 md:hidden" 
          />
        )}

        {/* Right Pane - Dynamic active page reader view */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900/40" id="manual-viewer-stage">
          
          {/* Breadcrumb section */}
          <div className="px-4 md:px-6 pt-4 text-xs font-sans shrink-0">
            {renderBreadcrumbs()}
          </div>

          {/* Scrollable Reader Stage */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-16 space-y-6">
            
            {loadingActivePage ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-amber-500 animate-spin" />
                  <Compass className="w-5 h-5 text-amber-500 absolute top-3.5 left-3.5 animate-pulse" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-slate-300 text-sm font-semibold tracking-wide font-sans">Accessing Workshop Directory...</p>
                  <p className="text-slate-500 text-xs font-mono">Downloading schemas and structural documents</p>
                </div>
              </div>
            ) : errorActivePage ? (
              <div className="max-w-xl mx-auto py-16 text-center space-y-4">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                <div className="space-y-1.5">
                  <h3 className="text-red-200 font-bold uppercase text-sm tracking-wider">Unreachable Manual Node</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {errorActivePage}
                  </p>
                </div>
                <button
                  onClick={() => loadActivePageDetails(currentUri)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-750"
                >
                  Retry Connection Ping
                </button>
              </div>
            ) : activePage ? (
              <div className="max-w-4xl mx-auto space-y-6 animate-fade-in" id="active-document-canvas">
                
                {/* 2A. Render CATEGORY pages (Index of files/subtopics directories) */}
                {activePage.pageType === 'category' ? (
                  <div className="space-y-5" id="category-folder-browser">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
                      <div className="space-y-1">
                        <span className="text-[10px] text-amber-500 font-mono tracking-wider font-semibold uppercase">TOC SPEC INDEX</span>
                        <h2 className="text-lg md:text-xl font-bold font-sans text-white">
                          {activePage.title || 'Table of Contents'}
                        </h2>
                        <p className="text-xs text-slate-450 leading-relaxed max-w-xl">
                          Select one of the child folders or chapters below to drill deeper.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5" id="category-grid">
                      {activePage.tree && activePage.tree.length > 0 ? (
                        activePage.tree.map((node, i) => {
                          const nodesWithChildren = node.children && node.children.length > 0;
                          
                          return (
                            <div
                              key={`${node.label}-${node.uri}-${i}`}
                              onClick={() => handleSelectNode(node)}
                              className="group rounded-xl border border-slate-850 bg-slate-900/60 p-4 hover:border-amber-500/40 hover:bg-slate-900 cursor-pointer transition shadow hover:shadow-lg flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-lg ${
                                  nodesWithChildren 
                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/15' 
                                    : 'bg-slate-800 text-slate-400 border border-slate-750'
                                }`}>
                                  {nodesWithChildren ? <FolderPlus className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                                    {node.label}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">
                                    {nodesWithChildren ? `${node.children.length} sub-sections` : 'Procedure Manual'}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transform group-hover:translate-x-1 duration-150 shrink-0" />
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-12 text-center rounded-xl border border-slate-850 border-dashed">
                          <HelpCircle className="w-8 h-8 text-slate-650 mx-auto mb-2" />
                          <p className="text-xs text-slate-500">No child topics reside within this folder node.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  
                  // 2B. Render CONTENT pages (Procedure diagrams + lists)
                  <div className="space-y-6" id="procedure-reader-content">
                    {/* Header */}
                    <div className="border-b border-slate-800 pb-4">
                      <span className="text-[10px] text-amber-500 font-mono tracking-widest font-semibold uppercase">ACTIVE PROCEDURE MODULE</span>
                      <h2 className="text-xl md:text-2xl font-black font-sans text-white tracking-tight mt-0.5">
                        {activePage.title}
                      </h2>
                    </div>

                    {/* Sequential Block Renderer */}
                    <div className="space-y-5">
                      {activePage.blocks && activePage.blocks.length > 0 ? (
                        activePage.blocks.map((block: Block, blockIdx: number) => {
                          
                          // RENDER HEADING
                          if (block.type === 'heading') {
                            return (
                              <h3 
                                key={`heading-${blockIdx}`}
                                className="text-sm md:text-base font-bold text-amber-500 uppercase tracking-wider font-sans border-l-3 border-amber-500 pl-3 pt-0.5 pb-0.5 mt-8 bg-slate-900/25 p-2 rounded-r-lg"
                              >
                                {block.text}
                              </h3>
                            );
                          }

                          // RENDER TEXT
                          if (block.type === 'text') {
                            // Highlight torque specification metrics if seen!
                            const text = block.text;
                            const hasTorque = /[\d.]+[\s]*(?:Nm|N-m|N·m|lb-ft|lb-in|foot-pounds|torque|spec)/i.test(text);
                            
                            return (
                              <p 
                                key={`text-${blockIdx}`}
                                className={`text-sm leading-relaxed text-slate-355 font-sans ${
                                  hasTorque 
                                    ? 'bg-amber-950/20 border border-amber-800/20 p-3 rounded-lg text-amber-100 font-semibold spec-number font-mono'
                                    : ''
                                }`}
                              >
                                {text}
                              </p>
                            );
                          }

                          // RENDER STEPS CHECKLIST
                          if (block.type === 'steps') {
                            const completedCount = Object.values(completedSteps).filter(Boolean).length;
                            const totalSteps = block.items.length;
                            const isFinished = completedCount === totalSteps && totalSteps > 0;

                            return (
                              <div 
                                key={`steps-${blockIdx}`} 
                                className="rounded-xl border border-slate-850 bg-slate-900/35 overflow-hidden"
                              >
                                {/* Steps Checklist Header */}
                                <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-850 select-none">
                                  <div className="flex items-center gap-2">
                                    <CheckSquare className="w-4.5 h-4.5 text-amber-500" />
                                    <span className="text-xs font-mono font-bold uppercase text-slate-300 tracking-wider">
                                      Interactive Checklist Task
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-450 px-2 py-0.5 rounded">
                                      {completedCount} / {totalSteps} COMPLETE
                                    </span>
                                    {totalSteps > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setCompletedSteps({})}
                                        className="text-[9px] text-amber-500 hover:text-amber-450 font-mono tracking-wider font-extrabold uppercase bg-slate-900/50 hover:bg-slate-900 px-1.5 py-0.5 rounded transition"
                                      >
                                        RESET
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* List rows */}
                                <div className="divide-y divide-slate-850/80">
                                  {block.items.map((step, sIdx) => {
                                    const isDone = !!completedSteps[sIdx];
                                    
                                    return (
                                      <div
                                        key={`step-${sIdx}`}
                                        onClick={() => toggleStepCompleted(sIdx)}
                                        className={`group/step p-4 flex items-start gap-3.5 cursor-pointer hover:bg-slate-900/80 transition-colors ${
                                          isDone ? 'bg-slate-950/20' : ''
                                        }`}
                                      >
                                        {/* Styled Checkbox box */}
                                        <div className="mt-0.5 shrink-0 select-none">
                                          {isDone ? (
                                            <div className="w-5 h-5 rounded border border-amber-500 bg-amber-500/20 flex items-center justify-center text-amber-400">
                                              <CheckSquare className="w-3.5 h-3.5" />
                                            </div>
                                          ) : (
                                            <div className="w-5 h-5 rounded border border-slate-700 bg-slate-950 flex items-center justify-center text-transparent group-hover/step:border-amber-500/50 group-hover/step:text-slate-600 transition">
                                              <Square className="w-3.5 h-3.5" />
                                            </div>
                                          )}
                                        </div>

                                        {/* Step Instruction text content */}
                                        <div className="flex-1 space-y-1">
                                          <div className="flex items-center gap-1.5 select-none">
                                            <span className="text-[11px] font-bold font-mono text-amber-500/70">
                                              STEP {(sIdx + 1).toString().padStart(2, '0')}
                                            </span>
                                            {isDone && (
                                              <span className="text-[9px] bg-green-950 text-green-400 font-mono px-1 rounded uppercase tracking-wider font-bold">
                                                Locked
                                              </span>
                                            )}
                                          </div>
                                          <p className={`text-slate-250 text-xs md:text-sm font-sans ${isDone ? 'line-through text-slate-500' : ''}`}>
                                            {step}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Banner checklist complete */}
                                {isFinished && (
                                  <div className="bg-green-950/20 border-t border-green-850/50 p-4 text-center text-green-300 text-xs flex items-center justify-center gap-2 font-medium font-sans">
                                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                    <span>Task steps checklists completely ticked off! All systems verified clear.</span>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // RENDER IMAGE DIAGRAM
                          if (block.type === 'image') {
                            const proxiedSrc = api.getImageUrl(block.src);
                            
                            return (
                              <div 
                                key={`image-${blockIdx}`}
                                className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 text-center max-w-2xl mx-auto cursor-zoom-in"
                                onClick={() => {
                                  setLightboxSrc(proxiedSrc);
                                  setLightboxAlt(activePage.title);
                                }}
                              >
                                <img
                                  src={proxiedSrc}
                                  alt={activePage.title}
                                  referrerPolicy="no-referrer"
                                  className="max-h-96 object-contain rounded mx-auto filter bg-slate-950/70 pointer-events-none group-hover:brightness-105 duration-150"
                                />
                                
                                {/* Hover magnifying overlay */}
                                <div className="absolute inset-2 bg-slate-950/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs gap-2 font-mono uppercase tracking-wider font-bold select-none rounded">
                                  <Eye className="w-5 h-5 text-amber-500" />
                                  <span>Inspect Technical Blueprint</span>
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })
                      ) : (
                        <div className="text-center py-16">
                          <HelpCircle className="w-10 h-10 text-slate-650 mx-auto" />
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

      {/* 3. FULL-SCREEN LIGHTBOX */}
      <Lightbox
        isOpen={lightboxSrc !== null}
        imageSrc={lightboxSrc || ''}
        imageAlt={lightboxAlt}
        onClose={() => setLightboxSrc(null)}
      />

      {/* 4. NICKNAME BOOKMARK MODAL */}
      {showNicknameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 text-slate-100 overflow-hidden shadow-2xl">
            <div className="bg-slate-950 border-b border-slate-850 p-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white font-mono">Bookmark Vehicle Profile</h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="space-y-1.5 focus-within:text-amber-500">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">
                  Profile Nickname (e.g. Mum's SUV, Daily Beater)
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="Insert custom profile identification nickname..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 text-sm px-3.5 py-2.5 text-slate-250 focus:border-amber-500 focus:ring-1 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="bg-slate-950/50 border border-slate-850 p-3 rounded-lg text-xs leading-relaxed text-slate-400 flex gap-2">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p>This links the technical manuals profile inside your workshop home dashboard for speedy offline lookup.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 border-t border-slate-850 flex items-center justify-end gap-3">
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

    </div>
  );
}
