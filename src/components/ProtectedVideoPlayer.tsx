import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Loader2, Settings, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedVideoPlayerProps {
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
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const ProtectedVideoPlayer = ({ 
  videoUrl, 
  videoType = 'upload', 
  externalVideoId, 
  externalVideoPlatform,
  title,
  onProgress,
  onComplete 
}: ProtectedVideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ytPlayer, setYtPlayer] = useState<any>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout>();
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState('auto');
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  useEffect(() => {
    if (videoType === 'youtube' && externalVideoId) {
      loadYouTubeAPI();
    } else {
      setIsLoading(false);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [videoType, externalVideoId]);

  const loadYouTubeAPI = () => {
    if (window.YT && window.YT.Player) {
      initYouTubePlayer();
      return;
    }

    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      initYouTubePlayer();
    };
  };

  const initYouTubePlayer = () => {
    if (!playerRef.current || ytPlayer) return;
    
    // Clear any existing content
    playerRef.current.innerHTML = '';

    const player = new window.YT.Player(playerRef.current, {
      height: '100%',
      width: '100%',
      videoId: externalVideoId,
      playerVars: {
        // Hide YouTube UI elements
        modestbranding: 1, // Hide YouTube logo
        rel: 0, // Don't show related videos
        showinfo: 0, // Hide video title and uploader
        controls: 0, // Hide default controls
        disablekb: 1, // Disable keyboard controls
        fs: 0, // Hide fullscreen button
        iv_load_policy: 3, // Hide annotations
        cc_load_policy: 0, // Hide captions by default
        playsinline: 1, // Play inline on mobile
        origin: window.location.origin,
        enablejsapi: 1,
        autoplay: 0, // Don't autoplay
        start: 0 // Start from beginning
      },
      events: {
        onReady: (event: any) => {
          setIsLoading(false);
          setDuration(event.target.getDuration());
          
          // Start progress tracking
          progressInterval.current = setInterval(() => {
            const currentTime = event.target.getCurrentTime();
            const duration = event.target.getDuration();
            const progressPercent = (currentTime / duration) * 100;
            
            setCurrentTime(currentTime);
            setProgress(progressPercent);
            onProgress?.(progressPercent);
            
            if (progressPercent >= 95) {
              onComplete?.();
            }
          }, 1000);
        },
        onStateChange: (event: any) => {
          const state = event.data;
          if (state === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
          } else if (state === window.YT.PlayerState.PAUSED || state === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
          }
          if (state === window.YT.PlayerState.ENDED) {
            onComplete?.();
          }
        }
      }
    });

    setYtPlayer(player);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    if (ytPlayer) {
      if (isPlaying) {
        ytPlayer.pauseVideo();
      } else {
        ytPlayer.playVideo();
      }
    } else {
      const video = document.querySelector('video');
      if (video) {
        if (isPlaying) {
          video.pause();
        } else {
          video.play();
        }
      }
    }
  };

  const skipBackward = () => {
    if (ytPlayer) {
      const currentTime = ytPlayer.getCurrentTime();
      ytPlayer.seekTo(Math.max(0, currentTime - 10), true);
    } else {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = Math.max(0, video.currentTime - 10);
      }
    }
  };

  const skipForward = () => {
    if (ytPlayer) {
      const currentTime = ytPlayer.getCurrentTime();
      const duration = ytPlayer.getDuration();
      ytPlayer.seekTo(Math.min(duration, currentTime + 10), true);
    } else {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
      }
    }
  };

  const toggleMute = () => {
    if (ytPlayer) {
      if (isMuted) {
        ytPlayer.unMute();
      } else {
        ytPlayer.mute();
      }
      setIsMuted(!isMuted);
    } else {
      const video = document.querySelector('video');
      if (video) {
        video.muted = !video.muted;
        setIsMuted(video.muted);
      }
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (ytPlayer) {
      ytPlayer.setPlaybackRate(rate);
    } else {
      const video = document.querySelector('video');
      if (video) {
        video.playbackRate = rate;
      }
    }
    setShowSpeedMenu(false);
  };

  const changeQuality = (qualityLevel: string) => {
    setQuality(qualityLevel);
    if (ytPlayer) {
      ytPlayer.setPlaybackQuality(qualityLevel);
    }
    setShowQualityMenu(false);
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

  // For YouTube videos
  if (videoType === 'youtube' && externalVideoId) {
    return (
      <div 
        className="video-container relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onContextMenu={(e) => e.preventDefault()} // Disable right-click
        style={{ userSelect: 'none' }} // Disable text selection
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        
        <div 
          ref={playerRef} 
          className="w-full h-full"
          style={{ pointerEvents: 'none' }} // Disable direct interaction with iframe
        />

        {/* Custom Controls Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {/* Play/Pause Button (Center) */}
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

          {/* Bottom Controls */}
          <div className="absolute bottom-6 left-6 right-6">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className="h-full bg-primary transition-all duration-300 shadow-glow"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 backdrop-blur-sm"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 backdrop-blur-sm"
                  onClick={skipBackward}
                >
                  <SkipBack className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 backdrop-blur-sm"
                  onClick={skipForward}
                >
                  <SkipForward className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 backdrop-blur-sm"
                  onClick={toggleMute}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>

                <span className="text-white text-sm font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Speed Control */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 backdrop-blur-sm"
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  >
                    <Gauge className="w-5 h-5" />
                  </Button>
                  {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-2 min-w-[120px]">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          className={`block w-full text-left px-3 py-2 text-sm hover:bg-white/20 rounded ${
                            playbackRate === rate ? 'text-primary' : 'text-white'
                          }`}
                          onClick={() => changePlaybackRate(rate)}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quality Control (YouTube only) */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 backdrop-blur-sm"
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-2 min-w-[100px]">
                      {['auto', 'hd1080', 'hd720', 'large', 'medium', 'small'].map((q) => (
                        <button
                          key={q}
                          className={`block w-full text-left px-3 py-2 text-sm hover:bg-white/20 rounded ${
                            quality === q ? 'text-primary' : 'text-white'
                          }`}
                          onClick={() => changeQuality(q)}
                        >
                          {q === 'auto' ? 'Auto' : q.replace('hd', '').replace('large', '480p').replace('medium', '360p').replace('small', '240p')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 backdrop-blur-sm"
                  onClick={toggleFullscreen}
                >
                  <Maximize className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Title Overlay */}
        {title && (
          <div className="absolute top-6 left-6 right-6">
            <h3 className="text-white font-bold text-xl drop-shadow-xl bg-black/40 px-4 py-2 rounded-lg backdrop-blur-sm">
              {title}
            </h3>
          </div>
        )}

        {/* Protection overlay to prevent iframe interaction */}
        <div 
          className="absolute inset-0 pointer-events-auto" 
          style={{ pointerEvents: showControls ? 'none' : 'auto' }}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    );
  }

  // For uploaded videos
  return (
    <div 
      className="video-container relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
    >
      <video
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
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {/* Custom Controls Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Play/Pause Button (Center) */}
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

        {/* Bottom Controls */}
        <div className="absolute bottom-6 left-6 right-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-primary transition-all duration-300 shadow-glow"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 backdrop-blur-sm"
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 backdrop-blur-sm"
                onClick={skipBackward}
              >
                <SkipBack className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 backdrop-blur-sm"
                onClick={skipForward}
              >
                <SkipForward className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 backdrop-blur-sm"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>

              <span className="text-white text-sm font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Speed Control */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 backdrop-blur-sm"
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                >
                  <Gauge className="w-5 h-5" />
                </Button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-2 min-w-[120px]">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-white/20 rounded ${
                          playbackRate === rate ? 'text-primary' : 'text-white'
                        }`}
                        onClick={() => changePlaybackRate(rate)}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 backdrop-blur-sm"
                onClick={toggleFullscreen}
              >
                <Maximize className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Title Overlay */}
      {title && (
        <div className="absolute top-6 left-6 right-6">
          <h3 className="text-white font-bold text-xl drop-shadow-xl bg-black/40 px-4 py-2 rounded-lg backdrop-blur-sm">
            {title}
          </h3>
        </div>
      )}
    </div>
  );
};

export default ProtectedVideoPlayer;