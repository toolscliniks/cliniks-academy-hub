import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  Loader2,
  SkipBack,
  SkipForward,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Tipos para o player do YouTube
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | null;
  }
}

interface VideoPlayerProps {
  videoUrl?: string;
  videoType?: 'upload' | 'youtube' | 'vimeo';
  externalVideoId?: string;
  title?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  className?: string;
}

interface PlaybackSpeed {
  label: string;
  value: number;
}

interface VideoQuality {
  label: string;
  value: string;
}

const AdvancedVideoPlayer = ({
  videoUrl,
  videoType = 'upload',
  externalVideoId,
  title,
  onProgress,
  onComplete,
  className = '',
}: VideoPlayerProps) => {
  // Estados do player
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState<PlaybackSpeed>({ label: '1x', value: 1 });
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality>({ label: 'Auto', value: 'auto' });
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout>();
  const progressUpdateInterval = useRef<NodeJS.Timeout>();

  // Opções de velocidade
  const speeds: PlaybackSpeed[] = [
    { label: '0.5x', value: 0.5 },
    { label: '0.75x', value: 0.75 },
    { label: '1x', value: 1 },
    { label: '1.25x', value: 1.25 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2 },
  ];

  // Opções de qualidade
  const qualities: VideoQuality[] = [
    { label: 'Auto', value: 'auto' },
    { label: '1080p', value: 'hd1080' },
    { label: '720p', value: 'hd720' },
    { label: '480p', value: 'large' },
    { label: '360p', value: 'medium' },
    { label: '240p', value: 'small' },
  ];

  // Função para extrair ID do YouTube
  const extractYouTubeId = useCallback((url: string): string | null => {
    if (!url) return null;
    
    // Regex mais simples e segura para extrair ID do YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }, []);

  // Função para formatar tempo
  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Controle de exibição dos controles
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // Inicialização do YouTube Player
  const initYouTubePlayer = useCallback(() => {
    if (!playerRef.current || !externalVideoId) return;

    const videoId = externalVideoId || extractYouTubeId(videoUrl || '');
    if (!videoId) {
      setError('ID do vídeo do YouTube não encontrado');
      setIsLoading(false);
      return;
    }

    // Limpar conteúdo anterior
    playerRef.current.innerHTML = '<div id="youtube-player"></div>';

    const player = new window.YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        // Configurações para máxima proteção
        autoplay: 0,
        controls: 0, // Ocultar controles nativos
        disablekb: 1, // Desabilitar controles do teclado
        fs: 0, // Desabilitar fullscreen nativo
        iv_load_policy: 3, // Ocultar anotações
        modestbranding: 1, // Ocultar logo do YouTube
        rel: 0, // Não mostrar vídeos relacionados
        showinfo: 0, // Ocultar informações do vídeo
        cc_load_policy: 0, // Ocultar legendas por padrão
        playsinline: 1, // Reproduzir inline no mobile
        origin: window.location.origin,
        enablejsapi: 1,
        wmode: 'opaque',
        // Configurações adicionais de proteção
        color: 'white',
        theme: 'dark',
        autohide: 1,
        showsearch: 0,
        branding: 0,
      },
      events: {
        onReady: (event: any) => {
          setYoutubePlayer(event.target);
          setDuration(event.target.getDuration());
          setIsLoading(false);
          
          // Iniciar atualização de progresso
          progressUpdateInterval.current = setInterval(() => {
            if (event.target && event.target.getCurrentTime) {
              const current = event.target.getCurrentTime();
              const total = event.target.getDuration();
              
              setCurrentTime(current);
              
              if (total > 0) {
                const progressPercent = (current / total) * 100;
                setProgress(progressPercent);
                onProgress?.(progressPercent);
                
                // Verificar se completou (95% ou mais - menos de 1 minuto restante)
                if (progressPercent >= 95) {
                  onComplete?.();
                }
              }
            }
          }, 1000);
        },
        onStateChange: (event: any) => {
          const state = event.data;
          
          if (state === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
          } else if (state === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          } else if (state === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            onComplete?.();
          }
        },
        onError: (event: any) => {
          console.error('YouTube Player Error:', event.data);
          setError('Erro ao carregar o vídeo do YouTube');
          setIsLoading(false);
        }
      }
    });
  }, [externalVideoId, videoUrl, extractYouTubeId, onProgress, onComplete]);

  // Carregar API do YouTube
  useEffect(() => {
    if (videoType === 'youtube') {
      if (window.YT && window.YT.Player) {
        initYouTubePlayer();
      } else {
        // Carregar API do YouTube
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.id = 'youtube-api-script';
        
        window.onYouTubeIframeAPIReady = () => {
          initYouTubePlayer();
        };

        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
    } else {
      setIsLoading(false);
    }

    return () => {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [videoType, initYouTubePlayer]);

  // Controle de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Funções de controle
  const togglePlayPause = useCallback(() => {
    if (youtubePlayer) {
      if (isPlaying) {
        youtubePlayer.pauseVideo();
      } else {
        youtubePlayer.playVideo();
      }
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [youtubePlayer, isPlaying]);

  const toggleMute = useCallback(() => {
    if (youtubePlayer) {
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
  }, [youtubePlayer, isMuted]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    
    if (youtubePlayer) {
      youtubePlayer.setVolume(newVolume * 100);
      setIsMuted(newVolume === 0);
    } else if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
      setIsMuted(newVolume === 0);
    }
  }, [youtubePlayer]);

  const handleProgressChange = useCallback((value: number[]) => {
    const newTime = (value[0] / 100) * duration;
    
    if (youtubePlayer) {
      youtubePlayer.seekTo(newTime, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    
    setCurrentTime(newTime);
  }, [youtubePlayer, duration]);

  const skipBackward = useCallback(() => {
    const newTime = Math.max(0, currentTime - 10);
    
    if (youtubePlayer) {
      youtubePlayer.seekTo(newTime, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  }, [youtubePlayer, currentTime]);

  const skipForward = useCallback(() => {
    const newTime = Math.min(duration, currentTime + 10);
    
    if (youtubePlayer) {
      youtubePlayer.seekTo(newTime, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  }, [youtubePlayer, currentTime, duration]);

  const changePlaybackSpeed = useCallback((speed: number) => {
    if (youtubePlayer) {
      youtubePlayer.setPlaybackRate(speed);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    
    setSelectedSpeed(speeds.find(s => s.value === speed) || speeds[2]);
  }, [youtubePlayer, speeds]);

  const changeQuality = useCallback((quality: VideoQuality) => {
    if (youtubePlayer) {
      youtubePlayer.setPlaybackQuality(quality.value);
    }
    setSelectedQuality(quality);
  }, [youtubePlayer]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Renderização de erro
  if (error) {
    return (
      <div className={`relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center text-white p-8">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Erro ao carregar vídeo</h3>
          <p className="text-gray-300 mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => {
              setError(null);
              setIsLoading(true);
              if (videoType === 'youtube') {
                initYouTubePlayer();
              }
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={playerRef}
      className={`relative w-full aspect-video bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
      onContextMenu={(e) => e.preventDefault()} // Desabilitar menu de contexto
      style={{ userSelect: 'none' }} // Desabilitar seleção de texto
    >
      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}

      {/* Vídeo HTML5 (para uploads) */}
      {videoType === 'upload' && videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              setIsLoading(false);
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current) {
              const current = videoRef.current.currentTime;
              const total = videoRef.current.duration;
              
              setCurrentTime(current);
              
              if (total > 0) {
                const progressPercent = (current / total) * 100;
                setProgress(progressPercent);
                onProgress?.(progressPercent);
                
                if (progressPercent >= 95) {
                  onComplete?.();
                }
              }
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            onComplete?.();
          }}
          controlsList="nodownload nofullscreen noremoteplaybook"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
        />
      )}

      {/* Overlay de proteção para YouTube */}
      {videoType === 'youtube' && (
        <div 
          className="absolute inset-0 z-10"
          style={{ pointerEvents: showControls ? 'none' : 'auto' }}
          onClick={togglePlayPause}
          onDoubleClick={toggleFullscreen}
        />
      )}

      {/* Controles customizados */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 transition-opacity duration-300 z-30 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ pointerEvents: showControls ? 'auto' : 'none' }}
      >
        {/* Botão de play/pause central */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="w-20 h-20 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm border border-white/20"
            onClick={togglePlayPause}
          >
            {isPlaying ? (
              <Pause className="w-10 h-10" />
            ) : (
              <Play className="w-10 h-10 ml-1" />
            )}
          </Button>
        </div>

        {/* Controles inferiores */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          {/* Barra de progresso */}
          <div className="mb-4">
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              onValueChange={handleProgressChange}
              className="h-2 cursor-pointer"
            />
          </div>

          {/* Controles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={togglePlayPause}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>

              {/* Skip Backward */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={skipBackward}
              >
                <SkipBack className="h-5 w-5" />
              </Button>

              {/* Skip Forward */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={skipForward}
              >
                <SkipForward className="h-5 w-5" />
              </Button>

              {/* Volume */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-10 w-10"
                  onClick={toggleMute}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                
                <div className="w-24">
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    className="h-1.5"
                  />
                </div>
              </div>

              {/* Tempo */}
              <div className="text-sm text-white/90 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Velocidade */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 h-10 px-3"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    {selectedSpeed.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-32">
                  {speeds.map((speed) => (
                    <DropdownMenuItem
                      key={speed.value}
                      className={`cursor-pointer ${
                        selectedSpeed.value === speed.value ? 'bg-primary/20' : ''
                      }`}
                      onClick={() => changePlaybackSpeed(speed.value)}
                    >
                      {speed.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Qualidade (apenas YouTube) */}
              {videoType === 'youtube' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 h-10 px-3"
                    >
                      {selectedQuality.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-32">
                    {qualities.map((quality) => (
                      <DropdownMenuItem
                        key={quality.value}
                        className={`cursor-pointer ${
                          selectedQuality.value === quality.value ? 'bg-primary/20' : ''
                        }`}
                        onClick={() => changeQuality(quality)}
                      >
                        {quality.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Título do vídeo */}
        {title && (
          <div className="absolute top-6 left-6 right-6">
            <h3 className="text-lg font-semibold text-white drop-shadow-lg bg-black/40 px-4 py-2 rounded-lg backdrop-blur-sm">
              {title}
            </h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedVideoPlayer;