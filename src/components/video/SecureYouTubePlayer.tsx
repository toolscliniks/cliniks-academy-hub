import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  Shield,
  Loader2,
  AlertCircle,
  Monitor
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import '@/styles/youtube-protection.css';

interface SecureYouTubePlayerProps {
  videoUrl: string;
  videoId?: string;
  title?: string;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  className?: string;
  autoplay?: boolean;
  showControls?: boolean;
}

interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVolume: () => number;
  setVolume: (volume: number) => void;
  seekTo: (seconds: number) => void;
  getPlayerState: () => number;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
  getAvailablePlaybackRates: () => number[];
  getPlaybackQuality: () => string;
  setPlaybackQuality: (quality: string) => void;
  getAvailableQualityLevels: () => string[];
  destroy?: () => void;
}

interface YouTubeEvent {
  target: YouTubePlayer;
  data: number;
}

// YouTube Player States
const YT_PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5
};

const SecureYouTubePlayer: React.FC<SecureYouTubePlayerProps> = ({
  videoUrl,
  videoId: propVideoId,
  title = 'Vídeo Protegido',
  onComplete,
  onProgress,
  className = '',
  autoplay = false,
  showControls = true
}) => {
  const { toast } = useToast();
  const playerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YouTubePlayer | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [availableRates, setAvailableRates] = useState<number[]>([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  const [showSettings, setShowSettings] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [availableQualities, setAvailableQualities] = useState<string[]>(['auto']);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Extract video ID from URL or use provided ID
  const extractVideoId = useCallback((url: string): string | null => {
    if (propVideoId) return propVideoId;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }, [propVideoId]);

  const videoId = extractVideoId(videoUrl);

  // Security: Block developer tools and inspection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12 (Developer Tools)
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Block Ctrl+Shift+I (Developer Tools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Block Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Block Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Block Ctrl+Shift+C (Element Inspector)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Block Ctrl+S (Save Page)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.relative')) {
        setShowSettings(false);
        setShowQualityMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sync fullscreen state with browser fullscreen API
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Global protection against inspection and context menus
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Bloquear teclas de inspeção globalmente quando o player estiver ativo
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U')) ||
        (e.ctrlKey && (e.key === 's' || e.key === 'S'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    const handleGlobalSelectStart = (e: Event) => {
      const target = e.target as Element;
      if (target.closest('.youtube-protected')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleGlobalDragStart = (e: DragEvent) => {
      const target = e.target as Element;
      if (target.closest('.youtube-protected')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Adicionar listeners globais
    document.addEventListener('contextmenu', handleGlobalContextMenu, { capture: true });
    document.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    document.addEventListener('selectstart', handleGlobalSelectStart, { capture: true });
    document.addEventListener('dragstart', handleGlobalDragStart, { capture: true });

    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu, { capture: true });
      document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
      document.removeEventListener('selectstart', handleGlobalSelectStart, { capture: true });
      document.removeEventListener('dragstart', handleGlobalDragStart, { capture: true });
    };
  }, []);

  // Load YouTube API
  useEffect(() => {
    if (!videoId) {
      setError('ID do vídeo inválido');
      setIsLoading(false);
      return;
    }

    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        initializePlayer();
        return;
      }

      if (!document.querySelector('script[src*="youtube"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
      }

      window.onYouTubeIframeAPIReady = initializePlayer;
    };

    loadYouTubeAPI();

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy?.();
        } catch (e) {
          console.warn('Error destroying YouTube player:', e);
        }
      }
    };
  }, [videoId]);

  const initializePlayer = useCallback(() => {
    if (!playerRef.current || !videoId) return;

    try {
      ytPlayerRef.current = new window.YT.Player(playerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          // Security and protection settings
          controls: 0,           // Hide native controls
          disablekb: 1,         // Disable keyboard controls
          fs: 0,                // Disable fullscreen button
          iv_load_policy: 3,    // Hide annotations
          modestbranding: 1,    // Hide YouTube logo
          rel: 0,               // Don't show related videos
          showinfo: 0,          // Hide video info
          cc_load_policy: 0,    // Hide captions by default
          playsinline: 1,       // Play inline on mobile
          origin: window.location.origin,
          enablejsapi: 1,       // Enable JS API
          autoplay: autoplay ? 1 : 0,
          start: 0,
          // Additional protection to remove overlay controls
          loop: 0,
          playlist: videoId,    // Required for loop to work
          color: 'white',       // Player progress bar color
          hl: 'pt',            // Interface language
          widget_referrer: window.location.origin,
          // Remove overlay buttons and info
          branding: 0,         // Remove YouTube branding
          autohide: 1,         // Auto-hide controls
          theme: 'dark'        // Dark theme
        },
        events: {
          onReady: handlePlayerReady,
          onStateChange: handleStateChange,
          onError: handlePlayerError
        }
      });
    } catch (error) {
      console.error('Error initializing YouTube player:', error);
      setError('Erro ao carregar o player de vídeo');
      setIsLoading(false);
    }
  }, [videoId, autoplay]);

  const handlePlayerReady = useCallback((event: any) => {
    setIsLoading(false);
    setDuration(event.target.getDuration());
    setVolume(event.target.getVolume());
    
    const rates = event.target.getAvailablePlaybackRates();
    if (rates && rates.length > 0) {
      setAvailableRates(rates);
    }

    // Get available video qualities
    try {
      const qualities = event.target.getAvailableQualityLevels();
      if (qualities && qualities.length > 0) {
        // Filter out duplicate qualities and sort by resolution
        const uniqueQualities = [...new Set(qualities)];
        const sortedQualities = uniqueQualities.sort((a, b) => {
          const qualityOrder = ['hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
          return qualityOrder.indexOf(a) - qualityOrder.indexOf(b);
        });
        setAvailableQualities(['auto', ...sortedQualities]);
        
        // Set current quality
        const currentQual = event.target.getPlaybackQuality();
        setCurrentQuality(currentQual || 'auto');
        
        // Add quality change listener
        const checkQualityChange = () => {
          if (ytPlayerRef.current) {
            const newQuality = ytPlayerRef.current.getPlaybackQuality();
            if (newQuality && newQuality !== currentQuality) {
              setCurrentQuality(newQuality);
            }
          }
        };
        
        // Check quality changes periodically
        const qualityInterval = setInterval(checkQualityChange, 2000);
        
        // Clean up interval when component unmounts
        return () => clearInterval(qualityInterval);
      }
    } catch (error) {
      console.warn('Could not get video qualities:', error);
      // Fallback to basic qualities if API fails
      setAvailableQualities(['auto', 'hd1080', 'hd720', 'large', 'medium', 'small']);
    }

    // Start progress tracking
    progressIntervalRef.current = setInterval(() => {
      if (ytPlayerRef.current) {
        const current = ytPlayerRef.current.getCurrentTime();
        const total = ytPlayerRef.current.getDuration();
        
        setCurrentTime(current);
        
        if (total > 0) {
          const progress = (current / total) * 100;
          setCompletionPercentage(progress);
          
          if (onProgress) {
            onProgress(progress);
          }
          
          // Mark as complete when 95% watched (less than 1 minute remaining)
          if (progress >= 95 && !hasStarted) {
            setHasStarted(true);
            if (onComplete) {
              onComplete();
            }
          }
        }
      }
    }, 1000);
  }, [onProgress, onComplete, hasStarted]);

  const handleStateChange = useCallback((event: YouTubeEvent) => {
    const state = event.data;
    
    switch (state) {
      case YT_PLAYER_STATE.PLAYING:
        setIsPlaying(true);
        break;
      case YT_PLAYER_STATE.PAUSED:
        setIsPlaying(false);
        break;
      case YT_PLAYER_STATE.ENDED:
        setIsPlaying(false);
        if (onComplete) {
          onComplete();
        }
        break;
      case YT_PLAYER_STATE.BUFFERING:
        // Handle buffering if needed
        break;
    }
  }, [onComplete]);

  const handlePlayerError = useCallback((event: any) => {
    const errorMessages: { [key: number]: string } = {
      2: 'Parâmetro de solicitação inválido',
      5: 'Erro de reprodução HTML5',
      100: 'Vídeo não encontrado',
      101: 'Vídeo não disponível ou privado',
      150: 'Vídeo não disponível ou privado'
    };
    
    const errorMessage = errorMessages[event.data] || 'Erro desconhecido ao carregar o vídeo';
    setError(errorMessage);
    setIsLoading(false);
    
    toast({
      title: "Erro no vídeo",
      description: errorMessage,
      variant: "destructive"
    });
  }, [toast]);

  // Control functions
  const togglePlayPause = useCallback(() => {
    if (!ytPlayerRef.current) return;
    
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
    } else {
      ytPlayerRef.current.playVideo();
    }
  }, [isPlaying]);

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    if (!ytPlayerRef.current) return;
    
    const vol = newVolume[0];
    setVolume(vol);
    ytPlayerRef.current.setVolume(vol);
    setIsMuted(vol === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!ytPlayerRef.current) return;
    
    if (isMuted) {
      ytPlayerRef.current.setVolume(volume > 0 ? volume : 50);
      setIsMuted(false);
    } else {
      ytPlayerRef.current.setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const handleSeek = useCallback((newTime: number[]) => {
    if (!ytPlayerRef.current) return;
    
    const time = newTime[0];
    ytPlayerRef.current.seekTo(time);
    setCurrentTime(time);
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    if (!ytPlayerRef.current) return;
    
    ytPlayerRef.current.setPlaybackRate(rate);
    setPlaybackRate(rate);
    setShowSettings(false);
  }, []);

  const changeQuality = useCallback((quality: string) => {
    if (!ytPlayerRef.current) return;
    
    try {
      if (quality === 'auto') {
        ytPlayerRef.current.setPlaybackQuality('default');
      } else {
        ytPlayerRef.current.setPlaybackQuality(quality);
      }
      
      setCurrentQuality(quality);
      setShowQualityMenu(false);
      
      // Show feedback toast
      toast({
        title: "Qualidade alterada",
        description: `Qualidade definida para ${getQualityLabel(quality)}`,
        duration: 2000,
      });
      
      // Force a small delay to ensure quality change is applied
      setTimeout(() => {
        if (ytPlayerRef.current) {
          const actualQuality = ytPlayerRef.current.getPlaybackQuality();
          if (actualQuality && actualQuality !== quality && quality !== 'auto') {
            console.warn(`Quality change may not have been applied. Requested: ${quality}, Actual: ${actualQuality}`);
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error changing video quality:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a qualidade do vídeo",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [toast]);

  const getQualityLabel = (quality: string): string => {
    const qualityLabels: { [key: string]: string } = {
      'auto': 'Automática',
      'hd2160': '4K (2160p)',
      'hd1440': '1440p',
      'hd1080': '1080p',
      'hd720': '720p',
      'large': '480p',
      'medium': '360p',
      'small': '240p',
      'tiny': '144p'
    };
    return qualityLabels[quality] || quality;
  };

  const toggleFullscreen = useCallback(() => {
    try {
      const elem = containerRef.current;
      if (!elem || !elem.isConnected) {
        console.warn('Container element not available for fullscreen');
        return;
      }

      // Check if already in fullscreen
      const isCurrentlyFullscreen = !!(document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement);

      if (!isCurrentlyFullscreen) {
        // Enter fullscreen with cross-browser support
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) {
          (elem as any).mozRequestFullScreen();
        } else if ((elem as any).msRequestFullscreen) {
          (elem as any).msRequestFullscreen();
        } else {
          console.warn('Fullscreen API not supported');
          return;
        }
      } else {
        // Exit fullscreen with cross-browser support
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.warn('Fullscreen operation failed:', error);
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar vídeo</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
          >
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card ref={containerRef} className={`w-full overflow-hidden video-protected ${className}`}>
      <CardContent className="p-0 relative">
        {/* Security Badge */}
        <div className="absolute top-4 right-4 z-20">
          <Badge variant="secondary" className="bg-black/50 text-white border-0">
            <Shield className="w-3 h-3 mr-1" />
            Protegido
          </Badge>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Carregando vídeo...</p>
            </div>
          </div>
        )}

        {/* Video Player Container */}
        <div 
          className="relative aspect-video bg-black youtube-protected"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          }}

          onDragStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
          onKeyDown={(e) => {
            // Bloquear F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, etc.
            if (
              e.key === 'F12' ||
              (e.ctrlKey && e.shiftKey && e.key === 'I') ||
              (e.ctrlKey && e.shiftKey && e.key === 'C') ||
              (e.ctrlKey && e.key === 'u') ||
              (e.ctrlKey && e.key === 's') ||
              (e.ctrlKey && e.key === 'a') ||
              (e.ctrlKey && e.key === 'c') ||
              (e.ctrlKey && e.key === 'v') ||
              (e.ctrlKey && e.key === 'x')
            ) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              return false;
            }
          }}
          onMouseDown={(e) => {
            // Bloquear clique direito
            if (e.button === 2) {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }
          }}
          onMouseUp={(e) => {
            // Bloquear clique direito
            if (e.button === 2) {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }
          }}
          onTouchStart={(e) => {
            // Bloquear long press no mobile
            if (e.touches.length > 1) {
              e.preventDefault();
              return false;
            }
          }}
        >
          <div ref={playerRef} className="w-full h-full" />
          
          {/* YouTube Title Protection Overlay */}
          <div className="video-protection-overlay" />
          
          {/* Quality Indicator */}
          {!isLoading && currentQuality && currentQuality !== 'auto' && (
            <div className="absolute top-4 right-4 z-10">
              <Badge 
                variant="secondary" 
                className="bg-black/80 text-white border-white/20 text-xs font-medium px-2 py-1"
              >
                {getQualityLabel(currentQuality)}
              </Badge>
            </div>
          )}
          
          {/* Center Play Button */}
          {!isLoading && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center z-15">
              <Button
                size="lg"
                variant="ghost"
                onClick={togglePlayPause}
                className="bg-black/50 hover:bg-black/70 text-white rounded-full p-6 transition-all duration-200 hover:scale-110"
              >
                <Play className="h-12 w-12" fill="currentColor" />
              </Button>
            </div>
          )}
          
          {/* Click Area for Play/Pause */}
          <div 
            className="absolute inset-0 z-5 cursor-pointer"
            onClick={togglePlayPause}
            style={{ pointerEvents: 'auto' }}
          />
          
          {/* Custom Controls Overlay */}
          {showControls && !isLoading && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={1}
                  onValueChange={handleSeek}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={togglePlayPause}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <div className="w-20">
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        max={100}
                        step={1}
                        onValueChange={handleVolumeChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Quality Control */}
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowQualityMenu(!showQualityMenu)}
                      className="text-white hover:bg-white/20 flex items-center space-x-1"
                      title={`Qualidade atual: ${getQualityLabel(currentQuality)}`}
                    >
                      <Monitor className="h-4 w-4" />
                      <span className="text-xs hidden sm:inline">
                        {currentQuality === 'auto' ? 'Auto' : currentQuality.replace('hd', '').replace('large', '480p').replace('medium', '360p').replace('small', '240p').replace('tiny', '144p')}
                      </span>
                    </Button>
                    
                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-sm rounded-lg p-3 min-w-[160px] shadow-xl border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-white">Qualidade do Vídeo</p>
                          <Badge variant="secondary" className="text-xs">
                            {getQualityLabel(currentQuality)}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {availableQualities.map((quality) => (
                            <button
                              key={quality}
                              onClick={() => changeQuality(quality)}
                              className={`flex items-center justify-between w-full text-left px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                                currentQuality === quality 
                                  ? 'bg-primary/20 text-primary border border-primary/30' 
                                  : 'text-white/80 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <span>{getQualityLabel(quality)}</span>
                              {currentQuality === quality && (
                                <div className="w-2 h-2 bg-primary rounded-full" />
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/10">
                          <p className="text-xs text-white/60">
                            A qualidade automática se ajusta à sua conexão
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Playback Rate */}
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowSettings(!showSettings)}
                      className="text-white hover:bg-white/20"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    
                    {showSettings && (
                      <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-md p-2 min-w-[120px]">
                        <p className="text-xs text-white mb-2">Velocidade</p>
                        {availableRates.map((rate) => (
                          <button
                            key={rate}
                            onClick={() => changePlaybackRate(rate)}
                            className={`block w-full text-left px-2 py-1 text-xs rounded ${
                              playbackRate === rate 
                                ? 'bg-white/20 text-white' 
                                : 'text-white/70 hover:bg-white/10'
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Title */}
        {title && (
          <div className="p-4 border-t">
            <h3 className="font-semibold text-lg">{title}</h3>
            {completionPercentage > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{Math.round(completionPercentage)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SecureYouTubePlayer;

// Extend window object for YouTube API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}