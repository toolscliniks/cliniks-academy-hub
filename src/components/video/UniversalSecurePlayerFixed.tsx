import { useState, useEffect, useRef } from 'react';

interface UniversalSecurePlayerProps {
  videoUrl: string;
  videoType?: 'auto' | 'youtube' | 'vimeo' | 'mp4';
  title?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  className?: string;
  showControls?: boolean;
  autoplay?: boolean;
  allowFullscreen?: boolean;
  protectionLevel?: 'basic' | 'advanced' | 'maximum';
  watermark?: string;
  allowDownload?: boolean;
  allowRightClick?: boolean;
  showWatermark?: boolean;
  watermarkText?: string;
}

export const UniversalSecurePlayerFixed = ({ 
  videoUrl,
  videoType = 'auto',
  title,
  onProgress, 
  onComplete,
  className = "",
  showControls = true,
  autoplay = false,
  allowFullscreen = true,
  protectionLevel = 'basic',
  watermark,
  allowDownload = false,
  allowRightClick = false,
  showWatermark = false,
  watermarkText
}: UniversalSecurePlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const progress = (video.currentTime / video.duration) * 100;
    onProgress?.(progress);

    // Check for completion (95% watched)
    if (progress >= 95) {
      onComplete?.();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!allowRightClick) {
      e.preventDefault();
    }
  };

  const handleLoadedData = () => {
    setIsLoaded(true);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadeddata', handleLoadedData);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadeddata', handleLoadedData);
      };
    }
  }, []);

  // If it's a YouTube URL, show a message to use the YouTube player instead
  if (videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be')) {
    return (
      <div className={`aspect-video bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <p className="text-gray-600">Para vídeos do YouTube, use o SecureYouTubePlayer</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full ${className}`}
      onContextMenu={handleContextMenu}
      onDragStart={(e) => e.preventDefault()}
    >
      {((watermark || watermarkText) && showWatermark) && (
        <div className="absolute top-4 right-4 z-10 bg-black/50 text-white px-2 py-1 rounded text-sm">
          {watermark || watermarkText}
        </div>
      )}
      
      <video
        ref={videoRef}
        className="w-full aspect-video"
        src={videoUrl}
        controls={showControls}
        autoPlay={autoplay}
        controlsList={allowDownload ? undefined : "nodownload"}
        onContextMenu={handleContextMenu}
        onDragStart={(e) => e.preventDefault()}
        title={title}
      >
        Seu navegador não suporta vídeos HTML5.
      </video>
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-500">Carregando vídeo...</div>
        </div>
      )}
    </div>
  );
};