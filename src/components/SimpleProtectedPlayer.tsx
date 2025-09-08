import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleProtectedPlayerProps {
  videoUrl?: string;
  videoType?: 'upload' | 'youtube' | 'vimeo';
  externalVideoId?: string;
  title?: string;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  className?: string;
}

// Declaração global para YouTube API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | null;
  }
}

const SimpleProtectedPlayer = ({
  videoUrl,
  videoType = 'upload',
  externalVideoId,
  title,
  onComplete,
  onProgress,
  className = '',
}: SimpleProtectedPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout>();
  const progressInterval = useRef<NodeJS.Timeout>();

  // Função para extrair ID do YouTube de forma simples
  const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    
    // Padrões simples para YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  // Formatar tempo
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Controle de exibição dos controles
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Inicializar YouTube Player
  const initYouTubePlayer = () => {
    if (!playerRef.current) return;

    const videoId = externalVideoId || getYouTubeId(videoUrl || '');
    if (!videoId) {
      setError('ID do vídeo do YouTube não encontrado');
      setIsLoading(false);
      return;
    }

    // Limpar conteúdo anterior de forma segura
    try {
      if (playerRef.current) {
        playerRef.current.innerHTML = '';
        const playerDiv = document.createElement('div');
        playerDiv.id = `youtube-player-${Date.now()}`;
        playerRef.current.appendChild(playerDiv);
        
        const player = new window.YT.Player(playerDiv.id, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            controls: 0, // Ocultar controles nativos
            disablekb: 1, // Desabilitar controles do teclado
            fs: 0, // Desabilitar fullscreen nativo
            iv_load_policy: 3, // Ocultar anotações
            modestbranding: 1, // Ocultar logo do YouTube
            rel: 0, // Não mostrar vídeos relacionados
            showinfo: 0, // Ocultar informações do vídeo
            cc_load_policy: 0, // Ocultar legendas
            playsinline: 1, // Reproduzir inline no mobile
            origin: window.location.origin,
            enablejsapi: 1,
          },
          events: {
            onReady: (event: any) => {
              setYoutubePlayer(event.target);
              setDuration(event.target.getDuration());
              setIsLoading(false);
              
              // Iniciar atualização de progresso
              progressInterval.current = setInterval(() => {
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
      }
    } catch (err) {
      console.error('Erro ao criar player do YouTube:', err);
      setError('Erro ao inicializar o player do YouTube');
      setIsLoading(false);
    }
  };

  // Carregar API do YouTube
  useEffect(() => {
    if (videoType === 'youtube') {
      if (window.YT && window.YT.Player) {
        initYouTubePlayer();
      } else {
        // Carregar API do YouTube
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.id = 'youtube-api-script-simple';
        
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
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [videoType, externalVideoId, videoUrl]);

  // Funções de controle
  const togglePlayPause = () => {
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
  };

  const toggleMute = () => {
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
  };

  const toggleFullscreen = () => {
    const container = playerRef.current;
    if (container) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen();
      }
    }
  };

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
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
    >
      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <div className="w-12 h-12 border-4 border-t-primary border-white/20 rounded-full animate-spin"></div>
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
                
                // Verificar se completou (95% ou mais - menos de 1 minuto restante)
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
          controlsList="nodownload nofullscreen noremoteplayback"
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
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
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

              {/* Volume */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>

              {/* Tempo */}
              <div className="text-sm text-white/90 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={toggleFullscreen}
              >
                <Maximize className="h-5 w-5" />
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

export default SimpleProtectedPlayer;