import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

// Declaração de tipos para a API do YouTube
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | null;
  }
  
  interface YT {
    Player: new (elementId: string, config: YT.PlayerVars) => YT.Player;
    PlayerState: {
      ENDED: number;
      PLAYING: number;
      PAUSED: number;
      BUFFERING: number;
      CUED: number;
    };
  }
  
  namespace YT {
    interface PlayerVars {
      events: {
        onReady?: (event: { target: YT.Player }) => void;
        onStateChange?: (event: { data: number }) => void;
      };
    }
    
    interface Player {
      playVideo(): void;
      pauseVideo(): void;
      stopVideo(): void;
      seekTo(seconds: number, allowSeekAhead: boolean): void;
      mute(): void;
      unMute(): void;
      isMuted(): boolean;
      setVolume(volume: number): void;
      getVolume(): number;
      setPlaybackRate(suggestedRate: number): void;
      getPlaybackRate(): number;
      getAvailablePlaybackRates(): number[];
      setPlaybackQuality(suggestedQuality: string): void;
      getPlaybackQuality(): string;
      getAvailableQualityLevels(): string[];
      getDuration(): number;
      getCurrentTime(): number;
      getPlayerState(): number;
      getIframe(): HTMLIFrameElement;
      destroy(): void;
    }
  }
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VideoQuality {
  label: string;
  value: string;
}

interface PlaybackSpeed {
  label: string;
  value: number;
}

interface ModernVideoPlayerProps {
  videoUrl?: string;
  videoType?: 'upload' | 'youtube' | 'vimeo';
  externalVideoId?: string;
  title?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  className?: string;
}

