import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface SecureYouTubePlayerProps {
  videoId: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  className?: string;
}

export const SecureYouTubePlayerFixed = ({ 
  videoId, 
  onProgress, 
  onComplete,
  className = ""
}: SecureYouTubePlayerProps) => {
  const [player, setPlayer] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);

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

  const onStateChange = useCallback((event: any) => {
    if (!event.target) return;
    
    try {
      const currentTimeNum = Number(event.target.getCurrentTime()) || 0;
      const totalDuration = Number(event.target.getDuration()) || 0;
      
      setCurrentTime(currentTimeNum);
      
      if (totalDuration > 0) {
        const progress = (currentTimeNum / totalDuration) * 100;
        onProgress?.(progress);
        
        // Check completion (95% watched)
        if (progress >= 95) {
          onComplete?.();
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
    if (typeof window !== 'undefined' && videoId) {
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
            videoId: videoId,
            playerVars: {
              controls: 1,
              disablekb: 1,
              rel: 0,
              showinfo: 0,
              modestbranding: 1,
              fs: 0,
              iv_load_policy: 3
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
  }, [videoId, onPlayerReady, onStateChange]);

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