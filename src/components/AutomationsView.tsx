import React from 'react';

export default function AutomationsView() {
  return (
    <div 
      className="w-full h-[calc(100vh-64px)] overflow-hidden bg-[#0a0a0f]" 
      id="automations-iframe-view"
    >
      <iframe
        src="https://n8n.homeslab.uk"
        className="w-full h-full border-0"
        title="n8n Automations Workspace"
        allow="camera; microphone; geolocation"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
      />
    </div>
  );
}