const ModernVideoPlayer = ({
  videoUrl,
  videoType = 'upload',
  externalVideoId,
  title,
  onProgress,
  onComplete,
  className = '',
}: ModernVideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality>({ label: 'Auto', value: 'auto' });
  const [selectedSpeed, setSelectedSpeed] = useState<PlaybackSpeed>({ label: '1x', value: 1 });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const controlsTimeout = useRef<NodeJS.Timeout>();
  const hideControlsTimeout = useRef<NodeJS.Timeout>();

  // Qualidades disponíveis (simuladas para vídeos do YouTube)
  const qualities: VideoQuality[] = [
    { label: 'Auto', value: 'auto' },
    { label: '1080p', value: 'hd1080' },
    { label: '720p', value: 'hd720' },
    { label: '480p', value: 'medium' },
    { label: '360p', value: 'small' },
  ];

  // Velocidades de reprodução
  const speeds: PlaybackSpeed[] = [
    { label: '0.5x', value: 0.5 },
    { label: '0.75x', value: 0.75 },
    { label: 'Normal', value: 1 },
    { label: '1.25x', value: 1.25 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2 },
  ];

  // Inicialização
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      const handleLoadedData = () => {
        setDuration(video.duration);
        setIsLoading(false);
      };
      
      const handleTimeUpdate = () => {
        if (video.duration) {
          const currentProgress = (video.currentTime / video.duration) * 100;
          setProgress(currentProgress);
          setCurrentTime(video.currentTime);
          onProgress?.(currentProgress);
          
          if (currentProgress >= 99.9) {
            onComplete?.();
          }
        }
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        onComplete?.();
      };
      
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', handleEnded);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      
      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }
  }, [onProgress, onComplete]);

  // Controle de tempo de exibição dos controles
  useEffect(() => {
    if (showControls) {
      clearTimeout(hideControlsTimeout.current);
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    
    return () => {
      clearTimeout(hideControlsTimeout.current);
    };
  }, [showControls]);

  // Controle de tela cheia
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Formatar tempo (MM:SS)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const [youtubePlayer, setYoutubePlayer] = useState<YT.Player | null>(null);

  // Controles do player
  const togglePlayPause = () => {
    if (videoType === 'youtube' && youtubePlayer) {
      if (isPlaying) {
        youtubePlayer.pauseVideo();
      } else {
        youtubePlayer.playVideo();
      }
      setIsPlaying(!isPlaying);
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(error => {
          console.error('Erro ao reproduzir o vídeo:', error);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoType === 'youtube' && youtubePlayer) {
      if (isMuted) {
        youtubePlayer.unMute();
      } else {
        youtubePlayer.mute();
      }
      setIsMuted(!isMuted);
    } else if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    if (videoType === 'youtube' && youtubePlayer) {
      youtubePlayer.setVolume(newVolume * 100);
      if (newVolume === 0) {
        youtubePlayer.mute();
      } else if (isMuted) {
        youtubePlayer.unMute();
      }
    } else if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleProgressChange = (value: number[]) => {
    const newTime = (value[0] / 100) * duration;
    if (videoType === 'youtube' && youtubePlayer) {
      youtubePlayer.seekTo(newTime, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    if (videoType === 'youtube' && youtubePlayer) {
      youtubePlayer.setPlaybackRate(speed);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setSelectedSpeed(speeds.find(s => s.value === speed) || speeds[2]);
  };

  const changeQuality = (quality: VideoQuality) => {
    setSelectedQuality(quality);
    // Aqui você implementaria a lógica para mudar a qualidade do vídeo
    // Para vídeos do YouTube, você precisaria recarregar o iframe com os parâmetros corretos
  };

  // Se for um vídeo do YouTube, renderizamos um iframe estilizado
  if (videoType === 'youtube' && externalVideoId) {
    // URL do script da API do YouTube
    useEffect(() => {
      // Verifica se o script já foi carregado
      if (document.getElementById('youtube-api') || !externalVideoId) return;

      // Cria o script da API do YouTube
      const tag = document.createElement('script');
      tag.id = 'youtube-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      
      // Função para ser chamada quando a API do YouTube estiver pronta
      window.onYouTubeIframeAPIReady = () => {
        if (!window.YT) return;
        
        // Cria o player do YouTube
        const player = new window.YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: externalVideoId,
          playerVars: {
            'autoplay': 0,
            'modestbranding': 1,
            'rel': 0,
            'showinfo': 0,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'iv_load_policy': 3,
            'cc_load_policy': 0,
            'playsinline': 1,
            'origin': window.location.origin,
            'enablejsapi': 1,
            'color': 'white',
            'theme': 'dark',
            'autohide': 1,
            'showsearch': 0
          },
          events: {
            onReady: (event) => {
              // Configurações iniciais do player
              setYoutubePlayer(event.target);
              event.target.mute();
              event.target.setPlaybackQuality('hd1080');
              setIsLoading(false);
              
              // Atualiza a duração do vídeo
              const videoDuration = event.target.getDuration();
              if (videoDuration) setDuration(videoDuration);
            },
            onStateChange: (event) => {
              // Atualiza o estado de reprodução
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                
                // Atualiza a duração quando o vídeo começar a tocar
                const videoDuration = event.target.getDuration();
                if (videoDuration) setDuration(videoDuration);
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              } else if (event.data === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
                onComplete?.();
              }
              
              // Atualiza o tempo atual periodicamente
              if (event.data === window.YT.PlayerState.PLAYING) {
                const updateTime = () => {
                  if (!youtubePlayer) return;
                  const currentTime = youtubePlayer.getCurrentTime();
                  setCurrentTime(currentTime);
                  
                  const videoDuration = youtubePlayer.getDuration();
                  if (videoDuration) {
                    const progress = (currentTime / videoDuration) * 100;
                    setProgress(progress);
                    onProgress?.(progress);
                    
                    if (progress >= 99.9) {
                      onComplete?.();
                    }
                  }
                  
                  if (youtubePlayer.getPlayerState() === window.YT.PlayerState.PLAYING) {
                    requestAnimationFrame(updateTime);
                  }
                };
                
                updateTime();
              }
            }
          }
        });
      };

      // Adiciona o script ao documento
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      return () => {
        // Limpa o callback quando o componente for desmontado
        window.onYouTubeIframeAPIReady = null;
        
        // Remove o player do YouTube
        if (youtubePlayer) {
          youtubePlayer.destroy();
          setYoutubePlayer(null);
        }
      };
    }, [externalVideoId]);

    return (
      <div 
        ref={playerRef}
        className={`relative w-full bg-black rounded-lg overflow-hidden group ${className}`}
        onMouseMove={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <div className="aspect-video w-full relative">
          <div id="youtube-player" className="w-full h-full"></div>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <div className="w-12 h-12 border-4 border-t-primary border-white/20 rounded-full animate-spin"></div>
            </div>
          )}
          {/* Overlay para capturar cliques */}
          <div 
            className="absolute inset-0 z-20 cursor-pointer"
            onClick={togglePlayPause}
            onDoubleClick={toggleFullscreen}
          ></div>
        </div>
        
        {/* Overlay de controles personalizado */}
        <div 
          className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
          onClick={togglePlayPause}
        >
          {/* Botão de play/pause centralizado */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="w-16 h-16 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
              onClick={e => {
                e.stopPropagation();
                togglePlayPause();
              }}
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </Button>
          </div>

          {/* Controles inferiores */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Barra de progresso */}
            <div className="mb-3">
              <Slider
                value={[progress]}
                max={100}
                step={0.1}
                onValueChange={handleProgressChange}
                className="h-1.5 cursor-pointer"
              />
            </div>
            
            {/* Controles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-9 w-9"
                  onClick={e => {
                    e.stopPropagation();
                    togglePlayPause();
                  }}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </Button>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10 h-9 w-9"
                    onClick={e => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-5 w-5" />
                    ) : volume > 0.5 ? (
                      <Volume2 className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                  
                  <div className="w-20">
                    <Slider
                      value={[isMuted ? 0 : volume * 100]}
                      max={100}
                      step={1}
                      onValueChange={value => {
                        handleVolumeChange(value);
                        setShowControls(true);
                      }}
                      className="h-1.5 cursor-pointer"
                    />
                  </div>
                </div>
                
                <div className="text-sm text-white/80">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/10 h-9"
                      onClick={e => e.stopPropagation()}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      <span className="text-xs">{selectedSpeed.label}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-32" onClick={e => e.stopPropagation()}>
                    {speeds.map((speed) => (
                      <DropdownMenuItem
                        key={speed.value}
                        className="flex items-center justify-between"
                        onClick={() => changePlaybackSpeed(speed.value)}
                      >
                        <span>{speed.label}</span>
                        {selectedSpeed.value === speed.value && <Check className="h-4 w-4 ml-2" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/10 h-9"
                      onClick={e => e.stopPropagation()}
                    >
                      <span className="text-xs">{selectedQuality.label}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-32" onClick={e => e.stopPropagation()}>
                    {qualities.map((quality) => (
                      <DropdownMenuItem
                        key={quality.value}
                        className="flex items-center justify-between"
                        onClick={() => changeQuality(quality)}
                      >
                        <span>{quality.label}</span>
                        {selectedQuality.value === quality.value && <Check className="h-4 w-4 ml-2" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-9 w-9"
                  onClick={e => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
                >
                  {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Título do vídeo */}
          {title && (
            <div className="absolute top-4 left-4 right-4">
              <h3 className="text-lg font-medium text-white drop-shadow-lg">{title}</h3>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Para vídeos locais
  return (
    <div 
      ref={playerRef}
      className={`relative w-full bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="w-12 h-12 border-4 border-t-primary border-white/20 rounded-full animate-spin"></div>
        </div>
      )}
      
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full outline-none"
        preload="metadata"
        playsInline
        onClick={togglePlayPause}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (videoRef.current) {
            const { currentTime, duration } = videoRef.current;
            setCurrentTime(currentTime);
            const progress = (currentTime / duration) * 100;
            setProgress(progress);
            onProgress?.(progress);
            
            if (progress >= 99.9) {
              onComplete?.();
            }
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setIsLoading(false);
          }
        }}
      />
      
      {/* Overlay de controles personalizado */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onClick={togglePlayPause}
      >
        {/* Botão de play/pause centralizado */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="w-16 h-16 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
            onClick={e => {
              e.stopPropagation();
              togglePlayPause();
            }}
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </Button>
        </div>

        {/* Controles inferiores */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Barra de progresso */}
          <div className="mb-3">
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              onValueChange={handleProgressChange}
              className="h-1.5 cursor-pointer"
            />
          </div>
          
          {/* Controles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 h-9 w-9"
                onClick={e => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </Button>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-9 w-9"
                  onClick={e => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : volume > 0.5 ? (
                    <Volume2 className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                
                <div className="w-20">
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    max={100}
                    step={1}
                    onValueChange={value => {
                      handleVolumeChange(value);
                      setShowControls(true);
                    }}
                    className="h-1.5 cursor-pointer"
                  />
                </div>
              </div>
              
              <div className="text-sm text-white/80">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10 h-9"
                    onClick={e => e.stopPropagation()}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    <span className="text-xs">{selectedSpeed.label}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-32" onClick={e => e.stopPropagation()}>
                  {speeds.map((speed) => (
                    <DropdownMenuItem
                      key={speed.value}
                      className="flex items-center justify-between"
                      onClick={() => changePlaybackSpeed(speed.value)}
                    >
                      <span>{speed.label}</span>
                      {selectedSpeed.value === speed.value && <Check className="h-4 w-4 ml-2" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 h-9 w-9"
                onClick={e => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
              >
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Título do vídeo */}
        {title && (
          <div className="absolute top-4 left-4 right-4">
            <h3 className="text-lg font-medium text-white drop-shadow-lg">{title}</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernVideoPlayer;
