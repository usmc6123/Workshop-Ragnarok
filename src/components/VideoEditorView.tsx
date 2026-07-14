import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Trash2, Play, Pause, Save, Download, Loader2, Volume2, VolumeX, Music, 
  Type, Image as ImageIcon, Video, Layers, Settings, ArrowUp, ArrowDown, 
  Check, X, Film, Upload, Clapperboard, RefreshCw, Scissors, ChevronLeft,
  ZoomIn, ZoomOut, Move
} from 'lucide-react';
import { api } from '../lib/api';
import { VideoProject, VideoTimeline, VideoClip, VideoOverlay } from '../types';

export default function VideoEditorView() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<VideoProject | null>(null);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Active editing state inside a project
  const [projectName, setProjectName] = useState('');
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [overlays, setOverlays] = useState<VideoOverlay[]>([]);
  const [bgMusic, setBgMusic] = useState<{ source_url: string | null; volume: number }>({ source_url: null, volume: 40 });
  const [outputPreset, setOutputPreset] = useState<'480p' | '720p' | '1080p'>('720p');

  // Preview playhead and master settings
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [masterVolume, setMasterVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [timelineZoom, setTimelineZoom] = useState<number>(1.5);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Active render jobs
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderStatus, setRenderStatus] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle');
  const [renderError, setRenderError] = useState<string | null>(null);

  // Layout tabs
  const [activeTab, setActiveTab] = useState<'clips' | 'overlays' | 'music' | 'export'>('clips');

  // Preview media ref syncing
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  const isScrubbing = useRef<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  // Refs to allow high-performance frame playhead loop without closure problems
  const clipsRef = useRef(clips);
  const currentTimeRef = useRef(currentTime);
  const isPlayingRef = useRef(isPlaying);
  const masterVolumeRef = useRef(masterVolume);

  useEffect(() => { clipsRef.current = clips; }, [clips]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { masterVolumeRef.current = masterVolume; }, [masterVolume]);

  // Drag & drop handlers for visual sequence reordering
  const handleTimelineDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleTimelineDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTimelineDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIdxStr = e.dataTransfer.getData('text/plain');
    if (sourceIdxStr === '') return;
    const sourceIndex = parseInt(sourceIdxStr, 10);
    if (sourceIndex === targetIndex) return;

    const updated = [...clips];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);
    
    setClips(updated);
    setSelectedClipId(moved.id);
    triggerDebouncedSaveClips(updated);
  };

  // Drag and drop overlay positioning handler
  const handleOverlayMouseDown = (e: React.MouseEvent, ov: VideoOverlay) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedOverlayId(ov.id);
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = ov.x;
    const initialY = ov.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!previewContainerRef.current) return;
      const rect = previewContainerRef.current.getBoundingClientRect();
      
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;

      let newX = Math.round(initialX + deltaX);
      let newY = Math.round(initialY + deltaY);

      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));

      handleUpdateOverlay(ov.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Splitting clips at the current playhead
  const handleSplitClip = () => {
    if (clips.length === 0) return;
    const match = getClipAtTimelineTime(currentTime);
    if (!match) return;

    const { clip, localTime, clipIndex } = match;
    
    if (localTime - clip.trim_start < 0.3 || clip.trim_end - localTime < 0.3) {
      alert("Cannot split too close to the start or end of a clip.");
      return;
    }

    const clip1: VideoClip = {
      ...clip,
      id: `${Date.now()}_split1_${Math.random().toString(36).substr(2, 5)}`,
      trim_end: localTime
    };

    const clip2: VideoClip = {
      ...clip,
      id: `${Date.now()}_split2_${Math.random().toString(36).substr(2, 5)}`,
      trim_start: localTime
    };

    const updated = [...clips];
    updated.splice(clipIndex, 1, clip1, clip2);

    setClips(updated);
    setSelectedClipId(clip2.id);
    triggerDebouncedSaveClips(updated);
  };

  // Debounced save timers per logical target
  const saveClipsTimer = useRef<NodeJS.Timeout | null>(null);
  const saveOverlaysTimer = useRef<NodeJS.Timeout | null>(null);
  const saveGeneralTimer = useRef<NodeJS.Timeout | null>(null);

  // Compute total duration of sequential clips
  const totalClipsDuration = clips.reduce((sum, c) => sum + (c.trim_end - c.trim_start), 0);

  // Fetch projects and media library
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const projs = await api.getVideoProjects();
      setProjects(projs);
      const media = await api.getMediaLibrary();
      setMediaFiles(media);
    } catch (err) {
      console.error('Error loading video editor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const refreshMedia = async () => {
    setMediaLoading(true);
    try {
      const media = await api.getMediaLibrary();
      setMediaFiles(media);
    } catch (err) {
      console.error('Error refreshing media library:', err);
    } finally {
      setMediaLoading(false);
    }
  };

  // Create a new project
  const handleCreateProject = async () => {
    try {
      setLoading(true);
      const newProj = await api.createVideoProject('New Shop Video');
      setProjects(prev => [newProj, ...prev]);
      handleSelectProject(newProj);
    } catch (err) {
      console.error('Error creating video project:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open a project
  const handleSelectProject = (project: VideoProject) => {
    setSelectedProject(project);
    setProjectName(project.name);
    
    let timeline: VideoTimeline = { clips: [], overlays: [], background_music: { source_url: null, volume: 40 }, output: { resolution: '720p' } };
    if (project.timeline) {
      try {
        timeline = typeof project.timeline === 'string' ? JSON.parse(project.timeline) : project.timeline;
      } catch (e) {
        console.error('Failed to parse timeline JSON, using default:', e);
      }
    }

    setClips(timeline.clips || []);
    setOverlays(timeline.overlays || []);
    setBgMusic(timeline.background_music || { source_url: null, volume: 40 });
    setOutputPreset((timeline.output && timeline.output.resolution) || '720p');
    
    // Reset playhead
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectedClipId(null);
    setSelectedOverlayId(null);
    setActiveJobId(null);
    setRenderStatus('idle');
    setRenderProgress(0);
    setRenderError(null);
    setActiveTab('clips');
  };

  // Direct database persist (the core saving handler)
  const persistChanges = async (updatedFields: Partial<VideoProject>) => {
    if (!selectedProject) return;
    setSavingStatus('saving');
    try {
      const timelineData: VideoTimeline = {
        clips: updatedFields.timeline ? (updatedFields.timeline as VideoTimeline).clips : clips,
        overlays: updatedFields.timeline ? (updatedFields.timeline as VideoTimeline).overlays : overlays,
        background_music: updatedFields.timeline ? (updatedFields.timeline as VideoTimeline).background_music : bgMusic,
        output: { resolution: updatedFields.timeline ? (updatedFields.timeline as VideoTimeline).output?.resolution || '720p' : outputPreset }
      };

      const payload = {
        ...updatedFields,
        timeline: JSON.stringify(timelineData)
      };

      const result = await api.updateVideoProject(selectedProject.id, payload);
      setSavingStatus('saved');
      setProjects(prev => prev.map(p => p.id === result.id ? result : p));
      setTimeout(() => setSavingStatus('idle'), 1500);
    } catch (err) {
      console.error('Error saving video project changes:', err);
      setSavingStatus('error');
    }
  };

  // Separately debounced saving functions to avoid overlap/races
  const triggerDebouncedSaveClips = (updatedClips: VideoClip[]) => {
    if (saveClipsTimer.current) clearTimeout(saveClipsTimer.current);
    saveClipsTimer.current = setTimeout(() => {
      persistChanges({
        timeline: {
          clips: updatedClips,
          overlays,
          background_music: bgMusic,
          output: { resolution: outputPreset }
        }
      });
    }, 1200);
  };

  const triggerDebouncedSaveOverlays = (updatedOverlays: VideoOverlay[]) => {
    if (saveOverlaysTimer.current) clearTimeout(saveOverlaysTimer.current);
    saveOverlaysTimer.current = setTimeout(() => {
      persistChanges({
        timeline: {
          clips,
          overlays: updatedOverlays,
          background_music: bgMusic,
          output: { resolution: outputPreset }
        }
      });
    }, 1200);
  };

  const triggerDebouncedSaveGeneral = (nameVal: string, musicVal: typeof bgMusic, presetVal: '480p' | '720p' | '1080p') => {
    if (saveGeneralTimer.current) clearTimeout(saveGeneralTimer.current);
    saveGeneralTimer.current = setTimeout(() => {
      persistChanges({
        name: nameVal,
        timeline: {
          clips,
          overlays,
          background_music: musicVal,
          output: { resolution: presetVal }
        }
      });
    }, 1200);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveClipsTimer.current) clearTimeout(saveClipsTimer.current);
      if (saveOverlaysTimer.current) clearTimeout(saveOverlaysTimer.current);
      if (saveGeneralTimer.current) clearTimeout(saveGeneralTimer.current);
    };
  }, []);

  // Delete project
  const handleDeleteProject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project permanently? This cannot be undone.')) return;
    try {
      setLoading(true);
      await api.deleteVideoProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    } finally {
      setLoading(false);
    }
  };

  // Upload custom asset
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadMedia(file, file.name);
      await refreshMedia();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload file. Check dimensions/size guidelines.');
    } finally {
      setUploading(false);
    }
  };

  // Clip Handlers
  const handleAddClip = (file: any) => {
    if (file.kind !== 'video') {
      alert('Only video files can be added to the clips timeline sequence.');
      return;
    }
    const duration = file.duration || 10; // Fallback default
    const newClip: VideoClip = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source_url: file.url,
      name: file.filename,
      duration: duration,
      trim_start: 0,
      trim_end: duration,
      volume: 100
    };
    const updated = [...clips, newClip];
    setClips(updated);
    setSelectedClipId(newClip.id);
    triggerDebouncedSaveClips(updated);
  };

  const handleUpdateClip = (clipId: string, updates: Partial<VideoClip>) => {
    const updated = clips.map(c => {
      if (c.id === clipId) {
        const nc = { ...c, ...updates };
        // Boundary validation
        if (nc.trim_start < 0) nc.trim_start = 0;
        if (nc.trim_end > nc.duration) nc.trim_end = nc.duration;
        if (nc.trim_start >= nc.trim_end) nc.trim_start = nc.trim_end - 0.1;
        return nc;
      }
      return c;
    });
    setClips(updated);
    triggerDebouncedSaveClips(updated);
  };

  const handleRemoveClip = (clipId: string) => {
    const updated = clips.filter(c => c.id !== clipId);
    setClips(updated);
    if (selectedClipId === clipId) setSelectedClipId(null);
    triggerDebouncedSaveClips(updated);
  };

  const handleMoveClip = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= clips.length) return;
    const updated = [...clips];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setClips(updated);
    triggerDebouncedSaveClips(updated);
  };

  // Overlay Handlers
  const handleAddTextOverlay = () => {
    const newOverlay: VideoOverlay = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      text: 'New Caption',
      font_size: 24,
      color: '#ffffff',
      x: 35,
      y: 80,
      start_time: 0,
      end_time: Math.min(5, totalClipsDuration || 5)
    };
    const updated = [...overlays, newOverlay];
    setOverlays(updated);
    setSelectedOverlayId(newOverlay.id);
    setActiveTab('overlays');
    triggerDebouncedSaveOverlays(updated);
  };

  const handleAddImageOverlay = (file: any) => {
    if (file.kind !== 'image') {
      alert('Only images can be added as logo/watermark overlays.');
      return;
    }
    const newOverlay: VideoOverlay = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      image_url: file.url,
      x: 80,
      y: 10,
      w: 15,
      h: 15,
      start_time: 0,
      end_time: totalClipsDuration || 10
    };
    const updated = [...overlays, newOverlay];
    setOverlays(updated);
    setSelectedOverlayId(newOverlay.id);
    setActiveTab('overlays');
    triggerDebouncedSaveOverlays(updated);
  };

  const handleUpdateOverlay = (overlayId: string, updates: Partial<VideoOverlay>) => {
    const updated = overlays.map(o => {
      if (o.id === overlayId) {
        const no = { ...o, ...updates };
        if (no.start_time < 0) no.start_time = 0;
        if (no.end_time < no.start_time) no.end_time = no.start_time + 0.5;
        return no;
      }
      return o;
    });
    setOverlays(updated);
    triggerDebouncedSaveOverlays(updated);
  };

  const handleRemoveOverlay = (overlayId: string) => {
    const updated = overlays.filter(o => o.id !== overlayId);
    setOverlays(updated);
    if (selectedOverlayId === overlayId) setSelectedOverlayId(null);
    triggerDebouncedSaveOverlays(updated);
  };

  // Music handlers
  const handleSelectMusic = (file: any) => {
    const newMusic = { source_url: file.url, volume: bgMusic.volume };
    setBgMusic(newMusic);
    triggerDebouncedSaveGeneral(projectName, newMusic, outputPreset);
  };

  const handleRemoveMusic = () => {
    const newMusic = { source_url: null, volume: bgMusic.volume };
    setBgMusic(newMusic);
    triggerDebouncedSaveGeneral(projectName, newMusic, outputPreset);
  };

  const handleMusicVolumeChange = (vol: number) => {
    const newMusic = { ...bgMusic, volume: vol };
    setBgMusic(newMusic);
    triggerDebouncedSaveGeneral(projectName, newMusic, outputPreset);
  };

  // Render & Export Queue Poller
  const handleStartRender = async () => {
    if (!selectedProject) return;
    if (clips.length === 0) {
      alert('Cannot render a video with no clips in the timeline queue.');
      return;
    }
    
    // Save state completely first
    await persistChanges({
      name: projectName,
      timeline: { clips, overlays, background_music: bgMusic, output: { resolution: outputPreset } }
    });

    setRenderStatus('rendering');
    setRenderProgress(0);
    setRenderError(null);

    try {
      const response = await api.startVideoRender(selectedProject.id);
      setActiveJobId(response.jobId);
    } catch (err: any) {
      console.error('Failed to start video render:', err);
      setRenderStatus('error');
      setRenderError(err?.message || 'Server failed to initialize video render queue.');
    }
  };

  // Polling loop for active render
  useEffect(() => {
    if (!activeJobId || !selectedProject) return;

    let pollInterval: NodeJS.Timeout;

    const poll = async () => {
      try {
        const res = await api.getVideoRenderStatus(selectedProject.id, activeJobId);
        if (res.status === 'processing') {
          setRenderProgress(res.percent);
        } else if (res.status === 'done') {
          setRenderProgress(100);
          setRenderStatus('done');
          setActiveJobId(null);
          // Reload project details to get output_url
          const updatedProj = await api.getVideoProject(selectedProject.id);
          setSelectedProject(updatedProj);
          setProjects(prev => prev.map(p => p.id === updatedProj.id ? updatedProj : p));
          await refreshMedia();
        } else if (res.status === 'error') {
          setRenderStatus('error');
          setRenderError(res.error || 'Video rendering failed during ffmpeg filters/mixing pipeline.');
          setActiveJobId(null);
        }
      } catch (err) {
        console.error('Error polling render status:', err);
      }
    };

    pollInterval = setInterval(poll, 1500);
    return () => clearInterval(pollInterval);
  }, [activeJobId, selectedProject]);

  // Preview Loop / Synchronization Engine
  // Map "currentTime" of the entire timeline to a specific clip index and its relative playhead
  const getClipAtTimelineTime = (time: number): { clip: VideoClip; localTime: number; clipIndex: number } | null => {
    let accumulated = 0;
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const duration = clip.trim_end - clip.trim_start;
      if (time >= accumulated && time <= accumulated + duration) {
        return {
          clip,
          localTime: clip.trim_start + (time - accumulated),
          clipIndex: i
        };
      }
      accumulated += duration;
    }
    // Fallback to last clip
    if (clips.length > 0) {
      const last = clips[clips.length - 1];
      return { clip: last, localTime: last.trim_end, clipIndex: clips.length - 1 };
    }
    return null;
  };

  // Track preview playhead smoothly reading from refs
  const updatePlayhead = () => {
    if (!isPlayingRef.current) return;

    const player = videoPlayerRef.current;
    if (player) {
      const getClipAtTimelineTimeRef = (time: number) => {
        let accumulated = 0;
        const currentClips = clipsRef.current;
        for (let i = 0; i < currentClips.length; i++) {
          const clip = currentClips[i];
          const duration = clip.trim_end - clip.trim_start;
          if (time >= accumulated && time <= accumulated + duration) {
            return {
              clip,
              localTime: clip.trim_start + (time - accumulated),
              clipIndex: i
            };
          }
          accumulated += duration;
        }
        if (currentClips.length > 0) {
          const last = currentClips[currentClips.length - 1];
          return { clip: last, localTime: last.trim_end, clipIndex: currentClips.length - 1 };
        }
        return null;
      };

      const match = getClipAtTimelineTimeRef(currentTimeRef.current);
      if (match) {
        const { clip, clipIndex } = match;
        const totalDuration = clipsRef.current.reduce((sum, c) => sum + (c.trim_end - c.trim_start), 0);

        // Transition clip if current player position exceeds clip's trim_end
        if (player.currentTime >= clip.trim_end) {
          if (clipIndex < clipsRef.current.length - 1) {
            const nextClip = clipsRef.current[clipIndex + 1];
            let accumulated = 0;
            for (let i = 0; i <= clipIndex; i++) {
              accumulated += (clipsRef.current[i].trim_end - clipsRef.current[i].trim_start);
            }
            setCurrentTime(accumulated);
            player.src = nextClip.source_url;
            player.volume = (nextClip.volume / 100) * (masterVolumeRef.current / 100);
            player.currentTime = nextClip.trim_start;
            player.play().catch(() => {});
          } else {
            setIsPlaying(false);
            setCurrentTime(0);
            player.pause();
          }
        } else {
          // Read native video current time to update playhead smoothly
          let accumulated = 0;
          for (let i = 0; i < clipIndex; i++) {
            accumulated += (clipsRef.current[i].trim_end - clipsRef.current[i].trim_start);
          }
          const globalTime = accumulated + (player.currentTime - clip.trim_start);
          const clampedTime = Math.max(0, Math.min(totalDuration, globalTime));
          setCurrentTime(clampedTime);
        }
      }
    }

    animationFrameId.current = requestAnimationFrame(updatePlayhead);
  };

  // Toggle Playback
  const handleTogglePlay = () => {
    if (totalClipsDuration === 0) return;
    if (isPlaying) {
      setIsPlaying(false);
      if (videoPlayerRef.current) videoPlayerRef.current.pause();
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
    } else {
      setIsPlaying(true);
      if (videoPlayerRef.current) {
        const match = getClipAtTimelineTime(currentTime);
        if (match) {
          videoPlayerRef.current.currentTime = match.localTime;
        }
        videoPlayerRef.current.play().catch(() => {});
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.play().catch(() => {});
      }
    }
  };

  // Sync HTML5 video tag
  useEffect(() => {
    if (clips.length === 0) {
      if (videoPlayerRef.current) videoPlayerRef.current.src = '';
      return;
    }

    const match = getClipAtTimelineTime(currentTime);
    if (!match) return;

    const { clip, localTime } = match;
    const player = videoPlayerRef.current;
    if (!player) return;

    const currentSrc = player.src || '';
    const targetSrc = clip.source_url;
    const normalizedCurrentSrc = currentSrc.replace(window.location.origin, '');
    const normalizedTargetSrc = targetSrc.replace(window.location.origin, '');

    if (normalizedCurrentSrc !== normalizedTargetSrc && currentSrc !== targetSrc) {
      player.src = targetSrc;
      player.load();
    }

    player.volume = (clip.volume / 100) * (masterVolume / 100);
    player.muted = isMuted;

    // Seek the player only if the time difference is substantial to avoid stuttering
    if (Math.abs(player.currentTime - localTime) > 0.45) {
      player.currentTime = localTime;
    }

    if (isPlaying) {
      player.play().catch(() => {});
    } else {
      player.pause();
    }

  }, [currentTime, isPlaying, clips, masterVolume, isMuted]);

  // Sync background music audio element
  useEffect(() => {
    const audio = audioPlayerRef.current;
    if (!audio) return;

    if (!bgMusic.source_url || clips.length === 0) {
      audio.src = '';
      return;
    }

    if (audio.src !== bgMusic.source_url) {
      audio.src = bgMusic.source_url;
      audio.loop = true;
      audio.load();
    }

    audio.volume = (bgMusic.volume / 100) * (masterVolume / 100);
    audio.muted = isMuted;

    if (isPlaying) {
      const targetAudioTime = currentTime % (audio.duration || 300);
      if (Math.abs(audio.currentTime - targetAudioTime) > 0.8) {
        audio.currentTime = targetAudioTime;
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }

  }, [currentTime, isPlaying, bgMusic, clips, masterVolume, isMuted]);

  // Handle animation frame startup on play
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0;
      animationFrameId.current = requestAnimationFrame(updatePlayhead);
    } else {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    }
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isPlaying]);

  return (
    <div className="relative min-h-screen p-6" id="video-editor-view-container">
      {/* Fixed Full Screen Background Image (very bright and beautiful!) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0" 
        style={{
          backgroundImage: `url('/catvideoeditbackground.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 1,
        }}
      />
      
      {/* Content wrapper with higher z-index */}
      <div className="relative z-10 space-y-6">
        {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-theme pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Clapperboard className="w-8 h-8 text-amber-500 shrink-0" />
          <div>
            <h1 className="text-xl font-black text-white tracking-widest uppercase">Video Production Suite</h1>
            <p className="text-xs font-mono text-slate-400 mt-1">Design promotional clips, before/after stories, and social marketing content.</p>
          </div>
        </div>
        
        {selectedProject && (
          <button 
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer text-xs font-bold font-mono self-start"
            id="back-to-list-btn"
          >
            <ChevronLeft className="w-4 h-4" /> BACK TO PROJECTS
          </button>
        )}
      </div>

      {/* 1. PROJECT SELECT / PORTFOLIO LIST VIEW */}
      {!selectedProject ? (
        <div className="space-y-6 animate-fade-in" id="project-list-wrapper">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider font-mono">Active Projects</h2>
            <button
              onClick={handleCreateProject}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 cursor-pointer transition"
              id="new-project-btn"
            >
              <Plus className="w-4 h-4 stroke-[3px]" /> New Video Project
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 font-mono text-xs gap-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <span>Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-white/15 bg-black/30 backdrop-blur-md p-16 text-center shadow-xl">
              <Film className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-white font-black uppercase text-sm tracking-widest">No Projects Created Yet</h3>
              <p className="text-xs text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
                Start by creating your first video project to merge clips, overlay captions/logo, and add background tunes.
              </p>
              <button
                onClick={handleCreateProject}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="project-grid">
              {projects.map((proj) => {
                let clipCount = 0;
                try {
                  const timeline = typeof proj.timeline === 'string' ? JSON.parse(proj.timeline) : proj.timeline;
                  clipCount = timeline?.clips?.length || 0;
                } catch (e) {}

                return (
                  <div 
                    key={proj.id}
                    onClick={() => handleSelectProject(proj)}
                    className="group rounded-2xl border border-white/15 hover:border-amber-400 bg-black/40 backdrop-blur-md hover:bg-black/50 p-5 shadow-xl flex flex-col justify-between cursor-pointer transition duration-300"
                    id={`project-card-${proj.id}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-black ${
                          proj.status === 'rendered' ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' :
                          proj.status === 'error' ? 'bg-rose-950/40 border border-rose-500/20 text-rose-400' :
                          'bg-amber-950/40 border border-amber-500/20 text-amber-400'
                        }`}>
                          {proj.status}
                        </span>
                        <button
                          onClick={(e) => handleDeleteProject(proj.id, e)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-white font-black uppercase text-sm tracking-wider mt-3 truncate group-hover:text-amber-500 transition">
                        {proj.name}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-2">
                        <Video className="w-3.5 h-3.5" />
                        <span>{clipCount} clip{clipCount === 1 ? '' : 's'}</span>
                      </div>
                    </div>

                    <div className="border-t border-white/5 mt-5 pt-4 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-600">
                        Updated {new Date(proj.updated_at).toLocaleDateString()}
                      </span>
                      {proj.output_url ? (
                        <a 
                          href={proj.output_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-[10px] font-bold font-mono text-amber-500 hover:text-amber-400"
                        >
                          <Download className="w-3 h-3" /> EXPORTED MP4
                        </a>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-500/60 font-black uppercase tracking-wider">Draft</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 2. THE EDITOR CANVAS SCREEN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in" id="editor-screen-wrapper">
          
          {/* A. LEFT / SIDEBAR PANEL: MEDIA SELECTOR & UPLOADER (Cols: 3) */}
          <div className="lg:col-span-3 flex flex-col h-[70vh] bg-black/45 backdrop-blur-md border border-white/15 rounded-2xl p-4 overflow-hidden shadow-2xl" id="editor-left-media-sidebar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-wider font-mono">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Media Assets</span>
              </div>
              <button 
                onClick={refreshMedia}
                disabled={mediaLoading}
                className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-50 transition cursor-pointer"
                title="Refresh Assets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${mediaLoading ? 'animate-spin text-amber-500' : ''}`} />
              </button>
            </div>

            {/* Upload Zone */}
            <label className="mt-3 block p-3 border border-dashed border-white/10 hover:border-amber-500/30 rounded-xl bg-white/2 cursor-pointer hover:bg-white/5 transition text-center shrink-0">
              <input 
                type="file" 
                accept="video/*,image/*,audio/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading Asset...</span>
                </div>
              ) : (
                <div className="text-slate-400 space-y-1">
                  <Upload className="w-5 h-5 mx-auto text-slate-500" />
                  <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-300">Upload Media</p>
                  <p className="text-[9px] text-slate-600">Supports video, image logo or audio tracks</p>
                </div>
              )}
            </label>

            {/* Media Asset List */}
            <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2" id="media-assets-scroller">
              {mediaFiles.length === 0 ? (
                <div className="py-12 text-center text-slate-600 text-[10px] font-mono leading-relaxed">
                  No formatted media available. Upload clips using the button above.
                </div>
              ) : (
                mediaFiles.map((file) => (
                  <div 
                    key={file.filename} 
                    className="group relative rounded-xl border border-white/10 bg-black/30 p-2 hover:bg-black/55 hover:border-amber-400 flex gap-2.5 items-center transition"
                  >
                    <div className="w-12 h-10 rounded bg-black/80 flex items-center justify-center shrink-0 overflow-hidden relative border border-white/10">
                      {file.kind === 'image' ? (
                        <img src={file.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : file.kind === 'video' ? (
                        <div className="relative w-full h-full">
                          <video src={file.url} className="w-full h-full object-cover" muted preload="metadata" />
                          <Film className="absolute bottom-1 right-1 w-3 h-3 text-white/75 drop-shadow-md" />
                        </div>
                      ) : (
                        <Music className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-300 truncate font-mono" title={file.filename}>{file.filename}</p>
                      <p className="text-[9px] text-slate-600 font-mono mt-0.5 uppercase">{file.kind}</p>
                    </div>

                    {/* Quick Add Buttons */}
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 absolute right-2 bg-[#12131b]/95 p-1 rounded-lg border border-white/10 transition">
                      {file.kind === 'video' && (
                        <button
                          onClick={() => handleAddClip(file)}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black uppercase rounded tracking-wider cursor-pointer"
                          title="Add Video to Sequence"
                        >
                          + Clip
                        </button>
                      )}
                      {file.kind === 'image' && (
                        <button
                          onClick={() => handleAddImageOverlay(file)}
                          className="px-2 py-1 bg-blue-500 hover:bg-blue-400 text-white text-[9px] font-black uppercase rounded tracking-wider cursor-pointer"
                          title="Overlay as Watermark"
                        >
                          + Logo
                        </button>
                      )}
                      {file.kind === 'other' && file.filename.match(/\.(mp3|wav|ogg|m4a|aac)$/i) && (
                        <button
                          onClick={() => handleSelectMusic(file)}
                          className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black uppercase rounded tracking-wider cursor-pointer"
                          title="Set Background Music"
                        >
                          + Tune
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* B. CENTER PLAYBACK PREVIEW CANVAS (Cols: 6) */}
          <div className="lg:col-span-6 flex flex-col bg-black/30 backdrop-blur-md rounded-2xl overflow-hidden border border-white/15 p-4 justify-between min-h-[50vh] shadow-2xl" id="editor-center-canvas">
            {/* Project Name and Auto-save indicator */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <input 
                type="text"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  triggerDebouncedSaveGeneral(e.target.value, bgMusic, outputPreset);
                }}
                className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-amber-500/50 text-white font-black text-sm uppercase tracking-wider px-1 py-0.5 focus:outline-none w-1/2"
                placeholder="Untitled Video Project"
              />
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-mono uppercase tracking-widest flex items-center gap-1.5 ${
                  savingStatus === 'saving' ? 'text-amber-500' :
                  savingStatus === 'saved' ? 'text-emerald-500' :
                  'text-slate-600'
                }`}>
                  {savingStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {savingStatus === 'saved' && <Check className="w-3 h-3 text-emerald-500" />}
                  {savingStatus === 'saving' ? 'Auto-saving...' : savingStatus === 'saved' ? 'Saved' : 'All Changes Saved'}
                </span>
              </div>
            </div>

            {/* Video Preview Box with bounding Ref */}
            <div 
              ref={previewContainerRef}
              className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/5 my-auto flex items-center justify-center group" 
              id="video-preview-window"
            >
              
              {/* Actual Video Tag playing the active clip */}
              {clips.length > 0 ? (
                <video 
                  ref={videoPlayerRef}
                  className="w-full h-full object-contain pointer-events-none"
                  playsInline
                />
              ) : (
                <div className="text-center text-slate-600 space-y-2 select-none">
                  <Film className="w-12 h-12 mx-auto text-slate-800" />
                  <p className="text-xs font-mono">Sequence Timeline Empty</p>
                  <p className="text-[10px] max-w-xs text-slate-500">Pick video assets from the left panel and click "+ Clip" to start assembling your master cut.</p>
                </div>
              )}

              {/* Invisible Background Music audio driver */}
              <audio ref={audioPlayerRef} className="hidden" />

              {/* Dynamic Overlays Render Canvas Layer */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {overlays.map((ov) => {
                  // Only display overlay if current timeline time falls between start_time and end_time
                  if (currentTime < ov.start_time || currentTime > ov.end_time) return null;

                  const isSelected = selectedOverlayId === ov.id;

                  if (ov.type === 'text') {
                    return (
                      <div 
                        key={ov.id}
                        onMouseDown={(e) => handleOverlayMouseDown(e, ov)}
                        className={`absolute font-black tracking-wide leading-none select-none pointer-events-auto cursor-move transition-all ${
                          isSelected 
                            ? 'border-2 border-dashed border-amber-500 px-2 py-1 bg-black/60 shadow-xl scale-105 z-30 font-black' 
                            : 'hover:border hover:border-dashed hover:border-amber-500/50 px-1'
                        }`}
                        style={{
                          left: `${ov.x}%`,
                          top: `${ov.y}%`,
                          fontSize: `${ov.font_size || 24}px`,
                          color: ov.color || '#ffffff'
                        }}
                      >
                        {ov.text}
                      </div>
                    );
                  } else {
                    return (
                      <img 
                        key={ov.id}
                        src={ov.image_url}
                        alt=""
                        onMouseDown={(e) => handleOverlayMouseDown(e, ov)}
                        className={`absolute object-contain select-none pointer-events-auto cursor-move transition-all ${
                          isSelected 
                            ? 'outline-2 outline-dashed outline-amber-500 bg-black/30 shadow-xl scale-105 z-30' 
                            : 'hover:outline hover:outline-dashed hover:outline-amber-500/50'
                        }`}
                        referrerPolicy="no-referrer"
                        style={{
                          left: `${ov.x}%`,
                          top: `${ov.y}%`,
                          width: `${ov.w || 15}%`,
                          height: `${ov.h || 15}%`
                        }}
                      />
                    );
                  }
                })}
              </div>

              {/* Hover overlay time display */}
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md border border-white/10 px-2 py-1 rounded-md text-[10px] font-mono text-amber-500 font-bold opacity-0 group-hover:opacity-100 transition z-10">
                TIME: {currentTime.toFixed(1)}s / {totalClipsDuration.toFixed(1)}s
              </div>
            </div>

            {/* Playback Controls & Timeline Scrubber */}
            <div className="space-y-3 shrink-0 pt-3">
              {/* Timeline Track Scrubber */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTogglePlay}
                  disabled={clips.length === 0}
                  className="p-2.5 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black transition cursor-pointer shrink-0"
                  id="preview-play-btn"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black" />}
                </button>

                {/* Master Volume Controls */}
                <div className="flex items-center gap-1.5 border-r border-white/10 pr-3 shrink-0">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                    title={isMuted ? "Unmute Master Volume" : "Mute Master Volume"}
                  >
                    {isMuted || masterVolume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-amber-500" />
                    )}
                  </button>
                  <input 
                    type="range"
                    min={0}
                    max={100}
                    value={masterVolume}
                    onChange={(e) => {
                      setMasterVolume(parseInt(e.target.value, 10));
                      if (isMuted) setIsMuted(false);
                    }}
                    className="w-16 h-1 accent-amber-500 bg-white/5 rounded-lg appearance-none cursor-pointer"
                    title={`Master Volume: ${masterVolume}%`}
                  />
                  <span className="text-[9px] font-mono text-slate-500 w-6 text-right">{masterVolume}%</span>
                </div>

                {/* Interactive Scrubber Slider */}
                <div className="flex-1 relative">
                  <input 
                    type="range"
                    min={0}
                    max={totalClipsDuration || 1}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => {
                      setIsPlaying(false);
                      const val = parseFloat(e.target.value);
                      setCurrentTime(val);
                      const match = getClipAtTimelineTime(val);
                      if (match && videoPlayerRef.current) {
                        videoPlayerRef.current.currentTime = match.localTime;
                      }
                    }}
                    className="w-full accent-amber-500 cursor-pointer bg-white/10 h-1.5 rounded-lg appearance-none"
                    id="preview-scrubber"
                  />
                </div>

                <div className="text-[10px] font-mono text-slate-400 w-24 text-right shrink-0">
                  {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor(totalClipsDuration / 60)}:{String(Math.floor(totalClipsDuration % 60)).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>

          {/* C. RIGHT PANEL: DETAILED CLIP/OVERLAY/MUSIC EDIT CONTROLS (Cols: 3) */}
          <div className="lg:col-span-3 flex flex-col h-[70vh] bg-black/45 backdrop-blur-md border border-white/15 rounded-2xl p-4 overflow-hidden shadow-2xl" id="editor-right-settings-sidebar">
            <div className="flex border-b border-white/10 shrink-0">
              {(['clips', 'overlays', 'music', 'export'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider border-b-2 transition cursor-pointer text-center ${
                    activeTab === tab ? 'border-amber-500 text-white' : 'border-transparent text-slate-500 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
              {/* TABS: CLIPS DETAIL EDITOR */}
              {activeTab === 'clips' && (
                <div className="space-y-4" id="clips-settings-tab">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Clip Sequence</span>
                    <span className="text-[10px] font-mono text-slate-500">{clips.length} clip{clips.length === 1 ? '' : 's'}</span>
                  </div>

                  {clips.length === 0 ? (
                    <p className="text-[10px] font-mono text-slate-500 text-center py-6 leading-relaxed">
                      Add a video clip from the Left assets sidebar to start compiling your master layout.
                    </p>
                  ) : (
                    <div className="space-y-3" id="sequential-clips-list">
                      {clips.map((clip, idx) => {
                        const isSelected = selectedClipId === clip.id;
                        return (
                          <div 
                            key={clip.id}
                            onClick={() => setSelectedClipId(clip.id)}
                            className={`rounded-xl border p-3 cursor-pointer transition ${
                              isSelected ? 'border-amber-400 bg-black/60' : 'border-white/10 bg-black/35 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-slate-300 font-mono truncate w-32">{idx + 1}. {clip.name}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  disabled={idx === 0}
                                  onClick={(e) => { e.stopPropagation(); handleMoveClip(idx, 'up'); }}
                                  className="p-1 rounded text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-20 cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  disabled={idx === clips.length - 1}
                                  onClick={(e) => { e.stopPropagation(); handleMoveClip(idx, 'down'); }}
                                  className="p-1 rounded text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-20 cursor-pointer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemoveClip(clip.id); }}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Expanded options for selected clip */}
                            {isSelected && (
                              <div className="space-y-3 mt-3 pt-3 border-t border-white/5 animate-fade-in" onClick={e => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-mono font-bold text-slate-500 uppercase">Trim Settings (Duration: {clip.duration.toFixed(1)}s)</label>
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div>
                                      <span className="text-[8px] font-mono text-slate-600 block">START TIME (SEC)</span>
                                      <input 
                                        type="number" 
                                        min={0}
                                        max={clip.trim_end - 0.1}
                                        step={0.1}
                                        value={clip.trim_start}
                                        onChange={(e) => handleUpdateClip(clip.id, { trim_start: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-amber-500"
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[8px] font-mono text-slate-600 block">END TIME (SEC)</span>
                                      <input 
                                        type="number" 
                                        min={clip.trim_start + 0.1}
                                        max={clip.duration}
                                        step={0.1}
                                        value={clip.trim_end}
                                        onChange={(e) => handleUpdateClip(clip.id, { trim_end: parseFloat(e.target.value) || clip.duration })}
                                        className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-amber-500"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-500 uppercase">
                                    <span>Volume level</span>
                                    <span>{clip.volume}%</span>
                                  </div>
                                  <input 
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={clip.volume}
                                    onChange={(e) => handleUpdateClip(clip.id, { volume: parseInt(e.target.value, 10) })}
                                    className="w-full accent-amber-500 bg-white/5 cursor-pointer h-1 rounded-lg appearance-none mt-1"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TABS: OVERLAYS DETAIL EDITOR */}
              {activeTab === 'overlays' && (
                <div className="space-y-4" id="overlays-settings-tab">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Graphic & Caption Layers</span>
                    <button
                      onClick={handleAddTextOverlay}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 hover:text-black text-[9px] font-bold text-amber-500 uppercase tracking-wide transition cursor-pointer"
                    >
                      <Type className="w-3 h-3" /> Add Text
                    </button>
                  </div>

                  {overlays.length === 0 ? (
                    <p className="text-[10px] font-mono text-slate-500 text-center py-6 leading-relaxed">
                      Add a title/caption overlay using the "+ Text" button, or select an image asset from the Left assets library to overlay a watermark logo.
                    </p>
                  ) : (
                    <div className="space-y-3" id="active-overlays-list">
                      {overlays.map((ov) => {
                        const isSelected = selectedOverlayId === ov.id;
                        return (
                          <div 
                            key={ov.id}
                            onClick={() => setSelectedOverlayId(ov.id)}
                            className={`rounded-xl border p-3 cursor-pointer transition ${
                              isSelected ? 'border-amber-400 bg-black/60' : 'border-white/10 bg-black/35 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {ov.type === 'text' ? <Type className="w-3.5 h-3.5 text-blue-400 shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                <span className="text-[10px] font-bold text-slate-300 font-mono truncate">
                                  {ov.type === 'text' ? `Text: ${ov.text}` : 'Watermark Logo'}
                                </span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveOverlay(ov.id); }}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Expanded options for selected overlay */}
                            {isSelected && (
                              <div className="space-y-3 mt-3 pt-3 border-t border-white/5 animate-fade-in" onClick={e => e.stopPropagation()}>
                                {ov.type === 'text' && (
                                  <>
                                    <div className="space-y-1">
                                      <span className="text-[8px] font-mono text-slate-600 block">CAPTION TEXT</span>
                                      <input 
                                        type="text"
                                        value={ov.text || ''}
                                        onChange={(e) => handleUpdateOverlay(ov.id, { text: e.target.value })}
                                        className="w-full bg-black/60 border border-white/10 rounded px-2.5 py-1.5 text-[10px] font-mono text-white focus:outline-none focus:border-amber-500"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <span className="text-[8px] font-mono text-slate-600 block">FONT SIZE</span>
                                        <input 
                                          type="number"
                                          value={ov.font_size || 24}
                                          onChange={(e) => handleUpdateOverlay(ov.id, { font_size: parseInt(e.target.value, 10) || 24 })}
                                          className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-amber-500"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[8px] font-mono text-slate-600 block">COLOR</span>
                                        <input 
                                          type="color"
                                          value={ov.color || '#ffffff'}
                                          onChange={(e) => handleUpdateOverlay(ov.id, { color: e.target.value })}
                                          className="w-full h-8 bg-black/60 border border-white/10 rounded cursor-pointer"
                                        />
                                      </div>
                                    </div>
                                  </>
                                )}

                                {ov.type === 'image' && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <span className="text-[8px] font-mono text-slate-600 block">WIDTH (%)</span>
                                      <input 
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={ov.w || 15}
                                        onChange={(e) => handleUpdateOverlay(ov.id, { w: parseInt(e.target.value, 10) || 15 })}
                                        className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-amber-500"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[8px] font-mono text-slate-600 block">HEIGHT (%)</span>
                                      <input 
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={ov.h || 15}
                                        onChange={(e) => handleUpdateOverlay(ov.id, { h: parseInt(e.target.value, 10) || 15 })}
                                        className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-amber-500"
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                                  <div className="space-y-1">
                                    <span className="text-[8px] font-mono text-slate-600 block">X POSITION (%)</span>
                                    <input 
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={ov.x}
                                      onChange={(e) => handleUpdateOverlay(ov.id, { x: parseInt(e.target.value, 10) || 0 })}
                                      className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[8px] font-mono text-slate-600 block">Y POSITION (%)</span>
                                    <input 
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={ov.y}
                                      onChange={(e) => handleUpdateOverlay(ov.id, { y: parseInt(e.target.value, 10) || 0 })}
                                      className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                                  <div className="space-y-1">
                                    <span className="text-[8px] font-mono text-slate-600 block">SHOW AT (SEC)</span>
                                    <input 
                                      type="number"
                                      min={0}
                                      step={0.1}
                                      value={ov.start_time}
                                      onChange={(e) => handleUpdateOverlay(ov.id, { start_time: parseFloat(e.target.value) || 0 })}
                                      className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[8px] font-mono text-slate-600 block">HIDE AT (SEC)</span>
                                    <input 
                                      type="number"
                                      min={ov.start_time + 0.1}
                                      step={0.1}
                                      value={ov.end_time}
                                      onChange={(e) => handleUpdateOverlay(ov.id, { end_time: parseFloat(e.target.value) || 5 })}
                                      className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TABS: MUSIC DETAIL EDITOR */}
              {activeTab === 'music' && (
                <div className="space-y-4" id="music-settings-tab">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Background Music Stream</span>
                  </div>

                  {!bgMusic.source_url ? (
                    <div className="text-center py-6">
                      <Music className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
                        No background track active. Pick an audio file from the Left assets sidebar to set the soundscape.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-black/35 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Music className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-[10px] font-mono font-bold text-slate-300 truncate w-36" title={bgMusic.source_url}>
                            {bgMusic.source_url.split('/').pop()}
                          </span>
                        </div>
                        <button
                          onClick={handleRemoveMusic}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 cursor-pointer shrink-0"
                          title="Remove Music"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-500 uppercase">
                          <span>Music Level</span>
                          <span>{bgMusic.volume}%</span>
                        </div>
                        <input 
                          type="range"
                          min={0}
                          max={100}
                          value={bgMusic.volume}
                          onChange={(e) => handleMusicVolumeChange(parseInt(e.target.value, 10))}
                          className="w-full accent-amber-500 bg-white/5 cursor-pointer h-1 rounded-lg appearance-none mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TABS: EXPORT & RENDERING CONTROLS */}
              {activeTab === 'export' && (
                <div className="space-y-4" id="export-settings-tab">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Render Video Output</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-slate-500 font-bold uppercase block">Resolution Quality</span>
                      <div className="grid grid-cols-3 gap-1.5 mt-1">
                        {(['480p', '720p', '1080p'] as const).map((preset) => (
                          <button
                            key={preset}
                            onClick={() => {
                              setOutputPreset(preset);
                              triggerDebouncedSaveGeneral(projectName, bgMusic, preset);
                            }}
                            className={`py-1.5 border rounded-lg text-[10px] font-black uppercase font-mono tracking-wider text-center cursor-pointer transition ${
                              outputPreset === preset 
                                ? 'border-amber-500 bg-amber-500/10 text-white' 
                                : 'border-white/5 bg-white/2 text-slate-500 hover:text-white'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {renderStatus === 'rendering' ? (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3" id="rendering-progress-panel">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold text-amber-500 uppercase flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering...
                          </span>
                          <span className="text-[10px] font-mono text-amber-500 font-bold">{renderProgress}%</span>
                        </div>
                        <div className="w-full bg-amber-950/40 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${renderProgress}%` }}
                          />
                        </div>
                        <p className="text-[9px] font-mono text-amber-500/70 text-center leading-normal">
                          Normalizing aspect ratio and codecs, mixing audio streams, and compiling master file.
                        </p>
                      </div>
                    ) : renderStatus === 'done' ? (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3" id="render-success-panel">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-400" /> Compilation Done!
                        </span>
                        <p className="text-[10px] font-mono text-slate-400 leading-normal">
                          Master video saved securely in Formatted Media database.
                        </p>
                        {selectedProject.output_url && (
                          <a 
                            href={selectedProject.output_url}
                            download={`render_${selectedProject.id}.mp4`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full block text-center px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer transition"
                          >
                            Download MP4 File
                          </a>
                        )}
                      </div>
                    ) : renderStatus === 'error' ? (
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3" id="render-error-panel">
                        <span className="text-[10px] font-mono font-bold text-rose-400 uppercase flex items-center gap-1.5">
                          <X className="w-4 h-4 text-rose-400" /> Compile Failed
                        </span>
                        <p className="text-[10px] font-mono text-rose-300/90 leading-normal break-words">
                          {renderError}
                        </p>
                        <button
                          onClick={handleStartRender}
                          className="w-full text-center px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer transition"
                        >
                          Retry Compilation
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleStartRender}
                        disabled={clips.length === 0}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-45 disabled:cursor-not-allowed active:scale-98 text-black font-black text-[11px] uppercase tracking-widest rounded-xl cursor-pointer transition shadow-lg shadow-amber-500/10"
                        id="trigger-export-btn"
                      >
                        Compile and Export Master
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* BOTTOM MULTI-TRACK VISUAL TIMELINE PANEL (Full-Width, elegant and dynamic) */}
        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/15 p-5 shadow-2xl space-y-4" id="multitrack-timeline-panel">
          {/* Header row with status, title, split buttons and zoom controller */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-xs font-black text-white tracking-widest uppercase font-mono">Sequence Multitrack Timeline</h2>
                <p className="text-[9px] font-mono text-slate-500 mt-0.5">Drag & drop clips to reorder, split at playhead, or trim endpoints visually.</p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              {/* Split Clip Button */}
              <button
                onClick={handleSplitClip}
                disabled={clips.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-45 text-black font-black text-[10px] uppercase tracking-wider transition cursor-pointer"
                title="Cut selected clip at playhead position"
              >
                <Scissors className="w-3.5 h-3.5" />
                Split Clip
              </button>

              {/* Remove selected clip/overlay button */}
              {(selectedClipId || selectedOverlayId) && (
                <button
                  onClick={() => {
                    if (selectedClipId) {
                      handleRemoveClip(selectedClipId);
                    } else if (selectedOverlayId) {
                      handleRemoveOverlay(selectedOverlayId);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white font-bold text-[10px] uppercase tracking-wider transition cursor-pointer animate-fade-in"
                  title="Delete selection from timeline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected
                </button>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={timelineZoom}
                  onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
                  className="w-24 h-1 accent-amber-500 bg-white/5 cursor-pointer rounded-lg appearance-none"
                  title="Timeline zoom scale"
                />
                <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Interactive Ruler & Multi-track Tracks area */}
          <div className="relative overflow-x-auto bg-black/40 rounded-xl border border-white/5 scrollbar-thin scrollbar-thumb-white/10" id="tracks-scrollable-container">
            {/* The multi-track grid system container. Width scales dynamically with total duration * zoom multiplier */}
            <div 
              className="relative py-4 min-w-full select-none"
              style={{ width: `${Math.max(100, (totalClipsDuration || 10) * 15 * timelineZoom)}px` }}
            >
              {/* 1. VISUAL RULER TRACK */}
              <div 
                className="h-6 border-b border-white/10 flex items-end relative cursor-pointer"
                id="timeline-ruler-track"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = clickX / rect.width;
                  const targetTime = ratio * totalClipsDuration;
                  setCurrentTime(Math.max(0, Math.min(totalClipsDuration, targetTime)));
                  if (videoPlayerRef.current) {
                    const match = getClipAtTimelineTime(targetTime);
                    if (match) videoPlayerRef.current.currentTime = match.localTime;
                  }
                }}
              >
                {/* Visual ticks representing seconds */}
                {Array.from({ length: Math.ceil(totalClipsDuration || 10) }).map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute bottom-0 flex flex-col items-center"
                    style={{ left: `${(i / (totalClipsDuration || 10)) * 100}%` }}
                  >
                    <div className={`w-px bg-white/30 ${i % 5 === 0 ? 'h-3 bg-white/60' : 'h-1.5'}`} />
                    {i % 5 === 0 && (
                      <span className="text-[7px] font-mono text-slate-500 absolute -top-4">{i}s</span>
                    )}
                  </div>
                ))}
              </div>

              {/* 2. SEQUENTIAL VIDEO CLIPS TRACK */}
              <div className="relative py-3 border-b border-white/5 group/clips">
                <span className="absolute left-3 top-3 text-[7px] font-mono font-black uppercase text-amber-500 tracking-wider z-10 bg-black/60 px-1 rounded">Video Track</span>
                <div className="flex gap-1 px-1">
                  {clips.length === 0 ? (
                    <div className="w-full h-12 flex items-center justify-center border border-dashed border-white/5 rounded-lg text-[9px] font-mono text-slate-600">
                      Empty Track - Add videos from media files list
                    </div>
                  ) : (
                    clips.map((clip, idx) => {
                      const isSelected = selectedClipId === clip.id;
                      const duration = clip.trim_end - clip.trim_start;
                      const widthPercent = (duration / (totalClipsDuration || 1)) * 100;

                      return (
                        <div
                          key={clip.id}
                          draggable
                          onDragStart={(e) => handleTimelineDragStart(e, idx)}
                          onDragOver={handleTimelineDragOver}
                          onDrop={(e) => handleTimelineDrop(e, idx)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                            setSelectedOverlayId(null);
                          }}
                          className={`relative h-14 rounded-lg border flex flex-col justify-between p-2 cursor-grab active:cursor-grabbing transition-all ${
                            isSelected 
                              ? 'border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/5' 
                              : 'border-white/10 bg-black/50 hover:border-white/25 hover:bg-black/60'
                          }`}
                          style={{ width: `${widthPercent}%` }}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-mono font-black text-slate-300 truncate w-32" title={clip.name}>
                              {idx + 1}. {clip.name}
                            </span>
                            <span className="text-[8px] font-mono text-amber-400 font-bold shrink-0">{duration.toFixed(1)}s</span>
                          </div>

                          <div className="flex items-center justify-between gap-1.5 border-t border-white/5 pt-1 mt-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[7px] font-mono text-slate-500">TRIM: {clip.trim_start.toFixed(1)}s-{clip.trim_end.toFixed(1)}s</span>
                            </div>
                            <span className="text-[7px] font-mono text-slate-600 uppercase font-black bg-white/5 px-1 rounded">vol: {clip.volume}%</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. CAPTIONS & WATERMARK OVERLAYS TRACK */}
              <div className="relative py-2 border-b border-white/5 h-16 group/overlays bg-white/[0.01]">
                <span className="absolute left-3 top-2 text-[7px] font-mono font-black uppercase text-blue-400 tracking-wider z-10 bg-black/60 px-1 rounded">Overlays Track</span>
                
                {overlays.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center border border-dashed border-white/5 rounded-lg text-[9px] font-mono text-slate-600">
                    No active overlays. Click "+ Logo" or use the overlays tab to add caption text.
                  </div>
                ) : (
                  overlays.map((ov) => {
                    const isSelected = selectedOverlayId === ov.id;
                    const duration = ov.end_time - ov.start_time;
                    const leftPercent = (ov.start_time / (totalClipsDuration || 1)) * 100;
                    const widthPercent = (duration / (totalClipsDuration || 1)) * 100;

                    return (
                      <div
                        key={ov.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOverlayId(ov.id);
                          setSelectedClipId(null);
                        }}
                        className={`absolute h-8 rounded-lg border flex items-center justify-between px-2.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-400 bg-blue-500/10 shadow-lg'
                            : 'border-white/10 bg-black/50 hover:border-white/20'
                        }`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          top: '24px'
                        }}
                      >
                        <span className="text-[8px] font-mono font-bold text-slate-300 truncate w-24">
                          {ov.type === 'text' ? `"${ov.text}"` : 'Logo Watermark'}
                        </span>
                        <span className="text-[7px] font-mono text-blue-400 shrink-0 font-bold">{duration.toFixed(1)}s</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 4. BACKGROUND MUSIC AUDIO STREAM TRACK */}
              <div className="relative py-3 group/music">
                <span className="absolute left-3 top-3 text-[7px] font-mono font-black uppercase text-emerald-400 tracking-wider z-10 bg-black/60 px-1 rounded">Audio Track</span>
                
                {!bgMusic.source_url ? (
                  <div className="w-full h-10 flex items-center justify-center border border-dashed border-white/5 rounded-lg text-[9px] font-mono text-slate-600">
                    No active audio stream. Add from Left Sidebar formatted files.
                  </div>
                ) : (
                  <div className="flex px-1">
                    <div 
                      className="h-10 rounded-lg border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between px-3 w-full"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Music className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span className="text-[8px] font-mono text-slate-300 truncate font-bold uppercase tracking-wider">{bgMusic.source_url.split('/').pop()}</span>
                      </div>
                      <span className="text-[8px] font-mono text-emerald-400 font-bold">Vol: {bgMusic.volume}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* LIVE PLAYHEAD VERTICAL SCRIBING LINE */}
              {totalClipsDuration > 0 && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none"
                  style={{ left: `${(currentTime / totalClipsDuration) * 100}%` }}
                >
                  <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 shadow-md flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </>
    )}
      </div> {/* Closing content wrapper with relative z-10 */}
    </div>
  );
}
