import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useBrowserRenderer, type BrowserRenderConfig } from '@twick/browser-render';

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
  
  // Iframe states
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  // Blob URLs cleanup reference
  const createdBlobUrls = useRef<string[]>([]);

  // Browser renderer for video export with audio
  const { render: renderVideo } = useBrowserRenderer({
    includeAudio: true,
    autoDownload: true,
  });

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

  const activeUrl = '/video-editor-proxy';
  const newTabUrl = '/video-editor-tab';

  const renderLoadingSkeleton = () => (
      <div className="w-full h-full bg-transparent flex items-center justify-center" style={{minHeight:0}}>
      <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
    </div>
  );

  const handleIframeLoad = () => {
    setIsIframeLoading(false);
  };

  const handleIframeError = () => {
    console.warn('Iframe failed to load at proxy.');
  };

  const onExportVideo = async (projectJson: any, videoSettings: any) => {
    try {
      const variables = {
        input: {
          ...projectJson,
          properties: {
            width: videoSettings.resolution.width || 720,
            height: videoSettings.resolution.height || 1280,
            fps: videoSettings.fps || 30,
          },
        },
      } as BrowserRenderConfig['variables'];
      
      const videoBlob = await renderVideo(variables);
      if (videoBlob) {
        return { status: true, message: "Video exported successfully with audio!" };
      } else {
        return { status: false, message: "Video export failed" };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error('Export error:', msg);
      return { status: false, message: msg };
    }
  };

  return (
    <div className="w-full h-full select-none" id="twick-studio-page-container" style={{display: "flex", flexDirection: "column", minHeight: "100vh"}}>
      <div className="relative w-full h-full" style={{flex:1, minHeight:0}}>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
          <a
            href={newTabUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-white/20 bg-black/70 text-white hover:text-amber-300 hover:border-amber-400/50 text-[10px] font-mono font-bold tracking-wider uppercase transition cursor-pointer"
          >
            Open in New Tab
          </a>
        </div>
        {isPackageLoading ? (
          renderLoadingSkeleton()
        ) : TwickStudioComponent ? (
          <div className="w-full h-full overflow-hidden" style={{height: '100%'}}>
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
                studioConfig={{
                  exportVideo: onExportVideo,
                }}
              />
            </Suspense>
          </div>
        ) : (
          <div className="relative w-full h-full overflow-hidden" style={{minHeight:0}}>
            {isIframeLoading && (
              <div className="absolute inset-0 z-20 bg-transparent">
                {renderLoadingSkeleton()}
              </div>
            )}
            
            <iframe
              src={activeUrl}
              title="Twick Studio Production IFrame"
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-modals"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            />
          </div>
        )}
      </div>
    </div>
  );
}
