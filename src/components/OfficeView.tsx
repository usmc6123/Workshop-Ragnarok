/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileText, Table2, Presentation, Workflow, Type, FileEdit, NotebookPen } from 'lucide-react';

// "The Office" — a study/productivity page bundling self-hosted tools as
// embedded tabs, same standalone-container pattern as YoutubeTrimmerView.tsx.
// Word is the default/first tab, so opening "The Office" shows a ready-to-use
// doc immediately with zero extra clicks. PDF Tools and Notes are pinned to
// the far right since they're separate tools, not Nextcloud documents.
//
//   Word/Excel/PowerPoint/Diagrams/Text -> blank files pre-created in the
//                existing Nextcloud instance, each deep-linked straight into
//                its Collabora editor view (skips the Files list entirely).
//                Reached via a small nginx proxy (D:\HomeServer\nextcloud-embed-proxy)
//                at https://docs.homeslab.uk that strips Nextcloud's
//                X-Frame-Options header (hardcoded to SAMEORIGIN, which
//                otherwise blocks any cross-origin iframe) and spoofs the
//                Host header back to the already-trusted nextcloud.homeslab.uk.
//                Regular direct browsing still uses nextcloud.homeslab.uk
//                unchanged — this proxy exists only for this embedded view.
//                If any of these files are ever renamed/moved/deleted, open
//                the replacement in Nextcloud, copy its URL from the address
//                bar, swap the domain to docs.homeslab.uk, and update below.
//   PDF Tools -> Stirling-PDF (D:\HomeServer\stirling-pdf), via its own
//                nginx proxy sidecar that strips Stirling's hardcoded
//                X-Frame-Options: DENY. https://pdf.homeslab.uk
//   Notes     -> Trilium (D:\HomeServer\trilium), via its own nginx proxy
//                sidecar that strips Trilium's hardcoded X-Frame-Options.
//                https://notes.homeslab.uk — first visit shows Trilium's
//                own one-time setup/password screen, that's normal.
//
// If any of these LAN ports / hostnames ever change, update the URLs below —
// same rule as the Youtube Trimmer view.

const TABS = [
  {
    id: 'word',
    label: 'Word',
    icon: FileText,
    url: 'https://docs.homeslab.uk/apps/files/files/19762?dir=/&openfile=true',
    description: 'Word document editing.',
  },
  {
    id: 'excel',
    label: 'Excel',
    icon: Table2,
    url: 'https://docs.homeslab.uk/apps/files/files/19769?dir=/&editing=false&openfile=true',
    description: 'Spreadsheet editing.',
  },
  {
    id: 'powerpoint',
    label: 'PowerPoint',
    icon: Presentation,
    url: 'https://docs.homeslab.uk/apps/files/files/19771?dir=/&editing=false&openfile=true',
    description: 'Presentation editing.',
  },
  {
    id: 'diagrams',
    label: 'Diagrams',
    icon: Workflow,
    url: 'https://docs.homeslab.uk/apps/files/files/19773?dir=/&editing=false&openfile=true',
    description: 'Diagrams and flowcharts.',
  },
  {
    id: 'text',
    label: 'Text',
    icon: Type,
    url: 'https://docs.homeslab.uk/apps/files/files/19775?dir=/&editing=false&openfile=true',
    description: 'Plain text / quick notes doc.',
  },
  {
    id: 'pdf',
    label: 'PDF Tools',
    icon: FileEdit,
    url: 'https://pdf.homeslab.uk',
    description: 'Merge, split, compress, OCR, redact, sign, and convert PDFs.',
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
  const [activeTab, setActiveTab] = useState<TabId>('word');
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

      {/* Active tab content — all tabs mounted at once (hidden via CSS, not
          unmounted) so switching tabs never reloads/re-logs-in an app, and
          Word is ready the instant the page opens. */}
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
