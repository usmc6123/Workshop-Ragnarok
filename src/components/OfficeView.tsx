/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileText, FileEdit, NotebookPen, ExternalLink } from 'lucide-react';

// "The Office" — a study/productivity page bundling three self-hosted tools,
// same pattern as YoutubeTrimmerView.tsx: each is its own standalone Docker
// container with its own compose file, deliberately NOT folded into the
// Ragnarök protected-file deploy pipeline, reached via its own Cloudflare
// Tunnel hostname.
//
//   PDF Tools -> Stirling-PDF   (D:\HomeServer\stirling-pdf, own docker-compose.yml)
//                https://pdf.homeslab.uk  — embedded directly, no framing restrictions.
//   Documents -> existing Nextcloud instance (nextcloud.homeslab.uk), with the
//                Collabora Online app enabled via the Nextcloud AIO admin panel
//                for in-browser Word/Excel/PowerPoint editing. NOT embedded as
//                an iframe — Nextcloud sends `X-Frame-Options: SAMEORIGIN` by
//                design (anti-clickjacking) and refuses to render inside a
//                frame on a different origin (workshop.homeslab.uk). Fighting
//                that with header-stripping at the proxy layer would weaken a
//                real security control, so this tab instead opens Nextcloud in
//                a new tab.
//   Notes     -> Trilium        (D:\HomeServer\trilium, own docker-compose.yml)
//                https://notes.homeslab.uk — embedded directly. First visit
//                will show Trilium's own one-time setup/password screen —
//                that's normal first-run behavior, not a bug.
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
    embeddable: true,
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    // Deep link straight into the "Scratchpad" doc's editor view (Collabora),
    // not the bare Nextcloud root — skips the Files list entirely so this
    // opens ready to type. Files browsing/upload is still one click away
    // from inside Nextcloud's own nav once you're in there. If this file is
    // ever renamed/moved/deleted, grab its new URL from the address bar the
    // same way (Files -> open it -> copy URL) and update this.
    url: 'https://nextcloud.homeslab.uk/apps/files/files/19762?dir=/&openfile=true',
    description: 'Word / Excel / PowerPoint editing, file storage and organization.',
    embeddable: false,
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: NotebookPen,
    url: 'https://notes.homeslab.uk',
    description: 'Trilium — hierarchical notes for coursework, organized by class/topic.',
    embeddable: true,
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
        {TABS.map((tab) => {
          if (!tab.embeddable) {
            return (
              <div
                key={tab.id}
                className={`w-full h-full absolute inset-0 flex-col items-center justify-center gap-4 ${tab.id === activeTab ? 'flex' : 'hidden'}`}
              >
                <tab.icon className="w-12 h-12 text-primary-theme/60" />
                <div className="text-center max-w-sm">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 mb-1">{tab.label}</h3>
                  <p className="text-xs text-slate-500">{tab.description}</p>
                  <p className="text-[10px] text-slate-600 mt-2">
                    Opens in a new tab — Nextcloud blocks being embedded inside another site for security.
                  </p>
                </div>
                <a
                  href={tab.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-theme text-slate-950 text-xs font-black uppercase tracking-wider hover:opacity-90 transition"
                >
                  Open {tab.label} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            );
          }
          return (
            <iframe
              key={tab.id}
              src={tab.url}
              title={tab.label}
              className={`w-full h-full border-0 absolute inset-0 ${tab.id === activeTab ? 'block' : 'hidden'}`}
              allow="fullscreen; clipboard-read; clipboard-write"
            />
          );
        })}
      </div>
    </div>
  );
}
