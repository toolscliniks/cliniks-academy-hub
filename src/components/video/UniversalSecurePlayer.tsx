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
  SkipBack,
  SkipForward
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SecureYouTubePlayer from './SecureYouTubePlayer';
import '@/styles/youtube-protection.css';

export type VideoType = 'youtube' | 'vimeo' | 'mp4' | 'auto';

interface UniversalSecurePlayerProps {
  videoUrl: string;
  videoType?: VideoType;
  externalVideoId?: string;
  title?: string;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  className?: string;
  autoplay?: boolean;
  showControls?: boolean;
  protectionLevel?: 'basic' | 'advanced' | 'maximum';
  allowDownload?: boolean;
  allowRightClick?: boolean;
  showWatermark?: boolean;
  watermarkText?: string;
}

const UniversalSecurePlayer: React.FC<UniversalSecurePlayerProps> = ({
  videoUrl,
  videoType = 'auto',
  externalVideoId,
  title = 'Vídeo Protegido',
  onComplete,
  onProgress,
  className = '',
  autoplay = false,
  showControls = true,
  protectionLevel = 'advanced',
  allowDownload = false,
  allowRightClick = false,
  showWatermark = true,
  watermarkText = 'CLINIKS ACADEMY'
}) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
  const [showSettings, setShowSettings] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [detectedVideoType, setDetectedVideoType] = useState<VideoType>('mp4');
  const [hasStarted, setHasStarted] = useState(false);
  const [buffered, setBuffered] = useState(0);

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

  // Initialize player based on video type
  useEffect(() => {
    const type = detectVideoType(videoUrl);
    setDetectedVideoType(type);
    
    if (type === 'youtube') {
      // YouTube player will be handled by SecureYouTubePlayer component
      return;
    }
    
    setIsLoading(false);
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

  // Video event handlers for HTML5 video
  const handleVideoLoad = useCallback(() => {
    if (!videoRef.current) return;
    
    setDuration(videoRef.current.duration);
    setIsLoading(false);
    
    // Start progress tracking
    progressIntervalRef.current = setInterval(() => {
      if (videoRef.current) {
        const current = videoRef.current.currentTime;
        const total = videoRef.current.duration;
        
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
        
        // Update buffered progress
        if (videoRef.current.buffered.length > 0) {
          const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
          const bufferedProgress = (bufferedEnd / total) * 100;
          setBuffered(bufferedProgress);
        }
      }
    }, 1000);
  }, [onProgress, onComplete, hasStarted]);

  const handleVideoError = useCallback(() => {
    setError('Erro ao carregar o vídeo');
    setIsLoading(false);
  }, []);

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  // Control functions
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    if (!videoRef.current) return;
    
    const vol = newVolume[0] / 100;
    setVolume(newVolume[0]);
    videoRef.current.volume = vol;
    setIsMuted(vol === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isMuted) {
      videoRef.current.volume = volume / 100;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const handleSeek = useCallback((newTime: number[]) => {
    if (!videoRef.current) return;
    
    const time = newTime[0];
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const skipTime = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [currentTime, duration]);

  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return;
    
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render YouTube player if detected
  if (detectedVideoType === 'youtube') {
    const videoId = extractVideoId(videoUrl, 'youtube');
    return (
      <div 
        onContextMenu={(e) => !allowRightClick && e.preventDefault()}
        onSelectStart={(e) => protectionLevel !== 'basic' && e.preventDefault()}
        onDragStart={(e) => protectionLevel !== 'basic' && e.preventDefault()}
        className="select-none"
      >
        <SecureYouTubePlayer
          videoUrl={videoUrl}
          videoId={videoId || undefined}
          title={title}
          onComplete={onComplete}
          onProgress={onProgress}
          className={className}
          autoplay={autoplay}
          showControls={showControls}
        />
      </div>
    );
  }

  // Build Vimeo embed URL
  const buildVimeoUrl = (videoId: string): string => {
    const params = new URLSearchParams({
      title: '0',
      byline: '0',
      portrait: '0',
      controls: showControls ? '1' : '0',
      autoplay: autoplay ? '1' : '0',
      loop: '0',
      muted: '0',
      playsinline: '1'
    });
    
    return `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
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
    <Card 
      className={`w-full overflow-hidden ${className}`} 
      ref={containerRef}
      onContextMenu={(e) => !allowRightClick && e.preventDefault()}
      onSelectStart={(e) => protectionLevel !== 'basic' && e.preventDefault()}
      onDragStart={(e) => protectionLevel !== 'basic' && e.preventDefault()}
    >
      <CardContent className="p-0 relative select-none">
        {/* Security Badge */}
        <div className="absolute top-4 right-4 z-20">
          <Badge variant="secondary" className="bg-black/50 text-white border-0">
            <Shield className="w-3 h-3 mr-1" />
            Protegido
          </Badge>
        </div>

        {/* Watermark */}
        {showWatermark && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="text-white/20 text-4xl font-bold transform rotate-45 select-none">
              {watermarkText}
            </div>
          </div>
        )}

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
        <div className="relative aspect-video bg-black">
          {detectedVideoType === 'vimeo' ? (
            <iframe
              src={buildVimeoUrl(extractVideoId(videoUrl, 'vimeo') || '')}
              className="w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={title}
            />
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full"
                onLoadedMetadata={handleVideoLoad}
                onError={handleVideoError}
                onEnded={handleVideoEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                controlsList={allowDownload ? undefined : 'nodownload'}
                disablePictureInPicture={protectionLevel === 'maximum'}
                playsInline
              >
                <source src={videoUrl} type="video/mp4" />
                Seu navegador não suporta o elemento de vídeo.
              </video>
              
              {/* Custom Controls Overlay */}
              {showControls && !isLoading && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  {/* Progress Bar */}
                  <div className="mb-4">
                    {/* Buffered Progress */}
                    <div className="relative">
                      <div 
                        className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
                        style={{ width: `${buffered}%` }}
                      />
                      <Slider
                        value={[currentTime]}
                        max={duration}
                        step={1}
                        onValueChange={handleSeek}
                        className="w-full relative z-10"
                      />
                    </div>
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
                        onClick={() => skipTime(-10)}
                        className="text-white hover:bg-white/20"
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={togglePlayPause}
                        className="text-white hover:bg-white/20"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => skipTime(10)}
                        className="text-white hover:bg-white/20"
                      >
                        <SkipForward className="h-4 w-4" />
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
                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
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
            </>
          )}
        </div>

        {/* Video Title and Progress */}
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

export default UniversalSecurePlayer;