/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// The Youtube Trimmer is a separate standalone app (its own Docker container,
// own docker-compose.yml, own repo folder at D:\HomeServer\yt-downloader) —
// deliberately NOT folded into the Workshop Ragnarök stack so it never touches
// the protected-file deploy pipeline. This view just embeds it via iframe so
// it's reachable as a tab in the shop UI.
const TRIMMER_PORT = 8973;

export default function YoutubeTrimmerView() {
  const trimmerUrl = `${window.location.protocol}//${window.location.hostname}:${TRIMMER_PORT}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6" id="youtube-trimmer-view">
      <div className="rounded-xl border border-border-theme overflow-hidden shadow-lg" style={{ height: 'calc(100vh - 140px)' }}>
        <iframe
          src={trimmerUrl}
          title="Youtube Trimmer"
          className="w-full h-full border-0"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
