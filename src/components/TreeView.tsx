/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CategoryTreeNode, CategoryTreeLink } from '../types';
import { 
  Folder, ChevronRight, ChevronDown, FileText, Search, X, 
  Wrench, Image, ClipboardList, CheckSquare, Compass, Info, Sliders, Hammer, ShieldAlert
} from 'lucide-react';

interface TreeViewProps {
  rootTitle: string;
  rootTree: CategoryTreeNode[];
  baseUri: string;
  activeUri?: string;
  onSelectUri: (uri: string, node: CategoryTreeNode) => void;
  dynamicChildren?: Record<string, CategoryTreeNode[]>;
  navigateOnCategoryClick?: boolean;
  // Sequence of category node titles (e.g. ["Standard Procedure", "Standard Procedure -
  // Base Brake Bleeding"]) from a "#..." mid-path deep link that pointed at a nested section
  // within this page's own tree rather than a separate fetchable page. Auto-expands the
  // ancestor folders leading to that section and highlights/scrolls to it, the same way
  // activeUri does for a real leaf page — but matched by title path instead of resolved href,
  // since a category folder has no href of its own.
  activeCategoryPath?: string[];
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
  if (!href || href.startsWith('#')) {
    return ''; // hash anchors and empty hrefs are not real navigable pages
  }
  if (href.startsWith('/')) {
    return href; // already absolute from site root, use as-is
  }
  return baseUri.split('#')[0] + href; // relative, concatenate
}

