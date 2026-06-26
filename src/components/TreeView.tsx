/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CategoryTreeNode, CategoryTreeLink, PageResponse } from '../types';
import { api, getApiBase } from '../lib/api';
import { 
  Folder, ChevronRight, ChevronDown, FileText, Search, X, Loader2, 
  Wrench, Image, ClipboardList, CheckSquare, Compass, Info, Sliders, Hammer, ShieldAlert
} from 'lucide-react';

interface TreeViewProps {
  rootTitle: string;
  rootTree: CategoryTreeNode[];
  baseUri: string; // the URI that was fetched to get rootTree — needed to resolve hrefs
  activeUri?: string; // currently selected page URI to highlight
  onNavigateToContent: (page: PageResponse, uri: string) => void;
  onNavigateToUnknown: (page: PageResponse, uri: string) => void;
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
  
  // Tracking expanded categories by their unique pathKey
  const [expandedNodes, setExpandedNodes] = useState<{ [key: string]: boolean }>({});
  const [fetchingUri, setFetchingUri] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search box state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoundItem[]>([]);

  // Pre-expand first level categories on mount
  useEffect(() => {
    const initialExpanded: { [key: string]: boolean } = {};
    rootTree.forEach((node) => {
      if (node.type === 'category') {
        initialExpanded[node.title] = true;
      }
    });
    setExpandedNodes(initialExpanded);
    setSearchQuery('');
    setDebouncedQuery('');
    setFetchError(null);
  }, [baseUri, rootTree]);

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

