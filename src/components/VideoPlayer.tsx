import { useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  videoUrl?: string;
  videoType?: 'upload' | 'youtube' | 'vimeo';
  externalVideoId?: string;
  externalVideoPlatform?: string;
  title?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

const VideoPlayer = ({ 
  videoUrl, 
  videoType = 'upload', 
  externalVideoId, 
  externalVideoPlatform,
  title,
  onProgress,
  onComplete 
}: VideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const getEmbedUrl = () => {
    if (videoType === 'youtube' && externalVideoId) {
      return `https://www.youtube.com/embed/${externalVideoId}?enablejsapi=1&modestbranding=1&rel=0`;
    }
    if (videoType === 'vimeo' && externalVideoId) {
      return `https://player.vimeo.com/video/${externalVideoId}?color=6366f1&title=0&byline=0&portrait=0`;
    }
    return videoUrl;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // For external videos (YouTube/Vimeo), we use iframe
  if (videoType === 'youtube' || videoType === 'vimeo') {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={getEmbedUrl()}
          title={title || 'Video Player'}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        {title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <h3 className="text-white font-semibold">{title}</h3>
          </div>
        )}
      </div>
    );
  }

  // For uploaded videos, we use HTML5 video with custom controls
  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group">
      <video
        className="w-full h-full object-contain"
        src={videoUrl}
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;
          setDuration(video.duration);
        }}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          setCurrentTime(video.currentTime);
          const progressPercent = (video.currentTime / video.duration) * 100;
          setProgress(progressPercent);
          onProgress?.(progressPercent);
          
          // Check if video is completed (95% threshold)
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
      />

      {/* Custom Controls Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {/* Play/Pause Button (Center) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="w-16 h-16 rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={() => {
              const video = document.querySelector('video');
              if (video) {
                if (isPlaying) {
                  video.pause();
                } else {
                  video.play();
                }
              }
            }}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </Button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-4 left-4 right-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
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
                onClick={() => {
                  const video = document.querySelector('video');
                  if (video && isPlaying) {
                    video.pause();
                  } else if (video) {
                    video.play();
                  }
                }}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => {
                  const video = document.querySelector('video');
                  if (video) {
                    video.currentTime = Math.max(0, video.currentTime - 10);
                  }
                }}
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => {
                  const video = document.querySelector('video');
                  if (video) {
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                  }
                }}
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => {
                  const video = document.querySelector('video');
                  if (video) {
                    video.muted = !video.muted;
                    setIsMuted(video.muted);
                  }
                }}
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
              onClick={() => {
                const video = document.querySelector('video');
                if (video) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    video.requestFullscreen();
                  }
                }
              }}
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Title Overlay */}
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

export default VideoPlayer;