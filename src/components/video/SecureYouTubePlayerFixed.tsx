import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface SecureYouTubePlayerProps {
  videoId?: string;
  videoUrl?: string;
  title?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void | Promise<void>;
  className?: string;
  showControls?: boolean;
  autoplay?: boolean;
}

export const SecureYouTubePlayerFixed = ({ 
  videoId, 
  videoUrl,
  title,
  onProgress, 
  onComplete,
  className = "",
  showControls = true,
  autoplay = false
}: SecureYouTubePlayerProps) => {
  const [player, setPlayer] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);

  // Extract video ID from URL if needed
  const getVideoId = () => {
    if (videoId) return videoId;
    if (videoUrl) {
      const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|watch\?v=|embed\/|v\/)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = videoUrl.match(regex);
      return match ? match[1] : null;
    }
    return null;
  };

  const finalVideoId = getVideoId();

  const onPlayerReady = useCallback((event: any) => {
    setPlayer(event.target);
    setIsReady(true);
    
    try {
      const playerDuration = Number(event.target.getDuration()) || 0;
      setDuration(playerDuration);
    } catch (error) {
      console.warn('Error getting duration:', error);
    }
  }, []);

  const onStateChange = useCallback(async (event: any) => {
    if (!event.target) return;
    
    try {
      const currentTimeNum = Number(event.target.getCurrentTime()) || 0;
      const totalDuration = Number(event.target.getDuration()) || 0;
      
      setCurrentTime(currentTimeNum);
      
      if (totalDuration > 0) {
        const progress = (currentTimeNum / totalDuration) * 100;
        onProgress?.(progress);
        
        // Check completion (95% watched)
        if (progress >= 95 && onComplete) {
          await onComplete();
        }
      }
    } catch (error) {
      console.warn('Error in state change:', error);
    }
  }, [onProgress, onComplete]);

  // Prevent context menu and other security measures
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent common shortcuts
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && finalVideoId) {
      // Load YouTube API if not already loaded
      if (!window.YT) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(script);
      }

      // Initialize player when API is ready
      window.onYouTubeIframeAPIReady = () => {
        if (playerRef.current) {
          new window.YT.Player(playerRef.current, {
            videoId: finalVideoId,
            playerVars: {
              controls: showControls ? 1 : 0,
              disablekb: 1,
              rel: 0,
              showinfo: 0,
              modestbranding: 1,
              fs: 0,
              iv_load_policy: 3,
              autoplay: autoplay ? 1 : 0
            },
            events: {
              onReady: onPlayerReady,
              onStateChange: onStateChange
            }
          });
        }
      };

      // If API already loaded, initialize immediately
      if (window.YT && window.YT.Player) {
        window.onYouTubeIframeAPIReady();
      }
    }
  }, [finalVideoId, onPlayerReady, onStateChange, showControls, autoplay]);

  if (!finalVideoId) {
    return (
      <div className={`aspect-video bg-gray-100 flex items-center justify-center ${className}`}>
        <p className="text-gray-500">Vídeo não encontrado</p>
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full ${className}`}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
    >
      <div 
        ref={playerRef}
        className="w-full aspect-video"
      />
      
      {/* Security overlay to prevent right-click on video */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />
    </div>
  );
};