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
//
// Reachable at its own Cloudflare Tunnel hostname (youtube.homeslab.uk ->
// 192.168.50.223:8973). Appending the port to whatever hostname Ragnarök is
// currently loaded from (e.g. workshop.homeslab.uk:8973) does NOT work — the
// tunnel only proxies the exact hostname it's configured for, not arbitrary
// ports tacked onto other domains. If the port/LAN IP ever changes, update it
// in the Cloudflare Tunnel dashboard, not here.
const TRIMMER_URL = 'https://youtube.homeslab.uk';

export default function YoutubeTrimmerView() {
  const trimmerUrl = TRIMMER_URL;

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
