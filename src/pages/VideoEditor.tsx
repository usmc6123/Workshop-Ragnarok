import React, { useState, useEffect, useRef, Suspense } from 'react';
import { 
  Clapperboard, Sparkles, AlertTriangle, ExternalLink, Loader2, 
  RefreshCw, Layout, Maximize2, X, UploadCloud, Film
} from 'lucide-react';

interface TwickStudioProps {
  uploadConfig?: {
    provider: string;
    endpoint: string;
    maxSizeMB: number;
    allowedTypes: string[];
  };
  mediaManager?: string;
  title?: string;
}

export default function VideoEditor() {
  const [TwickStudioComponent, setTwickStudioComponent] = useState<React.ComponentType<any> | null>(null);
  const [isPackageLoading, setIsPackageLoading] = useState(true);
  const [packageError, setPackageError] = useState<string | null>(null);
  
  // Iframe states
  const [iframeUrl, setIframeUrl] = useState('/video-editor-proxy');
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [useFallbackUrl, setUseFallbackUrl] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Blob URLs cleanup reference
  const createdBlobUrls = useRef<string[]>([]);

  // Attempt dynamic package load
  useEffect(() => {
    let isMounted = true;
    async function checkAndLoadTwick() {
      try {
        setIsPackageLoading(true);
        // Dynamic import with variable prevents Vite and Rollup from performing static analysis
        // and throwing compile-time errors.
        const packageName = '@twick/studio';
        const twickModule = await import(/* @vite-ignore */ packageName);
        
        if (isMounted) {
          const StudioComp = twickModule.Studio || twickModule.default || twickModule.TwickStudio;
          if (StudioComp) {
            setTwickStudioComponent(() => StudioComp);
          } else {
            throw new Error("Twick Studio component export not found.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.log('Dynamic @twick/studio package load failed, using high-fidelity reverse-proxy iframe fallback instead.');
          setPackageError(err?.message || String(err));
        }
      } finally {
        if (isMounted) {
          setIsPackageLoading(false);
        }
      }
    }

    checkAndLoadTwick();

    return () => {
      isMounted = false;
      // Clean up any blob URLs created by the page or components
      if (createdBlobUrls.current.length > 0) {
        createdBlobUrls.current.forEach(url => {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            console.error('Failed to revoke blob URL:', e);
          }
        });
        createdBlobUrls.current = [];
      }
    };
  }, []);

  const handleIframeLoad = () => {
    setIsIframeLoading(false);
  };

  const handleIframeError = () => {
    console.warn('Iframe failed to load at proxy. Suggesting direct fallback.');
    setUseFallbackUrl(true);
  };

  // Switch between /video-editor-proxy and direct localhost:3000
  const activeUrl = useFallbackUrl ? 'http://localhost:3000' : '/video-editor-proxy';

  const renderLoadingSkeleton = () => (
    <div className="w-full h-[650px] bg-[#12131a] border border-white/5 rounded-2xl p-6 flex flex-col justify-between animate-pulse">
      <div className="flex justify-between items-center pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5" />
          <div className="space-y-2">
            <div className="w-36 h-4 bg-white/5 rounded" />
            <div className="w-24 h-2 bg-white/5 rounded" />
          </div>
        </div>
        <div className="w-28 h-8 bg-white/5 rounded-lg" />
      </div>
      <div className="flex-1 flex gap-4 py-4">
        {/* Left Side panels */}
        <div className="w-1/4 h-full bg-white/5 rounded-xl flex flex-col gap-3 p-3">
          <div className="w-full h-8 bg-white/5 rounded-lg" />
          <div className="w-full h-1/2 bg-white/5 rounded-lg" />
          <div className="w-full h-12 bg-white/5 rounded-lg" />
        </div>
        {/* Main Canvas preview */}
        <div className="flex-1 h-full bg-white/5 rounded-xl flex flex-col justify-between p-4">
          <div className="w-full h-3/4 bg-white/5 rounded-lg flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
          <div className="w-full h-12 bg-white/5 rounded-lg" />
        </div>
      </div>
      <div className="h-16 border-t border-white/5 pt-4 flex gap-3">
        <div className="w-24 h-full bg-white/5 rounded" />
        <div className="flex-1 h-full bg-white/5 rounded" />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 select-none" id="twick-studio-page-container">
      {/* Visual Top Header Accent Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#12131a]/80 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500">
            <Film className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-widest uppercase font-mono">
              Roscoe & Cooper's Studio
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              {TwickStudioComponent ? 'Twick Studio Native Extension' : 'Twick Production Hub (Direct Pipeline)'}
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!TwickStudioComponent && (
            <>
              <button
                onClick={() => setUseFallbackUrl(!useFallbackUrl)}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  useFallbackUrl
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    : 'border-white/10 bg-black/40 text-slate-400 hover:text-white'
                }`}
                title="Toggle Local Direct Server vs Nginx Reverse Proxy"
              >
                <RefreshCw className={`w-3 h-3 ${isIframeLoading ? 'animate-spin' : ''}`} />
                <span>Route: {useFallbackUrl ? 'Direct Localhost' : 'Nginx Proxy'}</span>
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 text-slate-400 hover:text-white hover:border-white/20 text-[10px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Open in Modal</span>
              </button>
            </>
          )}

          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-black/60 text-amber-500 hover:text-amber-400 hover:border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Launch Pipeline Tab</span>
          </a>
        </div>
      </div>

      {/* Main Studio Frame Content Container */}
      <div className="relative">
        {isPackageLoading ? (
          renderLoadingSkeleton()
        ) : TwickStudioComponent ? (
          /* Option 1: Native Studio component render */
          <div className="rounded-2xl border border-white/5 bg-[#12131a] overflow-hidden p-6 shadow-2xl">
            <Suspense fallback={renderLoadingSkeleton()}>
              <TwickStudioComponent
                uploadConfig={{
                  provider: 'local',
                  endpoint: '/api/uploads',
                  maxSizeMB: 100,
                  allowedTypes: ['video/*', 'image/*', 'audio/*'],
                }}
                mediaManager="BrowserMediaManager"
                title="Roscoe & Cooper's Studio"
              />
            </Suspense>
          </div>
        ) : (
          /* Option 2: High-Performance Secure Sandbox IFrame Fallback (RECOMMENDED for Dev/Prod split) */
          <div className="relative rounded-2xl border border-white/5 bg-[#090a0f] overflow-hidden shadow-2xl h-[680px]">
            {isIframeLoading && (
              <div className="absolute inset-0 z-20 bg-[#090a0f]">
                {renderLoadingSkeleton()}
              </div>
            )}
            
            <iframe
              src={activeUrl}
              title="Twick Studio Production IFrame"
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              /* Security sandbox restriction to prevent malicious host actions while enabling full interactive media studio */
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            />
          </div>
        )}
      </div>

      {/* Connection Diagnostic banner */}
      {!TwickStudioComponent && !isPackageLoading && (
        <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl text-xs text-slate-400 font-mono">
          <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-300">Nginx Reverse Proxy Security Configuration</p>
            <p>
              Your local Studio instance is running outside the sandbox domain container. The iframe connects through 
              <code className="bg-black/40 px-1 py-0.5 rounded ml-1 text-amber-500">{activeUrl}</code>. 
              If the page is blank, ensure your local Twick container is healthy (run <code className="bg-black/40 px-1 py-0.5 rounded text-slate-300">docker compose up -d twick-prod</code>).
            </p>
          </div>
        </div>
      )}

      {/* Floating Preview Modal Frame */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl h-[85vh] bg-[#0d0e14] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#12131a]">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-xs font-black tracking-widest uppercase font-mono text-white">
                  Roscoe & Cooper's Studio (Full-Width Monitor)
                </span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 bg-black">
              <iframe
                src={activeUrl}
                title="Twick Studio Modal IFrame"
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
