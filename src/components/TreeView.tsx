/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CategoryTreeNode, CategoryTreeLink, ContentPage, UnknownPage } from '../types';
import { api, getApiBase } from '../lib/api';
import { 
  Folder, ChevronRight, FileText, Search, X, Loader2, 
  Wrench, Image, ClipboardList, CheckSquare, Compass, Info, Sliders, Hammer, ShieldAlert
} from 'lucide-react';

interface TreeViewProps {
  rootTitle: string;
  rootTree: CategoryTreeNode[];
  baseUri: string; // the URI that was fetched to get rootTree — needed to resolve hrefs
  activeUri?: string; // currently selected page URI to highlight
  onNavigateToContent: (page: ContentPage, uri: string) => void;
  onNavigateToUnknown: (page: UnknownPage, uri: string) => void;
}

interface StackEntry {
  title: string;
  nodes: CategoryTreeNode[];
}

interface FoundItem {
  node: CategoryTreeLink;
  path: string[];
}

// Map semantic icons based on common names
const getSemanticIcon = (iconPath: string | null) => {
  if (!iconPath) return FileText;
  const path = iconPath.toLowerCase();
  if (path.includes('service-and-repair') || path.includes('repair')) return Wrench;
  if (path.includes('diagram')) return Image;
  if (path.includes('specification') || path.includes('spec')) return ClipboardList;
  if (path.includes('testing') || path.includes('inspection') || path.includes('test')) return CheckSquare;
  if (path.includes('location')) return Compass;
  if (path.includes('bulletin') || path.includes('tsb') || path.includes('technical-service')) return Info;
  if (path.includes('description') || path.includes('operation')) return FileText;
  if (path.includes('adjustment')) return Sliders;
  if (path.includes('tools') || path.includes('equipment')) return Hammer;
  if (path.includes('precaution')) return ShieldAlert;
  if (path.includes('diagnostic') || path.includes('code') || path.includes('dtc')) return FileText;
  return FileText;
};

function resolveHref(baseUri: string, href: string): string {
  if (href.startsWith('/')) {
    return href; // already absolute from site root, use as-is
  }
  return baseUri + href; // relative, concatenate
}

function getLemonDownloadOrigin(): string {
  const apiBase = getApiBase();
  try {
    const url = new URL(apiBase);
    url.port = '9090';
    return url.origin;
  } catch {
    return 'http://127.0.0.1:9090';
  }
}

