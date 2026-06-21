/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CategoryTreeNode, CategoryTreeLink, ContentPage, UnknownPage, ParsedPage } from '../types';
import { api, getApiBase } from '../lib/api';
import { 
  Folder, ChevronRight, FileText, Search, X, Loader2, 
  Wrench, Image, ClipboardList, CheckSquare, Compass, Info, Sliders, Hammer, ShieldAlert
} from 'lucide-react';

interface TreeViewProps {
  rootTitle: string;
  rootTree: CategoryTreeNode[];
  baseUri: string; // the URI that was fetched to get rootTree — needed to resolve hrefs
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
    <div className="w-full bg-[#101116]/45 border border-slate-700/60 backdrop-blur-md rounded-2xl p-4 md:p-6 shadow-2xl space-y-5" id="category-tree-panel">
      
      {/* 1. Directory Search Input */}
      <div className="space-y-1.5 select-none">
        <label className="block text-[10px] font-mono tracking-widest uppercase text-amber-500 font-bold">
          Quick-Filter & Direct Finder
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search this section... e.g. Relays, Engine, Diagram"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 hover:border-slate-500 pl-10 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition font-sans"
            id="tree-search-input"
          />
          <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3.5 p-0.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="bg-red-950/30 border border-red-900/40 text-red-200 rounded-lg p-3 text-xs leading-relaxed flex items-start gap-2 animate-fade-in">
          <span className="text-red-400 font-bold mt-0.5">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold">{fetchError}</p>
            <p className="text-[10px] text-slate-400 mt-1">Make sure the manual server is reachable on your offline network.</p>
          </div>
        </div>
      )}

      {/* 2. Interactive Navigation Trail (Only if not flat searching) */}
      {!isSearching ? (
        <div className="space-y-4">
          <nav aria-label="Tree Directory Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-400 font-sans font-medium bg-slate-950/50 rounded-lg p-3 border border-slate-800">
            {stack.map((entry, idx) => {
              const isLast = idx === stack.length - 1;
              return (
                <React.Fragment key={`${entry.title}-${idx}`}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 select-none" />}
                  {isLast ? (
                    <span className="text-amber-400 font-bold max-w-[180px] md:max-w-xs truncate" title={entry.title}>
                      {entry.title}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBreadcrumbClick(idx)}
                      className="hover:text-amber-500 transition duration-150 max-w-[120px] md:max-w-xs truncate text-slate-300"
                    >
                      {entry.title}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* 3A. Category Normal Content Rows list */}
          <div className="divide-y divide-slate-800/60 border border-slate-800 bg-slate-950/30 rounded-xl overflow-hidden shadow-inner max-h-[500px] overflow-y-auto" id="tree-level-list">
            {currentLevel.nodes && currentLevel.nodes.length > 0 ? (
              currentLevel.nodes.map((node, i) => {
                const resolvedUri = node.type === 'link' ? resolveHref(currentBaseUri, node.href) : '';
                const isLoading = node.type === 'link' && fetchingUri === resolvedUri;
                
                if (node.type === 'category') {
                  return (
                    <button
                      key={`${node.title}-${i}`}
                      type="button"
                      onClick={() => handleCategoryClick(node.title, node.children)}
                      className="w-full flex items-center justify-between text-left p-3.5 hover:bg-slate-800/35 transition cursor-pointer group rounded-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Folder className="w-4.5 h-4.5 text-amber-500 shrink-0 group-hover:scale-105 duration-100" />
                        <span className="text-slate-200 text-sm font-semibold truncate group-hover:text-amber-400 duration-150">
                          {node.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 shrink-0">
                        <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">
                          {node.children.length} items
                        </span>
                        <ChevronRight className="w-4 h-4 group-hover:text-amber-400 transform group-hover:translate-x-1 duration-150" />
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
                      className="w-full flex items-center justify-between text-left p-3.5 hover:bg-slate-800/35 transition disabled:opacity-60 disabled:cursor-not-allowed group rounded-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <LinkIcon className={`w-4.5 h-4.5 shrink-0 ${isLoading ? 'text-amber-500' : 'text-slate-400 group-hover:text-amber-400'}`} />
                        <span className="text-slate-250 text-sm truncate group-hover:text-amber-200 font-sans">
                          {node.title}
                        </span>
                      </div>
                      <div className="shrink-0 pl-2">
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white" />
                        )}
                      </div>
                    </button>
                  );
                }
              })
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm font-sans">
                Empty section folder layer. No items present.
              </div>
            )}
          </div>
        </div>
      ) : (
        
        // 3B. Tree-Wide Search results page
        <div className="space-y-3" id="tree-search-results">
          <div className="flex items-center justify-between px-1 select-none">
            <span className="text-xs font-mono text-slate-450 uppercase">
              Found {searchResults.length} manual procedure {searchResults.length === 1 ? 'match' : 'matches'}
            </span>
          </div>

          <div className="divide-y divide-slate-800/60 border border-slate-800 bg-slate-950/30 rounded-xl overflow-hidden shadow-inner max-h-[500px] overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.slice(0, 50).map((item, idx) => {
                const resolvedUri = resolveHref(currentBaseUri, item.node.href);
                const isLoading = fetchingUri === resolvedUri;
                const LinkIcon = getSemanticIcon(item.node.icon);
                
                return (
                  <button
                    key={`${item.node.title}-${idx}`}
                    type="button"
                    disabled={fetchingUri !== null}
                    onClick={() => handleLinkClick(item.node)}
                    className="w-full flex items-center justify-between text-left p-3.5 hover:bg-slate-800/35 transition disabled:opacity-60 disabled:cursor-not-allowed group rounded-none"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <LinkIcon className={`w-4 h-4 shrink-0 ${isLoading ? 'text-amber-500 animate-pulse' : 'text-slate-450 group-hover:text-amber-400'}`} />
                        <span className="text-slate-200 text-sm font-bold truncate group-hover:text-amber-200 transition-colors font-sans">
                          {item.node.title}
                        </span>
                      </div>
                      
                      {/* Folder nesting paths subtitle */}
                      {item.path.length > 0 && (
                        <p className="text-[10px] text-slate-500 font-mono font-medium truncate pl-6 max-w-full">
                          {item.path.join(' › ')}
                        </p>
                      )}
                    </div>
                    
                    <div className="shrink-0">
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-650 group-hover:text-white" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-500 text-sm font-sans select-none">
                <p className="font-semibold">No quick-finder matches found.</p>
                <p className="text-xs text-slate-600 mt-1">Check spelling or search for wider category keywords.</p>
              </div>
            )}
            
            {searchResults.length > 50 && (
              <div className="p-3 bg-slate-950/60 text-center text-slate-500 text-[10px] font-mono tracking-wide uppercase select-none border-t border-slate-800">
                And {searchResults.length - 50} more results. Refine your search string for specificity.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
