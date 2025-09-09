import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSecureVideoPlayer, VideoType } from '@/hooks/useSecureVideoPlayer';
import '@/styles/youtube-protection.css';

interface BasicProtectedPlayerProps {
  videoUrl?: string;
  videoType?: 'upload' | 'youtube' | 'vimeo' | 'mp4' | 'auto';
  externalVideoId?: string;
  title?: string;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  className?: string;
  autoplay?: boolean;
  showControls?: boolean;
  protectionLevel?: 'basic' | 'advanced' | 'maximum';
}

const BasicProtectedPlayer = ({
  videoUrl,
  videoType = 'auto',
  externalVideoId,
  title,
  onComplete,
  onProgress,
  className = '',
  autoplay = false,
  showControls = true,
  protectionLevel = 'advanced'
}: BasicProtectedPlayerProps) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout>();

  // Use the new secure video player hook
  const [playerState, playerActions] = useSecureVideoPlayer({
    videoUrl: videoUrl || '',
    videoType: videoType as VideoType,
    onComplete,
    onProgress,
    protectionLevel
  });

  const { extractVideoId, formatTime } = playerActions;

  // Função para extrair ID do YouTube
  const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    
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

  // Controle de exibição dos controles
  const handleMouseMove = () => {
    if (showControls) {
      setControlsVisible(true);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
      hideControlsTimeout.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  // Determinar URL do vídeo
  const getVideoEmbedUrl = () => {
    if (videoType === 'youtube') {
      const videoId = externalVideoId || getYouTubeId(videoUrl || '');
      if (!videoId) {
        setError('ID do vídeo do YouTube não encontrado');
        return null;
      }
      
      // URL do YouTube com proteção máxima contra controles nativos
      return `https://www.youtube.com/embed/${videoId}?` + new URLSearchParams({
        autoplay: autoplay ? '1' : '0',
        controls: '1', // Habilitar controles básicos para funcionalidade
        disablekb: '0', // Permitir controles de teclado
        fs: '0', // Desabilitar fullscreen
        iv_load_policy: '3', // Ocultar anotações
        modestbranding: '1', // Ocultar logo do YouTube
        rel: '0', // Não mostrar vídeos relacionados
        showinfo: '0', // Ocultar informações do vídeo
        cc_load_policy: '0', // Ocultar legendas por padrão
        playsinline: '1', // Reproduzir inline no mobile
        origin: window.location.origin,
        enablejsapi: '1',
        widget_referrer: window.location.origin,
        // Proteção adicional contra overlay
        branding: '0', // Remover branding do YouTube
        autohide: '1', // Auto-ocultar controles
        theme: 'dark', // Tema escuro
        color: 'white', // Cor da barra de progresso
        hl: 'pt' // Idioma da interface
      }).toString();
    }
    
    if (videoType === 'vimeo' && externalVideoId) {
      return `https://player.vimeo.com/video/${externalVideoId}?autoplay=0&title=0&byline=0&portrait=0`;
    }
    
    return videoUrl;
  };

  const embedUrl = getVideoEmbedUrl();

  // Renderização de erro
  if (error || !embedUrl) {
    return (
      <div className={`relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center text-white p-8">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Erro ao carregar vídeo</h3>
          <p className="text-gray-300 mb-4">{error || 'Vídeo não disponível'}</p>
          <Button 
            variant="outline" 
            onClick={() => {
              setError(null);
              setIsLoading(true);
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
      className={`relative w-full aspect-video bg-black rounded-lg overflow-hidden group video-protected youtube-protected ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setControlsVisible(false)}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
    >
      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}

      {/* Iframe do vídeo */}
      {videoType === 'youtube' || videoType === 'vimeo' ? (
        <>
          <iframe
            src={embedUrl}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title || 'Vídeo'}
            onLoad={() => {
              setIsLoading(false);
            }}
            onError={() => {
              setError('Erro ao carregar o vídeo');
              setIsLoading(false);
            }}
          />
          {/* YouTube Title Protection Overlay */}
          {videoType === 'youtube' && <div className="video-protection-overlay" />}
        </>
      ) : (
        // Vídeo HTML5 para uploads
        <video
          src={embedUrl}
          className="w-full h-full object-contain"
          controls={false}
          onLoadedData={() => setIsLoading(false)}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            const progress = (video.currentTime / video.duration) * 100;
            onProgress?.(progress);
            
            if (progress >= 95) {
              onComplete?.();
            }
          }}
          onError={() => {
            setError('Erro ao carregar o vídeo');
            setIsLoading(false);
          }}
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
        />
      )}

      {/* Overlay de proteção - apenas para vídeos HTML5 */}
      {videoType !== 'youtube' && videoType !== 'vimeo' && (
        <div 
          className="absolute inset-0 z-10"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Controles customizados simples */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 transition-opacity duration-300 z-30 ${
          controlsVisible && showControls ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ pointerEvents: controlsVisible && showControls ? 'auto' : 'none' }}
      >
        {/* Título do vídeo */}
        {title && (
          <div className="absolute top-6 left-6 right-6">
            <h3 className="text-lg font-semibold text-white drop-shadow-lg bg-black/40 px-4 py-2 rounded-lg backdrop-blur-sm">
              {title}
            </h3>
          </div>
        )}

        {/* Indicador de proteção */}
        <div className="absolute bottom-6 right-6">
          <div className="bg-black/60 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Vídeo Protegido ({protectionLevel})
          </div>
        </div>

        {/* Progress indicator */}
        {playerState.completionPercentage > 0 && (
          <div className="absolute bottom-20 left-6 right-6">
            <div className="bg-black/60 text-white px-3 py-1 rounded text-xs backdrop-blur-sm">
              Progresso: {Math.round(playerState.completionPercentage)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BasicProtectedPlayer;