export default function TreeView({
  rootTitle,
  rootTree,
  baseUri,
  activeUri,
  onSelectUri,
  dynamicChildren = {},
  navigateOnCategoryClick = false,
  activeCategoryPath,
}: TreeViewProps) {

  // Tracking expanded categories by their unique pathKey
  const [expandedNodes, setExpandedNodes] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  // pathKey of the category node matched by activeCategoryPath, for highlight + scroll.
  const [activeCategoryPathKey, setActiveCategoryPathKey] = useState<string | null>(null);

  // Reset states on rootTree change
  useEffect(() => {
    setExpandedNodes({});
    setSearchQuery('');
    setActiveCategoryPathKey(null);
  }, [baseUri, rootTree]);

  // Toggle expanded folder
  const toggleExpand = (pathKey: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [pathKey]: !prev[pathKey]
    }));
  };

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-expand parent folders of the active leaf node when activeUri changes
  useEffect(() => {
    if (!activeUri || !rootTree || rootTree.length === 0) return;

    const parentKeysToExpand: string[] = [];

    function findActivePath(nodes: CategoryTreeNode[], parentPathKey: string, currentBaseUri: string): boolean {
      for (const node of nodes) {
        const pathKey = parentPathKey ? `${parentPathKey}/${node.title}` : node.title;
        const resolvedUri = node.type === 'link' && node.href && !node.href.startsWith('#') ? resolveHref(currentBaseUri, node.href) : '';
        const dynamicChildrenList = (node.type === 'link' && resolvedUri && dynamicChildren && dynamicChildren[resolvedUri]) || null;

        if (node.type === 'category' || dynamicChildrenList) {
          const children = node.type === 'category' ? node.children : dynamicChildrenList!;
          const nextBaseUri = node.type === 'category' ? currentBaseUri : resolvedUri;

          const categoryUri = node.type === 'link' ? resolvedUri : '';
          if (categoryUri && categoryUri === activeUri) {
            return true;
          }

          const found = findActivePath(children, pathKey, nextBaseUri);
          if (found) {
            parentKeysToExpand.push(pathKey);
            return true;
          }
        } else {
          // Leaf link node
          if (resolvedUri && resolvedUri === activeUri) {
            return true;
          }
        }
      }
      return false;
    }

    findActivePath(rootTree, '', baseUri);

    if (parentKeysToExpand.length > 0) {
      setExpandedNodes(prev => {
        const next = { ...prev };
        let changed = false;
        parentKeysToExpand.forEach(key => {
          if (!next[key]) {
            next[key] = true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [activeUri, rootTree, baseUri, dynamicChildren]);

  // Auto-expand + highlight the nested category section pointed at by a "#..." mid-path deep
  // link. Purely additive to the activeUri matching above: a fragment target is a category
  // folder with no href of its own, so it's matched by walking node.title down
  // activeCategoryPath rather than by resolved href.
  useEffect(() => {
    if (!activeCategoryPath || activeCategoryPath.length === 0 || !rootTree || rootTree.length === 0) {
      setActiveCategoryPathKey(null);
      return;
    }

    let matchedPathKey: string | null = null;
    const parentKeysToExpand: string[] = [];

    function findCategoryPath(nodes: CategoryTreeNode[], parentPathKey: string, remaining: string[]): boolean {
      for (const node of nodes) {
        if (node.type !== 'category') continue;
        const pathKey = parentPathKey ? `${parentPathKey}/${node.title}` : node.title;

        if (node.title === remaining[0]) {
          if (remaining.length === 1) {
            matchedPathKey = pathKey;
            parentKeysToExpand.push(pathKey);
            return true;
          }
          if (findCategoryPath(node.children, pathKey, remaining.slice(1))) {
            parentKeysToExpand.push(pathKey);
            return true;
          }
        }

        // Also try descending with the same remaining path unmatched — trees often have a
        // synthetic wrapper category matching the base page's own title before the "real"
        // structure named in the fragment begins, so the match may start one level deeper.
        if (findCategoryPath(node.children, pathKey, remaining)) {
          parentKeysToExpand.push(pathKey);
          return true;
        }
      }
      return false;
    }

    findCategoryPath(rootTree, '', activeCategoryPath);

    if (parentKeysToExpand.length > 0) {
      setExpandedNodes(prev => {
        const next = { ...prev };
        let changed = false;
        parentKeysToExpand.forEach(key => {
          if (!next[key]) {
            next[key] = true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
    setActiveCategoryPathKey(matchedPathKey);
  }, [activeCategoryPath, rootTree]);

  // Scroll active item smoothly into view
  useEffect(() => {
    if (!activeUri && !activeCategoryPathKey) return;

    const timer = setTimeout(() => {
      if (containerRef.current) {
        const activeEl = containerRef.current.querySelector('[data-active="true"]');
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [activeUri, activeCategoryPathKey, expandedNodes]);

  // Helper to expand all categories recursively
  const handleExpandAll = () => {
    const newExpanded: { [key: string]: boolean } = {};
    const recExpand = (nodes: CategoryTreeNode[], parentPathKey: string, currentBaseUri: string) => {
      nodes.forEach((node) => {
        const resolvedUri = node.type === 'link' && node.href && !node.href.startsWith('#') ? resolveHref(currentBaseUri, node.href) : '';
        const dynamicChildrenList = (node.type === 'link' && resolvedUri && dynamicChildren && dynamicChildren[resolvedUri]) || null;

        if (node.type === 'category' || dynamicChildrenList) {
          const pathKey = parentPathKey ? `${parentPathKey}/${node.title}` : node.title;
          newExpanded[pathKey] = true;
          const children = node.type === 'category' ? node.children : dynamicChildrenList!;
          recExpand(children, pathKey, node.type === 'category' ? currentBaseUri : resolvedUri);
        }
      });
    };
    recExpand(rootTree, '', baseUri);
    setExpandedNodes(newExpanded);
  };

  // Helper to collapse all categories
  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  // Filter tree recursively based on search query
  const filteredTreeData = useMemo(() => {
    if (!searchQuery.trim()) {
      return { tree: rootTree, isFiltered: false, autoExpanded: new Set<string>() };
    }

    const query = searchQuery.toLowerCase();
    const autoExpanded = new Set<string>();
    
    function filterNodes(nodes: CategoryTreeNode[], parentPathKey: string, currentBaseUri: string): CategoryTreeNode[] {
      const filtered: CategoryTreeNode[] = [];

      for (const node of nodes) {
        const pathKey = parentPathKey ? `${parentPathKey}/${node.title}` : node.title;
        const resolvedUri = node.type === 'link' && node.href && !node.href.startsWith('#') ? resolveHref(currentBaseUri, node.href) : '';
        const dynamicChildrenList = (node.type === 'link' && resolvedUri && dynamicChildren && dynamicChildren[resolvedUri]) || null;

        if (node.type === 'category' || dynamicChildrenList) {
          const children = node.type === 'category' ? node.children : dynamicChildrenList!;
          const nextBaseUri = node.type === 'category' ? currentBaseUri : resolvedUri;
          const childFiltered = filterNodes(children, pathKey, nextBaseUri);
          const isMatch = node.title.toLowerCase().includes(query);
          const hasMatchingChildren = childFiltered.length > 0;

          if (isMatch || hasMatchingChildren) {
            filtered.push({
              ...node,
              type: 'category',
              children: childFiltered
            } as any);
            if (hasMatchingChildren) {
              autoExpanded.add(pathKey);
            }
          }
        } else {
          // Leaf node (link)
          if (node.title.toLowerCase().includes(query)) {
            filtered.push(node);
          }
        }
      }
      return filtered;
    }

    const filtered = filterNodes(rootTree, '', baseUri);
    return { tree: filtered, isFiltered: true, autoExpanded };
  }, [rootTree, searchQuery, dynamicChildren, baseUri]);

  const isFiltered = filteredTreeData.isFiltered;
  const displayTree = filteredTreeData.tree;

  // Handle clicking leaf node links
  const handleLinkClick = (node: CategoryTreeLink, resolvedUri: string) => {
    if (!node.href || node.href.startsWith('#')) return; // Header label or anchor only
    
    // Check if it's a download or bundle link
    if (node.icon === '/icons/download.svg' || node.href.startsWith('/bundle/')) {
      const apiBase = localStorage.getItem('car_manual_api_base') || 'http://localhost:4000';
      let downloadOrigin = apiBase;
      try {
        const url = new URL(apiBase);
        url.port = '9090';
        downloadOrigin = url.origin;
      } catch {
        downloadOrigin = 'http://127.0.0.1:9090';
      }
      window.open(`${downloadOrigin}${resolvedUri}`, '_blank');
      return;
    }

    onSelectUri(resolvedUri, node);
  };

  // Recursive Tree Node Renderer
  const renderNode = (node: CategoryTreeNode, index: number, depth: number, parentPathKey: string, currentBaseUri: string) => {
    const pathKey = parentPathKey ? `${parentPathKey}/${node.title}` : node.title;

    // Check if link node has dynamic children
    const resolvedUri = node.type === 'link' && node.href && !node.href.startsWith('#') ? resolveHref(currentBaseUri, node.href) : '';
    const dynamicChildrenList = (node.type === 'link' && resolvedUri && dynamicChildren && dynamicChildren[resolvedUri]) || null;

    if (node.type === 'category' || dynamicChildrenList) {
      const children = node.type === 'category' ? node.children : dynamicChildrenList!;
      const childrenCount = children.length;
      
      const isExpanded = isFiltered
        ? filteredTreeData.autoExpanded.has(pathKey)
        : (expandedNodes[pathKey] !== undefined ? expandedNodes[pathKey] : (dynamicChildrenList ? true : false));

      const isCategoryActive = pathKey === activeCategoryPathKey;

      const handleCategoryClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (navigateOnCategoryClick) {
          // In right-pane mode, category nodes navigate on click instead of expand/collapse
          const categoryUri = resolveHref(currentBaseUri, (node.type === 'link' ? node.href : '') || '');
          if (categoryUri) {
            onSelectUri(categoryUri, node);
          }
          // Also toggle expand so children are visible
          if (!isFiltered) toggleExpand(pathKey);
        } else if (!isFiltered) {
          toggleExpand(pathKey);
        }
      };

      return (
        <div key={`cat-${pathKey}-${index}`} className="space-y-0.5">
          <button
            type="button"
            data-active={isCategoryActive ? "true" : undefined}
            onClick={handleCategoryClick}
            style={{ paddingLeft: `${depth * 12 + 6}px` }}
            className={`w-full flex items-center justify-between text-left py-1 rounded transition duration-150 cursor-pointer group ${
              isCategoryActive
                ? 'bg-amber-500/10 text-amber-400 font-bold shadow-xs'
                : 'hover:bg-slate-800/40 text-slate-350 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`shrink-0 transition duration-150 ${isCategoryActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-500'}`}>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
              <Folder className={`w-3.5 h-3.5 shrink-0 ${isCategoryActive ? 'text-amber-400' : 'text-amber-500/80'}`} />
              <span className={`text-xs font-semibold truncate leading-tight select-none ${isCategoryActive ? 'text-amber-400' : 'text-slate-200'}`}>
                {node.title}
              </span>
            </div>
            <span className="text-[8px] font-mono bg-bg-theme border border-border-theme px-1.5 py-0.2 rounded text-slate-500 select-none scale-90">
              {childrenCount}
            </span>
          </button>

          {isExpanded && children.length > 0 && (
            <div className="space-y-0.5 border-l border-slate-800/60 ml-3 pl-1.5 animate-fade-in">
              {children.map((child, i) => renderNode(child, i, depth + 1, pathKey, node.type === 'category' ? currentBaseUri : resolvedUri))}
            </div>
          )}
        </div>
      );
    } else {
      // Leaf link node
      const isCurrentActive = activeUri === resolvedUri;
      const LinkIcon = getSemanticIcon(node.icon);
      const hasHref = !!node.href;


      if (!hasHref) {
        // This is a section header (label only, not clickable)
        return (
          <div
            key={`header-${node.title}-${index}`}
            style={{ paddingLeft: `${depth * 12 + 16}px` }}
            className="py-1 pr-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-500 select-none cursor-default font-mono"
          >
            {node.title}
          </div>
        );
      }

      return (
        <button
          type="button"
          data-active={isCurrentActive ? "true" : undefined}
          onClick={() => handleLinkClick(node, resolvedUri)}
          style={{ paddingLeft: `${depth * 12 + 16}px` }}
          className={`w-full flex items-center justify-between text-left py-1 pr-1.5 rounded transition duration-150 border-l-2 ${
            isCurrentActive 
              ? 'bg-amber-500/10 border-l-amber-500 text-amber-400 font-bold shadow-xs'
              : 'bg-transparent border-l-transparent hover:bg-slate-800/40 text-slate-400 hover:text-slate-205'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <LinkIcon className={`w-3.5 h-3.5 shrink-0 ${
              isCurrentActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-500 transition duration-150'
            }`} />
            <span className="text-xs truncate font-sans font-medium leading-tight">
              {node.title}
            </span>
          </div>
        </button>
      );
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-3.5" id="category-tree-panel">
      
      {/* 1. Directory Search / Filter Input */}
      <div className="space-y-2 select-none shrink-0 px-1">
        <div className="flex items-center justify-between">
          <label className="block text-[9px] font-mono tracking-widest uppercase text-amber-500 font-bold">
            Chapter Directory
          </label>
          {!isFiltered && (
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
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter section chapters..."
            className="w-full rounded-lg border border-border-theme bg-bg-theme hover:border-slate-700 pl-9 pr-9 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition font-sans"
            id="tree-search-input"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 p-0.5 rounded-full hover:bg-surface-theme text-slate-400 hover:text-white transition cursor-pointer"
              title="Clear filter"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Content Directory Tree */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-1 pr-1 min-h-0" id="tree-container">
        <div className="space-y-1 py-1" id="tree-level-list">
          {displayTree && displayTree.length > 0 ? (
            displayTree.map((node, i) => renderNode(node, i, 0, '', baseUri))
          ) : (
            <div className="p-6 text-center text-slate-500 text-xs font-sans select-none">
              {isFiltered ? 'No matching chapters found.' : 'No active items found here.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
