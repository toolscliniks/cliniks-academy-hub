import { useState, useEffect, useRef } from 'react';

interface UniversalSecurePlayerProps {
  videoUrl: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  className?: string;
}

export const UniversalSecurePlayerFixed = ({ 
  videoUrl, 
  onProgress, 
  onComplete,
  className = ""
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
    e.preventDefault();
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

  return (
    <div 
      className={`relative w-full ${className}`}
      onContextMenu={handleContextMenu}
      onDragStart={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        className="w-full aspect-video"
        src={videoUrl}
        controls
        controlsList="nodownload"
        onContextMenu={handleContextMenu}
        onDragStart={(e) => e.preventDefault()}
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