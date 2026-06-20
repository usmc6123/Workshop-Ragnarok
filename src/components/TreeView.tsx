/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TreeItem } from '../types';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';

interface TreeViewProps {
  tree: TreeItem[];
  selectedUri: string | null;
  onSelectNode: (node: TreeItem) => void;
}

export default function TreeView({ tree, selectedUri, onSelectNode }: TreeViewProps) {
  return (
    <ul className="space-y-1 py-1 text-sm select-none" id="sidebar-tree">
      {tree.map((item, idx) => (
        <TreeNode
          key={`${item.label}-${item.uri}-${idx}`}
          item={item}
          selectedUri={selectedUri}
          onSelectNode={onSelectNode}
          level={0}
        />
      ))}
    </ul>
  );
}

interface TreeNodeProps {
  key?: string;
  item: TreeItem;
  selectedUri: string | null;
  onSelectNode: (node: TreeItem) => void;
  level: number;
}

function TreeNode({ item, selectedUri, onSelectNode, level }: TreeNodeProps) {
  const hasChildren = item.children && item.children.length > 0;
  
  // Auto-expand if this node contains the active selection
  const containsActive = (node: TreeItem, uri: string | null): boolean => {
    if (!uri) return false;
    if (node.uri === uri) return true;
    if (node.children) {
      return node.children.some((child) => containsActive(child, uri));
    }
    return false;
  };

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (containsActive(item, selectedUri)) {
      setIsOpen(true);
    }
  }, [selectedUri, item]);

  const isSelected = selectedUri === item.uri;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode(item);
  };

  return (
    <li className="list-none" id={`tree-node-${item.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
      {/* Node Row */}
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${level * 12 + 6}px` }}
        className={`group flex items-center gap-1.5 py-1.5 pr-2.5 rounded-lg cursor-pointer text-xs md:text-sm font-sans transition-all duration-150 ${
          isSelected
            ? 'bg-amber-600/15 border-l-2 border-amber-500 text-amber-400 font-semibold'
            : 'border-l-2 border-transparent text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
        }`}
      >
        {/* Expand Trigger if children exist */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            type="button"
            className="p-1 rounded hover:bg-slate-800/90 text-slate-400 hover:text-slate-100"
          >
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5 shrink-0 transition-transform" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-transform" />
            )}
          </button>
        ) : (
          <span className="w-5.5" /> /* spacing spacer */
        )}

        {/* Icon Type (Folder vs Document) */}
        {hasChildren ? (
          <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-500' : 'text-slate-400 group-hover:text-amber-400'}`} />
        ) : (
          <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
        )}

        {/* Node Label */}
        <span className="truncate flex-1 select-none font-sans" title={item.label}>
          {item.label}
        </span>
      </div>

      {/* Expanded Children render recursively */}
      {hasChildren && isOpen && (
        <ul className="mt-0.5 space-y-0.5 transition-all">
          {item.children.map((child, idx) => (
            <TreeNode
              key={`${child.label}-${child.uri}-${idx}`}
              item={child}
              selectedUri={selectedUri}
              onSelectNode={onSelectNode}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