  const toggleExpand = (pathKey: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [pathKey]: !prev[pathKey]
    }));
  };

  // Helper to expand all categories recursively
  const handleExpandAll = () => {
    const newExpanded: { [key: string]: boolean } = {};
    const recExpand = (nodes: CategoryTreeNode[], parentPathKey: string) => {
      nodes.forEach((node) => {
        if (node.type === 'category') {
          const pathKey = parentPathKey ? `${parentPathKey}/${node.title}` : node.title;
          newExpanded[pathKey] = true;
          recExpand(node.children, pathKey);
        }
      });
    };
    recExpand(rootTree, '');
    setExpandedNodes(newExpanded);
  };

  // Helper to collapse all categories
  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  // Fetch document page link click
  const handleLinkClick = async (node: CategoryTreeLink, currentBaseUri: string) => {
    if (!node.href) return; // Ignore links with empty href

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
        onNavigateToContent(response, resolvedUri);
      } else if (response.pageType === 'unknown') {
        onNavigateToUnknown(response, resolvedUri);
      }
    } catch (err: any) {
      console.error('Failed to fetch node detail', err);
      setFetchError(err.message || "Can't download content of this procedure page right now.");
    } finally {
      setFetchingUri(null);
    }
  };

  const isSearching = searchQuery.trim() !== '';

  // Recursive Tree Node Renderer (Inline nested elements, perfect sidebar file-browser feel)
  const renderNode = (node: CategoryTreeNode, index: number, depth: number, parentPathKey: string, currentBaseUri: string) => {
    const pathKey = parentPathKey ? `${parentPathKey}/${node.title}` : node.title;
    const isExpanded = !!expandedNodes[pathKey];

    if (node.type === 'category') {
      const childrenCount = node.children.length;
      
      const handleCategoryClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleExpand(pathKey);
      };

      return (
        <div key={`cat-${pathKey}-${index}`} className="space-y-0.5">
          <button
            type="button"
            onClick={handleCategoryClick}
            style={{ paddingLeft: `${depth * 10 + 6}px` }}
            className="w-full flex items-center justify-between text-left py-1 hover:bg-slate-800/40 text-slate-350 hover:text-slate-100 rounded transition duration-150 cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="shrink-0 text-slate-500 group-hover:text-amber-500 transition duration-150">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
              <Folder className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
              <span className="text-slate-200 text-xs font-semibold truncate leading-tight select-none">
                {node.title}
              </span>
            </div>
            <span className="text-[8px] font-mono bg-bg-theme border border-border-theme px-1.5 py-0.2 rounded text-slate-500 select-none scale-90">
              {childrenCount}
            </span>
          </button>

          {isExpanded && (
            <div className="space-y-0.5 border-l border-slate-800/60 ml-3 pl-1.5 animate-fade-in">
              {node.children.map((child, i) => renderNode(child, i, depth + 1, pathKey, currentBaseUri))}
            </div>
          )}
        </div>
      );
    } else {
      // Leaf link node
      const resolvedUri = resolveHref(currentBaseUri, node.href);
      const isCurrentActive = activeUri === resolvedUri;
      const isLoading = fetchingUri === resolvedUri;
      const LinkIcon = getSemanticIcon(node.icon);

      return (
        <button
          key={`link-${node.title}-${index}`}
          type="button"
          disabled={fetchingUri !== null}
          onClick={() => handleLinkClick(node, currentBaseUri)}
          style={{ paddingLeft: `${depth * 10 + 20}px` }}
          className={`w-full flex items-center justify-between text-left py-1 pr-1.5 rounded transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed group border-l-2 ${
            isCurrentActive 
              ? 'bg-amber-500/10 border-l-amber-500 text-amber-400 font-bold'
              : 'bg-transparent border-l-transparent hover:bg-slate-800/40 text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <LinkIcon className={`w-3.5 h-3.5 shrink-0 ${
              isLoading ? 'text-amber-500 animate-spin' : isCurrentActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-500 transition duration-150'
            }`} />
            <span className="text-xs truncate font-sans font-medium leading-tight">
              {node.title}
            </span>
          </div>
          {isLoading && (
            <Loader2 className="w-3 h-3 text-amber-500 animate-spin shrink-0 ml-1" />
          )}
        </button>
      );
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-3.5" id="category-tree-panel">
      
      {/* 1. Directory Search Input */}
      <div className="space-y-2 select-none shrink-0 px-1">
        <div className="flex items-center justify-between">
          <label className="block text-[9px] font-mono tracking-widest uppercase text-amber-500 font-bold">
            Chapter Directory
          </label>
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase text-slate-500">
            <button 
              type="button" 
              onClick={handleExpandAll}
              className="hover:text-amber-500 transition cursor-pointer"
            >
              Expand All
            </button>
            <span>•</span>
            <button 
              type="button" 
              onClick={handleCollapseAll}
              className="hover:text-amber-500 transition cursor-pointer"
            >
              Collapse
            </button>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter sections..."
            className="w-full rounded-lg border border-border-theme bg-bg-theme hover:border-slate-700 pl-9 pr-9 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition font-sans"
            id="tree-search-input"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 p-0.5 rounded-full hover:bg-surface-theme text-slate-400 hover:text-white transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="bg-red-950/20 border border-red-900/30 text-red-200 rounded-lg p-3 text-xs leading-relaxed flex items-start gap-2 animate-fade-in mx-1 shrink-0">
          <span className="text-red-400 font-bold mt-0.5">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold">{fetchError}</p>
            <p className="text-[10px] text-slate-500 mt-1">Check manual server connection.</p>
          </div>
        </div>
      )}

      {/* 2. Content Directory Tree */}
      <div className="flex-1 overflow-y-auto px-1 pr-1 min-h-0" id="tree-container">
        {!isSearching ? (
          <div className="space-y-1 py-1" id="tree-level-list">
            {rootTree && rootTree.length > 0 ? (
              rootTree.map((node, i) => renderNode(node, i, 0, '', baseUri))
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs font-sans">
                No active items found here.
              </div>
            )}
          </div>
        ) : (
          // 3. Search results (Flat list matching links)
          <div className="space-y-1 animate-fade-in py-1" id="tree-search-results">
            <div className="flex items-center justify-between px-1.5 pb-2 border-b border-border-theme/40 select-none">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Found {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
              </span>
            </div>

            <div className="space-y-0.5 pt-2">
              {searchResults.length > 0 ? (
                searchResults.slice(0, 50).map((item, idx) => {
                  const resolvedUri = resolveHref(baseUri, item.node.href);
                  const isLoading = fetchingUri === resolvedUri;
                  const isCurrentActive = activeUri === resolvedUri;
                  const LinkIcon = getSemanticIcon(item.node.icon);
                  
                  return (
                    <button
                      key={`search-${item.node.title}-${idx}`}
                      type="button"
                      disabled={fetchingUri !== null}
                      onClick={() => handleLinkClick(item.node, baseUri)}
                      className={`w-full flex items-center justify-between text-left p-2 rounded-lg border-l-2 transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed group ${
                        isCurrentActive 
                          ? 'bg-amber-500/10 border-l-amber-500 text-amber-400 font-semibold'
                          : 'bg-transparent border-l-transparent hover:border-l-amber-500 hover:bg-[#1a1c24] text-slate-350 hover:text-white'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <LinkIcon className={`w-3.5 h-3.5 shrink-0 ${
                            isLoading ? 'text-amber-500 animate-pulse' : isCurrentActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-amber-400'
                          }`} />
                          <span className="text-xs font-bold truncate">
                            {item.node.title}
                          </span>
                        </div>
                        
                        {/* Folder nesting paths subtitle */}
                        {item.path.length > 0 && (
                          <p className="text-[9px] text-slate-500 font-mono truncate pl-5.5 max-w-full">
                            {item.path.join(' › ')}
                          </p>
                        )}
                      </div>
                      
                      <div className="shrink-0">
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition duration-100" />
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs font-sans select-none">
                  <p className="font-semibold text-slate-400">No matches found.</p>
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
    </div>
  );
}
