import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Maximize, Volume2, Settings, Loader2 } from 'lucide-react';
import { useVideoApi, type VideoInfo } from '@/hooks/useVideoApi';

interface VideoEmbedProps {
  videoUrl?: string;
  videoInfo?: VideoInfo;
  autoplay?: boolean;
  controls?: boolean;
  width?: number;
  height?: number;
  className?: string;
  onVideoLoad?: (info: VideoInfo) => void;
  onProgress?: (seconds: number) => void;
}

const VideoEmbed = ({ 
  videoUrl, 
  videoInfo: providedVideoInfo,
  autoplay = false,
  controls = true,
  width = 560,
  height = 315,
  className = "",
  onVideoLoad,
  onProgress 
}: VideoEmbedProps) => {
  const { fetchVideoInfo, generateEmbedCode, validateVideoUrl, loading } = useVideoApi();
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(providedVideoInfo || null);
  const [embedCode, setEmbedCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (videoUrl && !providedVideoInfo) {
      handleVideoLoad();
    } else if (providedVideoInfo) {
      setVideoInfo(providedVideoInfo);
      generateEmbed(providedVideoInfo);
    }
  }, [videoUrl, providedVideoInfo]);

  const handleVideoLoad = async () => {
    if (!videoUrl) return;

    setError('');
    
    const validation = validateVideoUrl(videoUrl);
    if (!validation.isValid) {
      setError(validation.message || 'URL inválida');
      return;
    }

    const info = await fetchVideoInfo(videoUrl);
    if (info) {
      setVideoInfo(info);
      generateEmbed(info);
      onVideoLoad?.(info);
    }
  };

  const generateEmbed = (info: VideoInfo) => {
    const code = generateEmbedCode(info, {
      autoplay,
      controls,
      width,
      height
    });
    setEmbedCode(code);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // In a real implementation, this would control the iframe player
  };

  if (loading) {
    return (
      <Card className={`bg-gradient-card border-border/50 ${className}`}>
        <CardContent className="flex items-center justify-center" style={{ height: height }}>
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Carregando vídeo...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-gradient-card border-border/50 ${className}`}>
        <CardContent className="flex items-center justify-center" style={{ height: height }}>
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Play className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <Button size="sm" onClick={handleVideoLoad}>
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!videoInfo || !embedCode) {
    return (
      <Card className={`bg-gradient-card border-border/50 ${className}`}>
        <CardContent className="flex items-center justify-center" style={{ height: height }}>
          <div className="text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
              <Play className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum vídeo disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Video Info Header (optional) */}
      {videoInfo.title && (
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-1">{videoInfo.title}</h3>
          {videoInfo.channel_name && (
            <p className="text-sm text-muted-foreground">
              Por {videoInfo.channel_name}
              {videoInfo.published_at && (
                <span> • {new Date(videoInfo.published_at).toLocaleDateString('pt-BR')}</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Video Player */}
      <Card className="bg-gradient-card border-border/50 overflow-hidden">
        <CardContent className="p-0 relative">
          <div 
            className="relative aspect-video bg-black"
            style={{ width: width, height: height }}
          >
            <div 
              dangerouslySetInnerHTML={{ __html: embedCode }}
              className="w-full h-full"
            />
            
            {/* Custom Controls Overlay (if needed) */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayPause}
                    className="text-white hover:bg-white/20"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs">{videoInfo.duration}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <Maximize className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Metadata */}
      <div className="mt-4 space-y-2">
        {videoInfo.description && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              Descrição
            </summary>
            <div className="mt-2 text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
              <p className="whitespace-pre-wrap line-clamp-3 group-open:line-clamp-none">
                {videoInfo.description}
              </p>
            </div>
          </details>
        )}
        
        {(videoInfo.view_count || videoInfo.published_at) && (
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            {videoInfo.view_count && (
              <span>{videoInfo.view_count.toLocaleString('pt-BR')} visualizações</span>
            )}
            {videoInfo.published_at && (
              <span>
                Publicado em {new Date(videoInfo.published_at).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoEmbed;