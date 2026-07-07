/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getApiBase, setApiBase, fetchWithTimeout } from '../lib/api';
import { Server, Wifi, WifiOff, X, Check, AlertTriangle, RefreshCw } from 'lucide-react';

interface NetworkSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function NetworkSettingsModal({ isOpen, onClose, onSave }: NetworkSettingsModalProps) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  useEffect(() => {
    if (isOpen) {
      setUrl(getApiBase());
      setTestResult({ status: 'idle', message: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult({ status: 'idle', message: '' });
    
    // Attempt to parse makes to see if server is up and returning correct CORS headers.
    const cleanUrl = url.trim().replace(/\/$/, ""); // Strip trailing flash if any
    try {
      const response = await fetchWithTimeout(`${cleanUrl}/api/makes`, { method: 'GET' }, 3000);
      if (response.ok) {
        setTestResult({
          status: 'success',
          message: 'Connected successfully! The manual server is online and responding.',
        });
      } else {
        setTestResult({
          status: 'error',
          message: `Server reachable but returned status code ${response.status}.`,
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: 'Unable to reach the server. Please verify the host Address/IP, port, and ensure CORS is enabled.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const cleanUrl = url.trim().replace(/\/$/, "");
    setApiBase(cleanUrl);
    onSave();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in" id="settings-modal-overlay">
      <div 
        className="w-full max-w-md overflow-hidden rounded-xl border border-[#1e2028] bg-[#13141a] text-slate-100 shadow-2xl"
        id="settings-modal-container"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e2028] bg-[#1a1c24] p-4 select-none">
          <div className="flex items-center gap-2">
            <Server className="w-4.5 h-4.5 text-amber-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 font-mono">LAN API Configuration</h3>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-[#13141a] hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 mb-2">
              API Base URL Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:4000"
                className="w-full rounded-lg border border-[#1e2028] bg-[#0a0a0f] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none font-mono"
              />
            </div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed font-sans">
              Define the LAN Address where your manual server is hosting the JSON API. (e.g. <code className="text-amber-500 font-mono font-bold bg-amber-500/5 px-1 py-0.5 rounded border border-amber-500/10">http://192.168.1.100:4000</code>)
            </p>
          </div>

          {/* Connection Test Section */}
          <div className="rounded-xl border border-[#1e2028] bg-[#1a1c24]/30 p-4 space-y-3">
            <div className="flex items-center justify-between select-none">
              <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                {testResult.status === 'success' ? (
                  <Wifi className="w-3.5 h-3.5 text-green-500" />
                ) : testResult.status === 'error' ? (
                  <WifiOff className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Server className="w-3.5 h-3.5 text-slate-500" />
                )}
                Connection Diagnostics
              </span>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !url}
                className="text-xs font-bold font-sans uppercase tracking-wider text-amber-500 hover:text-amber-400 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                {testing && <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />}
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {testResult.status !== 'idle' && (
              <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                testResult.status === 'success' 
                  ? 'bg-green-950/20 border border-green-800/30 text-green-300' 
                  : 'bg-red-950/20 border border-red-800/30 text-red-350'
              }`}>
                {testResult.status === 'success' ? (
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#1e2028] bg-[#1a1c24] p-4 select-none">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md"
          >
            Apply Config
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