export default function TreeView({ 
  rootTitle, 
  rootTree, 
  baseUri, 
  activeUri,
  onNavigateToContent, 
  onNavigateToUnknown 
}: TreeViewProps) {
  
  // Backing stack and base URI track
  const [stack, setStack] = useState<StackEntry[]>([]);
  const [currentBaseUri, setCurrentBaseUri] = useState<string>(baseUri);
  const [fetchingUri, setFetchingUri] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search box state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoundItem[]>([]);

  // Synchronize state with incoming root tree
  useEffect(() => {
    setStack([{ title: rootTitle, nodes: rootTree }]);
    setCurrentBaseUri(baseUri);
    setSearchQuery('');
    setDebouncedQuery('');
    setFetchError(null);
  }, [baseUri, rootTree, rootTitle]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Compute search results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const recSearch = (nodes: CategoryTreeNode[], query: string, pathAcc: string[]): FoundItem[] => {
      let results: FoundItem[] = [];
      const q = query.toLowerCase();

      for (const node of nodes) {
        if (node.type === 'category') {
          results = results.concat(
            recSearch(node.children, query, [...pathAcc, node.title])
          );
        } else if (node.type === 'link') {
          if (node.title.toLowerCase().includes(q)) {
            results.push({ node, path: pathAcc });
          }
        }
      }
      return results;
    };

    const results = recSearch(rootTree, debouncedQuery, []);
    setSearchResults(results);
  }, [debouncedQuery, rootTree]);

  // Handle clicking on folders (drill-down)
  const handleCategoryClick = (title: string, children: CategoryTreeNode[]) => {
    setStack((prev) => [...prev, { title, nodes: children }]);
  };

  // Truncate stack back to chosen depth
  const handleBreadcrumbClick = (index: number) => {
    setStack((prev) => prev.slice(0, index + 1));
  };

  // Fetch document page link click
  const handleLinkClick = async (node: CategoryTreeLink) => {
    if (node.icon === '/icons/download.svg' || node.href.startsWith('/bundle/')) {
      const resolvedUrl = resolveHref(currentBaseUri, node.href);
      const downloadOrigin = getLemonDownloadOrigin();
      window.open(`${downloadOrigin}${resolvedUrl}`, '_blank');
      return; // don't attempt to fetch/parse as a page
    }

    const resolvedUri = resolveHref(currentBaseUri, node.href);
    setFetchingUri(resolvedUri);
    setFetchError(null);

    try {
      const response = await api.getPage(resolvedUri);

      if (response.pageType === 'content') {
        onNavigateToContent(response, resolvedUri);
      } else if (response.pageType === 'category') {
        // Fresh tree root transition
        setStack([{ title: response.title || 'Sub-Index', nodes: response.tree }]);
        setCurrentBaseUri(resolvedUri);
      } else if (response.pageType === 'unknown') {
        onNavigateToUnknown(response, resolvedUri);
      }
    } catch (err: any) {
      console.error('Failed to fetch node detail', err);
      setFetchError(err.message || 'Can\'t download content of this procedure page right now.');
    } finally {
      setFetchingUri(null);
    }
  };

  // Get currently displayed folder layer metadata
  const currentLevel = stack[stack.length - 1] || { title: rootTitle, nodes: [] };
  const isSearching = searchQuery.trim() !== '';

  return (
    <div className="w-full space-y-4" id="category-tree-panel">
      
      {/* 1. Directory Search Input */}
      <div className="space-y-1 select-none">
        <label className="block text-[9px] font-mono tracking-widest uppercase text-amber-500 font-bold">
          Chapter Search
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter sections..."
            className="w-full rounded-lg border border-[#1e2028] bg-[#0a0a0f] hover:border-slate-700 pl-9 pr-9 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition font-sans"
            id="tree-search-input"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 p-0.5 rounded-full hover:bg-[#1a1c24] text-slate-400 hover:text-white transition"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="bg-red-950/20 border border-red-900/30 text-red-200 rounded-lg p-3 text-xs leading-relaxed flex items-start gap-2 animate-fade-in">
          <span className="text-red-400 font-bold mt-0.5">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold">{fetchError}</p>
            <p className="text-[10px] text-slate-500 mt-1">Check manual server connection.</p>
          </div>
        </div>
      )}

      {/* 2. Interactive Navigation Trail (Only if not flat searching) */}
      {!isSearching ? (
        <div className="space-y-3">
          {stack.length > 1 && (
            <nav aria-label="Tree Directory Breadcrumb" className="flex flex-wrap items-center gap-1 text-[11px] text-slate-400 font-sans font-medium bg-[#13141a] rounded-lg p-2.5 border border-[#1e2028] shadow-sm select-none">
              {stack.map((entry, idx) => {
                const isLast = idx === stack.length - 1;
                return (
                  <React.Fragment key={`${entry.title}-${idx}`}>
                    {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-650 shrink-0 select-none" />}
                    {isLast ? (
                      <span className="text-amber-500 font-bold max-w-[140px] truncate" title={entry.title}>
                        {entry.title}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBreadcrumbClick(idx)}
                        className="hover:text-amber-500 transition duration-150 max-w-[100px] truncate text-slate-300"
                      >
                        {entry.title}
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          )}

          {/* 3A. Category Normal Content Rows list */}
          <div className="space-y-1 max-h-[550px] overflow-y-auto pr-1" id="tree-level-list">
            {currentLevel.nodes && currentLevel.nodes.length > 0 ? (
              currentLevel.nodes.map((node, i) => {
                const resolvedUri = node.type === 'link' ? resolveHref(currentBaseUri, node.href) : '';
                const isLoading = node.type === 'link' && fetchingUri === resolvedUri;
                const isCurrentActive = node.type === 'link' && activeUri === resolvedUri;
                
                if (node.type === 'category') {
                  return (
                    <button
                      key={`${node.title}-${i}`}
                      type="button"
                      onClick={() => handleCategoryClick(node.title, node.children)}
                      className="w-full flex items-center justify-between text-left p-2.5 bg-transparent hover:bg-[#1a1c24] border-l-2 border-l-transparent hover:border-l-amber-500 text-slate-300 hover:text-white rounded-lg transition duration-150 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Folder className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-105 transition" />
                        <span className="text-slate-200 text-xs font-semibold truncate">
                          {node.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
                        <span className="text-[9px] font-mono bg-[#13141a] px-1.5 py-0.5 rounded text-slate-400">
                          {node.children.length}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:text-amber-500 transform group-hover:translate-x-0.5 transition duration-150" />
                      </div>
                    </button>
                  );
                } else {
                  const LinkIcon = getSemanticIcon(node.icon);
                  return (
                    <button
                      key={`${node.title}-${i}`}
                      type="button"
                      disabled={fetchingUri !== null}
                      onClick={() => handleLinkClick(node)}
                      className={`w-full flex items-center justify-between text-left p-2.5 rounded-lg border-l-2 transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed group ${
                        isCurrentActive 
                          ? 'bg-amber-500/10 border-l-amber-500 text-amber-500 font-medium'
                          : 'bg-transparent border-l-transparent hover:border-l-amber-500 hover:bg-[#1a1c24] text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <LinkIcon className={`w-4 h-4 shrink-0 ${
                          isLoading ? 'text-amber-500 animate-spin' : isCurrentActive ? 'text-amber-500' : 'text-slate-400 group-hover:text-amber-500'
                        }`} />
                        <span className="text-xs truncate font-sans">
                          {node.title}
                        </span>
                      </div>
                      <div className="shrink-0 pl-1">
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white transition" />
                        )}
                      </div>
                    </button>
                  );
                }
              })
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs font-sans">
                No active items found here.
              </div>
            )}
          </div>
        </div>
      ) : (
        
        // 3B. Tree-Wide Search results page
        <div className="space-y-2 animate-fade-in" id="tree-search-results">
          <div className="flex items-center justify-between px-1 select-none">
            <span className="text-[10px] font-mono text-slate-400 uppercase">
              Found {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
            </span>
          </div>

          <div className="space-y-1 max-h-[550px] overflow-y-auto pr-1">
            {searchResults.length > 0 ? (
              searchResults.slice(0, 50).map((item, idx) => {
                const resolvedUri = resolveHref(currentBaseUri, item.node.href);
                const isLoading = fetchingUri === resolvedUri;
                const isCurrentActive = activeUri === resolvedUri;
                const LinkIcon = getSemanticIcon(item.node.icon);
                
                return (
                  <button
                    key={`${item.node.title}-${idx}`}
                    type="button"
                    disabled={fetchingUri !== null}
                    onClick={() => handleLinkClick(item.node)}
                    className={`w-full flex items-center justify-between text-left p-2.5 rounded-lg border-l-2 transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed group ${
                      isCurrentActive 
                        ? 'bg-amber-500/10 border-l-amber-500 text-amber-500 font-medium'
                        : 'bg-transparent border-l-transparent hover:border-l-amber-500 hover:bg-[#1a1c24] text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <LinkIcon className={`w-3.5 h-3.5 shrink-0 ${
                          isLoading ? 'text-amber-500 animate-pulse' : isCurrentActive ? 'text-amber-500' : 'text-slate-400 group-hover:text-amber-400'
                        }`} />
                        <span className="text-xs font-bold truncate">
                          {item.node.title}
                        </span>
                      </div>
                      
                      {/* Folder nesting paths subtitle */}
                      {item.path.length > 0 && (
                        <p className="text-[9px] text-slate-500 font-mono truncate pl-5 max-w-full">
                          {item.path.join(' › ')}
                        </p>
                      )}
                    </div>
                    
                    <div className="shrink-0">
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs font-sans select-none">
                <p className="font-semibold">No matches found.</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Try another keyword filter.</p>
              </div>
            )}
            
            {searchResults.length > 50 && (
              <div className="p-2 bg-[#13141a]/60 text-center text-slate-500 text-[9px] font-mono uppercase tracking-wide border-t border-[#1e2028]">
                +{searchResults.length - 50} more. Refine keyword.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
