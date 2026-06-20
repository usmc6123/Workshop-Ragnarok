/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="settings-modal-overlay">
      <div 
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl"
        id="settings-modal-container"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-lg tracking-tight font-sans">LAN API Configuration</h3>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              API Base URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:4000"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Define the LAN Address where your manual server is hosting the JSON API. (e.g. <code className="text-amber-400">http://192.168.1.100:4000</code>)
            </p>
          </div>

          {/* Connection Test Section */}
          <div className="rounded-lg border border-slate-850 bg-slate-950/50 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                {testResult.status === 'success' ? (
                  <Wifi className="w-3.5 h-3.5 text-green-500" />
                ) : testResult.status === 'error' ? (
                  <WifiOff className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Server className="w-3.5 h-3.5 text-slate-500" />
                )}
                Connection Status
              </span>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !url}
                className="text-xs font-medium text-amber-500 hover:text-amber-400 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {testing && <RefreshCw className="w-3 h-3 animate-spin" />}
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {testResult.status !== 'idle' && (
              <div className={`p-2.5 rounded-md text-xs flex items-start gap-2 ${
                testResult.status === 'success' 
                  ? 'bg-green-950/30 border border-green-800/40 text-green-300' 
                  : 'bg-red-950/30 border border-red-800/40 text-red-300'
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
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-950 p-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-md transition-all active:scale-95"
          >
            Apply Config
          </button>
        </div>
      </div>
    </div>
  );
}
