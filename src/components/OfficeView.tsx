/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileText, Table2, Presentation, Workflow, Type, FileEdit, NotebookPen, GraduationCap } from 'lucide-react';
import SchoolView from './SchoolView';

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
//   School    -> NOT an iframe to an external self-hosted service like the
//                tabs above — SchoolView.tsx is a real in-app React
//                component, backed by this app's own database
//                (school_tracker table, GET/PUT /api/school-tracker) so
//                progress syncs across devices instead of living in one
//                browser's localStorage. A personal checklist tracker for
//                the Sophia Learning -> Study.com -> WGU BS Computer
//                Science credit-transfer plan. Added 2026-07-31.
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
  {
    id: 'school',
    label: 'School',
    icon: GraduationCap,
    url: null,
    description: 'WGU BS Computer Science credit-transfer progress tracker.',
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
          Word is ready the instant the page opens. School has no url (it's a
          real in-app component, not an embedded external service) so it
          renders SchoolView directly instead of an iframe. */}
      <div className="flex-1 relative">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            className={`w-full h-full absolute inset-0 ${tab.id === activeTab ? 'block' : 'hidden'}`}
          >
            {tab.url ? (
              <iframe
                src={tab.url}
                title={tab.label}
                className="w-full h-full border-0"
                allow="fullscreen; clipboard-read; clipboard-write"
              />
            ) : (
              <SchoolView />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
