/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileText, FileEdit, NotebookPen } from 'lucide-react';

// "The Office" — a study/productivity page bundling three self-hosted tools as
// iframe tabs, same pattern as YoutubeTrimmerView.tsx: each is its own standalone
// Docker container with its own compose file, deliberately NOT folded into the
// Ragnarök protected-file deploy pipeline, reached via its own Cloudflare Tunnel
// hostname.
//
//   PDF Tools -> Stirling-PDF   (D:\HomeServer\stirling-pdf, own docker-compose.yml)
//                https://pdf.homeslab.uk
//   Documents -> existing Nextcloud instance (nextcloud.homeslab.uk), with the
//                Collabora Online app enabled via the Nextcloud AIO admin panel —
//                that's what gives in-browser Word/Excel/PowerPoint editing.
//   Notes     -> Trilium        (D:\HomeServer\trilium, own docker-compose.yml)
//                https://notes.homeslab.uk
//
// If any of these LAN ports / hostnames ever change, update the URLs below —
// same rule as the Youtube Trimmer view.

const TABS = [
  {
    id: 'pdf',
    label: 'PDF Tools',
    icon: FileEdit,
    url: 'https://pdf.homeslab.uk',
    description: 'Merge, split, compress, OCR, redact, sign, and convert PDFs.',
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    url: 'https://nextcloud.homeslab.uk',
    description: 'Word / Excel / PowerPoint editing, file storage and organization.',
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: NotebookPen,
    url: 'https://notes.homeslab.uk',
    description: 'Trilium — hierarchical notes for coursework, organized by class/topic.',
  },
] as const;

type TabId = typeof TABS[number]['id'];

export default function OfficeView() {
  const [activeTab, setActiveTab] = useState<TabId>('pdf');
  const active = TABS.find((t) => t.id === activeTab)!;

  return (
    <div
      id="office-view"
      className="flex flex-col bg-bg-theme"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* Tab bar */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-0 border-b border-border-theme bg-surface-theme/60 shrink-0 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold uppercase tracking-wider transition-all shrink-0
                border border-b-0
                ${isActive
                  ? 'bg-bg-theme text-primary-theme border-border-theme'
                  : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300'
                }
              `}
              title={tab.description}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
        <span className="ml-auto mr-1 mb-2 text-[10px] font-mono text-slate-600 hidden md:block whitespace-nowrap">
          {active.description}
        </span>
      </div>

      {/* Active tab content */}
      <div className="flex-1 relative">
        {TABS.map((tab) => (
          <iframe
            key={tab.id}
            src={tab.url}
            title={tab.label}
            className={`w-full h-full border-0 absolute inset-0 ${tab.id === activeTab ? 'block' : 'hidden'}`}
            allow="fullscreen; clipboard-read; clipboard-write"
          />
        ))}
      </div>
    </div>
  );
}
