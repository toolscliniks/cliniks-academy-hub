import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export type VideoType = 'youtube' | 'vimeo' | 'mp4' | 'auto';
export type ProtectionLevel = 'basic' | 'advanced' | 'maximum';

interface UseSecureVideoPlayerProps {
  videoUrl: string;
  videoType?: VideoType;
  externalVideoId?: string;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  protectionLevel?: ProtectionLevel;
  allowDownload?: boolean;
  allowRightClick?: boolean;
}

interface VideoPlayerState {
  isLoading: boolean;
  error: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  playbackRate: number;
  completionPercentage: number;
  hasStarted: boolean;
  buffered: number;
  detectedVideoType: VideoType;
}

interface VideoPlayerActions {
  togglePlayPause: () => void;
  handleVolumeChange: (volume: number[]) => void;
  toggleMute: () => void;
  handleSeek: (time: number[]) => void;
  skipTime: (seconds: number) => void;
  changePlaybackRate: (rate: number) => void;
  toggleFullscreen: () => void;
  resetPlayer: () => void;
  extractVideoId: (url: string, type: VideoType) => string | null;
  detectVideoType: (url: string) => VideoType;
  formatTime: (seconds: number) => string;
}

export const useSecureVideoPlayer = ({
  videoUrl,
  videoType = 'auto',
  externalVideoId,
  onComplete,
  onProgress,
  protectionLevel = 'advanced',
  allowDownload = false,
  allowRightClick = false
}: UseSecureVideoPlayerProps): [VideoPlayerState, VideoPlayerActions] => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ytPlayerRef = useRef<any>(null);

  // Initial state
  const [state, setState] = useState<VideoPlayerState>({
    isLoading: true,
    error: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 50,
    isMuted: false,
    isFullscreen: false,
    playbackRate: 1,
    completionPercentage: 0,
    hasStarted: false,
    buffered: 0,
    detectedVideoType: 'mp4'
  });

  // Detect video type from URL
  const detectVideoType = useCallback((url: string): VideoType => {
    if (videoType !== 'auto') return videoType;
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('vimeo.com')) {
      return 'vimeo';
    }
    return 'mp4';
  }, [videoType]);

  // Extract video ID for external platforms
  const extractVideoId = useCallback((url: string, type: VideoType): string | null => {
    if (externalVideoId) return externalVideoId;
    
    switch (type) {
      case 'youtube':
        const ytPatterns = [
          /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
          /youtube\.com\/embed\/([^&\n?#]+)/,
          /youtube\.com\/v\/([^&\n?#]+)/
        ];
        for (const pattern of ytPatterns) {
          const match = url.match(pattern);
          if (match) return match[1];
        }
        break;
        
      case 'vimeo':
        const vimeoPattern = /vimeo\.com\/(\d+)/;
        const vimeoMatch = url.match(vimeoPattern);
        return vimeoMatch ? vimeoMatch[1] : null;
        
      default:
        return null;
    }
    
    return null;
  }, [externalVideoId]);

  // Format time helper
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Initialize video type detection
  useEffect(() => {
    const type = detectVideoType(videoUrl);
    setState(prev => ({ ...prev, detectedVideoType: type }));
  }, [videoUrl, detectVideoType]);

  // Protection effects
  useEffect(() => {
    if (protectionLevel === 'basic') return;
    
    const handleContextMenu = (e: MouseEvent) => {
      if (!allowRightClick) {
        e.preventDefault();
        toast({
          title: "Ação não permitida",
          description: "Este conteúdo está protegido",
          variant: "destructive"
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (protectionLevel === 'maximum') {
        // Disable common shortcuts
        const blockedKeys = ['F12', 'F11', 'PrintScreen', 'Insert'];
        const blockedCombos = [
          e.ctrlKey && (e.key === 's' || e.key === 'S'), // Ctrl+S
          e.ctrlKey && (e.key === 'u' || e.key === 'U'), // Ctrl+U
          e.ctrlKey && e.shiftKey && (e.key === 'i' || e.key === 'I'), // Ctrl+Shift+I
          e.ctrlKey && e.shiftKey && (e.key === 'j' || e.key === 'J'), // Ctrl+Shift+J
          e.ctrlKey && e.shiftKey && (e.key === 'c' || e.key === 'C'), // Ctrl+Shift+C
        ];
        
        if (blockedKeys.includes(e.key) || blockedCombos.some(combo => combo)) {
          e.preventDefault();
          toast({
            title: "Ação bloqueada",
            description: "Esta funcionalidade foi desabilitada para proteger o conteúdo",
            variant: "destructive"
          });
        }
      }
    };

    const handleSelectStart = (e: Event) => {
      if (protectionLevel === 'maximum') {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [protectionLevel, allowRightClick, toast]);

  // Progress tracking
  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      let current = 0;
      let total = 0;

      if (state.detectedVideoType === 'youtube' && ytPlayerRef.current) {
        current = ytPlayerRef.current.getCurrentTime();
        total = ytPlayerRef.current.getDuration();
      } else if (videoRef.current) {
        current = videoRef.current.currentTime;
        total = videoRef.current.duration;
      }

      if (total > 0) {
        const progress = (current / total) * 100;
        
        setState(prev => ({
          ...prev,
          currentTime: current,
          completionPercentage: progress
        }));
        
        if (onProgress) {
          onProgress(progress);
        }
        
        // Mark as complete when 90% watched
        if (progress >= 90 && !state.hasStarted) {
          setState(prev => ({ ...prev, hasStarted: true }));
          if (onComplete) {
            onComplete();
          }
        }
      }

      // Update buffered progress for HTML5 video
      if (videoRef.current && videoRef.current.buffered.length > 0) {
        const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        const bufferedProgress = (bufferedEnd / total) * 100;
        setState(prev => ({ ...prev, buffered: bufferedProgress }));
      }
    }, 1000);
  }, [state.detectedVideoType, state.hasStarted, onProgress, onComplete]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Control functions
  const togglePlayPause = useCallback(() => {
    if (state.detectedVideoType === 'youtube' && ytPlayerRef.current) {
      if (state.isPlaying) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
    } else if (videoRef.current) {
      if (state.isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [state.isPlaying, state.detectedVideoType]);

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    const vol = newVolume[0];
    
    if (state.detectedVideoType === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(vol);
    } else if (videoRef.current) {
      videoRef.current.volume = vol / 100;
    }
    
    setState(prev => ({
      ...prev,
      volume: vol,
      isMuted: vol === 0
    }));
  }, [state.detectedVideoType]);

  const toggleMute = useCallback(() => {
    if (state.detectedVideoType === 'youtube' && ytPlayerRef.current) {
      if (state.isMuted) {
        ytPlayerRef.current.setVolume(state.volume > 0 ? state.volume : 50);
      } else {
        ytPlayerRef.current.setVolume(0);
      }
    } else if (videoRef.current) {
      if (state.isMuted) {
        videoRef.current.volume = state.volume / 100;
      } else {
        videoRef.current.volume = 0;
      }
    }
    
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, [state.isMuted, state.volume, state.detectedVideoType]);

  const handleSeek = useCallback((newTime: number[]) => {
    const time = newTime[0];
    
    if (state.detectedVideoType === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(time);
    } else if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    
    setState(prev => ({ ...prev, currentTime: time }));
  }, [state.detectedVideoType]);

  const skipTime = useCallback((seconds: number) => {
    const newTime = Math.max(0, Math.min(state.duration, state.currentTime + seconds));
    
    if (state.detectedVideoType === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(newTime);
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    
    setState(prev => ({ ...prev, currentTime: newTime }));
  }, [state.currentTime, state.duration, state.detectedVideoType]);

  const changePlaybackRate = useCallback((rate: number) => {
    if (state.detectedVideoType === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.setPlaybackRate(rate);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    
    setState(prev => ({ ...prev, playbackRate: rate }));
  }, [state.detectedVideoType]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setState(prev => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen?.();
      setState(prev => ({ ...prev, isFullscreen: false }));
    }
  }, []);

  const resetPlayer = useCallback(() => {
    setState({
      isLoading: true,
      error: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 50,
      isMuted: false,
      isFullscreen: false,
      playbackRate: 1,
      completionPercentage: 0,
      hasStarted: false,
      buffered: 0,
      detectedVideoType: detectVideoType(videoUrl)
    });
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  }, [videoUrl, detectVideoType]);

  // Expose refs for external use
  const actions: VideoPlayerActions = {
    togglePlayPause,
    handleVolumeChange,
    toggleMute,
    handleSeek,
    skipTime,
    changePlaybackRate,
    toggleFullscreen,
    resetPlayer,
    extractVideoId,
    detectVideoType,
    formatTime
  };

  // Additional helper functions for external components
  const setPlayerRef = useCallback((ref: HTMLVideoElement | null) => {
    videoRef.current = ref;
  }, []);

  const setContainerRef = useCallback((ref: HTMLDivElement | null) => {
    containerRef.current = ref;
  }, []);

  const setYTPlayerRef = useCallback((ref: any) => {
    ytPlayerRef.current = ref;
  }, []);

  const updateState = useCallback((updates: Partial<VideoPlayerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const startTracking = useCallback(() => {
    startProgressTracking();
  }, [startProgressTracking]);

  return [
    state,
    {
      ...actions,
      setPlayerRef,
      setContainerRef,
      setYTPlayerRef,
      updateState,
      startTracking
    } as VideoPlayerActions & {
      setPlayerRef: (ref: HTMLVideoElement | null) => void;
      setContainerRef: (ref: HTMLDivElement | null) => void;
      setYTPlayerRef: (ref: any) => void;
      updateState: (updates: Partial<VideoPlayerState>) => void;
      startTracking: () => void;
    }
  ];
};

export default useSecureVideoPlayer;