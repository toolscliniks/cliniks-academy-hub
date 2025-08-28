import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleVideoPlayerProps {
  videoUrl?: string;
  videoType?: 'upload' | 'youtube' | 'vimeo';
  externalVideoId?: string;
  externalVideoPlatform?: string;
  title?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const SimpleVideoPlayer = ({ 
  videoUrl, 
  videoType = 'upload', 
  externalVideoId, 
  title,
  onProgress,
  onComplete 
}: SimpleVideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [ytPlayer, setYtPlayer] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedVideoId, setExternalVideoId] = useState<string | null>(externalVideoId);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    console.log('Video info:', { videoType, externalVideoId, videoUrl });
    
    if (videoType === 'youtube') {
      if (externalVideoId) {
        loadYouTubePlayer();
      } else if (videoUrl) {
        // Extract YouTube ID from URL
        const extractedId = extractYouTubeId(videoUrl);
        if (extractedId) {
          setExternalVideoId(extractedId);
          loadYouTubePlayer();
        } else {
          setError('ID do vídeo do YouTube inválido');
          setIsLoading(false);
        }
      } else {
        setError('URL ou ID do YouTube não fornecido');
        setIsLoading(false);
      }
    } else if (videoType === 'upload' && videoUrl) {
      setIsLoading(false);
    } else {
      setError('Vídeo não disponível');
      setIsLoading(false);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [videoType, externalVideoId, videoUrl]);

  const extractYouTubeId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const loadYouTubePlayer = async () => {
    try {
      if (!window.YT) {
        await loadYouTubeAPI();
      }
      initYouTubePlayer();
    } catch (error) {
      console.error('Error loading YouTube player:', error);
      setError('Erro ao carregar vídeo do YouTube');
      setIsLoading(false);
    }
  };

  const loadYouTubeAPI = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      window.onYouTubeIframeAPIReady = () => {
        resolve();
      };

      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => reject(new Error('Failed to load YouTube API'));
      document.head.appendChild(script);
    });
  };

  const initYouTubePlayer = () => {
    if (!playerRef.current || ytPlayer) return;

    try {
      const player = new window.YT.Player(playerRef.current, {
        height: '100%',
        width: '100%',
        videoId: extractedVideoId || externalVideoId,
        playerVars: {
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
          origin: window.location.origin,
          enablejsapi: 1,
          autoplay: 0
        },
        events: {
          onReady: (event: any) => {
            setIsLoading(false);
            setDuration(event.target.getDuration());
            startProgressTracking(event.target);
          },
          onStateChange: (event: any) => {
            const state = event.data;
            setIsPlaying(state === window.YT.PlayerState.PLAYING);
            
            if (state === window.YT.PlayerState.ENDED) {
              onComplete?.();
            }
          },
          onError: () => {
            setError('Erro ao carregar vídeo');
            setIsLoading(false);
          }
        }
      });

      setYtPlayer(player);
    } catch (error) {
      console.error('Error initializing YouTube player:', error);
      setError('Erro ao inicializar player');
      setIsLoading(false);
    }
  };

  const startProgressTracking = (player: any) => {
    progressInterval.current = setInterval(() => {
      try {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        
        if (duration > 0) {
          const progressPercent = (currentTime / duration) * 100;
          setCurrentTime(currentTime);
          setProgress(progressPercent);
          onProgress?.(progressPercent);
          
          if (progressPercent >= 95) {
            onComplete?.();
          }
        }
      } catch (error) {
        console.error('Error tracking progress:', error);
      }
    }, 1000);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    try {
      if (ytPlayer) {
        if (isPlaying) {
          ytPlayer.pauseVideo();
        } else {
          ytPlayer.playVideo();
        }
      } else if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause();
        } else {
          videoRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const toggleMute = () => {
    try {
      if (ytPlayer) {
        if (isMuted) {
          ytPlayer.unMute();
        } else {
          ytPlayer.mute();
        }
        setIsMuted(!isMuted);
      } else if (videoRef.current) {
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(videoRef.current.muted);
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const toggleFullscreen = () => {
    const container = document.querySelector('.video-container');
    if (container) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen();
      }
    }
  };

  if (error) {
    return (
      <div className="video-container relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-lg mb-2">⚠️ Erro</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  // YouTube Player
  if (videoType === 'youtube' && externalVideoId) {
    return (
      <div 
        className="video-container relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        
        <div ref={playerRef} className="w-full h-full" />

        {/* Controls Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="w-16 h-16 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
              onClick={togglePlayPause}
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </Button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-4 right-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={toggleMute}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>

                <span className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={toggleFullscreen}
              >
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Title */}
        {title && (
          <div className="absolute top-4 left-4 right-4">
            <h3 className="text-white font-semibold text-lg drop-shadow-lg">
              {title}
            </h3>
          </div>
        )}
      </div>
    );
  }

  // Upload Video Player
  return (
    <div 
      className="video-container relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        src={videoUrl}
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;
          setDuration(video.duration);
          setIsLoading(false);
        }}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          setCurrentTime(video.currentTime);
          const progressPercent = (video.currentTime / video.duration) * 100;
          setProgress(progressPercent);
          onProgress?.(progressPercent);
          
          if (progressPercent >= 95) {
            onComplete?.();
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          onComplete?.();
        }}
        onError={() => {
          setError('Erro ao carregar vídeo');
          setIsLoading(false);
        }}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        playsInline
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {/* Controls Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="w-16 h-16 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
            onClick={togglePlayPause}
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </Button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-4 left-4 right-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>

              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Title */}
      {title && (
        <div className="absolute top-4 left-4 right-4">
          <h3 className="text-white font-semibold text-lg drop-shadow-lg">
            {title}
          </h3>
        </div>
      )}
    </div>
  );
};

export default SimpleVideoPlayer;