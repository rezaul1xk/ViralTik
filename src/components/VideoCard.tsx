import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RedditVideo } from '../services/redditService';
import { SkeletonLoader } from './SkeletonLoader';

interface VideoCardProps {
  video: RedditVideo;
  isActive: boolean;
  shouldLoad: boolean;
  isGlobalMuted: boolean;
  onMuteToggle: (muted: boolean) => void;
  onAutoSkip?: () => void;
  onEnded?: () => void;
  loop?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, isActive, shouldLoad, isGlobalMuted, onMuteToggle, onAutoSkip, onEnded, loop = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Haptic feedback helper
  const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(type === 'light' ? 10 : 20);
    }
  };

  // Sync with global mute
  useEffect(() => {
    setIsLocalMuted(isGlobalMuted);
  }, [isGlobalMuted]);

  // Auto-skip logic for slow loading
  useEffect(() => {
    if (isActive && !isLoaded && shouldLoad) {
      // Clear any existing timeout
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      
      // Set a 7-second timeout to skip if not loaded
      loadingTimeoutRef.current = setTimeout(() => {
        if (!isLoaded && isActive && onAutoSkip) {
          console.warn(`Video ${video.id} taking too long to load, skipping...`);
          onAutoSkip();
        }
      }, 7000);
    }

    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [isActive, isLoaded, shouldLoad, onAutoSkip, video.id]);


  useEffect(() => {
    if (videoRef.current && shouldLoad) {
      if (isActive) {
        if (isPlaying) {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              if (videoRef.current) {
                videoRef.current.muted = true;
                setIsLocalMuted(true);
                videoRef.current.play().catch(() => {});
              }
            });
          }
        } else {
          videoRef.current.pause();
        }
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(true); 
      }
    }
  }, [isActive, isPlaying, shouldLoad]);

  const togglePlay = () => {
    triggerHaptic('light');
    setIsPlaying(!isPlaying);
  };

  const handleVideoClick = () => {
    if (isLocalMuted) {
      triggerHaptic('medium');
      setIsLocalMuted(false);
      onMuteToggle(false);
    } else {
      togglePlay();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
    }
  };

  return (
    <motion.div 
      initial={false}
      animate={{ 
        scale: isActive ? 1 : 0.95,
        opacity: isActive ? 1 : 0.4,
        filter: isActive ? 'blur(0px)' : 'blur(10px)',
        rotateX: isActive ? 0 : 2,
        y: isActive ? 0 : (isActive ? -10 : 10)
      }}
      transition={{ 
        duration: 0.5, 
        ease: [0.22, 1, 0.36, 1]
      }}
      className="relative h-screen w-full bg-black flex items-center justify-center overflow-hidden"
    >
      {/* Video Element */}
      {shouldLoad ? (
        <video
          ref={videoRef}
          src={`/api/proxy-asset?url=${encodeURIComponent(video.url)}`}
          poster={video.thumbnail ? `/api/proxy-asset?url=${encodeURIComponent(video.thumbnail)}` : undefined}
          className="h-full w-full object-cover cursor-pointer"
          loop={loop}
          playsInline
          preload="auto"
          muted={isLocalMuted}
          onLoadedData={() => setIsLoaded(true)}
          onCanPlay={() => setIsLoaded(true)}
          onTimeUpdate={handleTimeUpdate}
          onEnded={onEnded}
          onClick={handleVideoClick}
          onError={(e) => {
            console.error('Video element error:', e);
            // If it failed and wasn't already using the proxy, try the proxy
            if (videoRef.current && !videoRef.current.src.includes('/api/proxy-asset')) {
              videoRef.current.src = `/api/proxy-asset?url=${encodeURIComponent(video.url)}`;
              videoRef.current.load();
            }
          }}
        />
      ) : (
        <div className="h-full w-full bg-black">
           <SkeletonLoader />
        </div>
      )}

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-40">
        <motion.div 
          className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          style={{ width: `${progress}%` }}
          transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
        />
      </div>

      {/* Loading State */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <AnimatePresence>
          {!isLoaded && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <SkeletonLoader />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Volume/Play Indicator (Feedback on click) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <AnimatePresence mode="wait">
          {!isPlaying ? (
            <motion.div
              key="paused"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="bg-black/40 p-6 rounded-full"
            >
              <Play className="w-12 h-12 text-white fill-white" />
            </motion.div>
          ) : isLocalMuted ? (
            <motion.div
              key="muted"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="bg-black/40 p-4 rounded-full flex flex-col items-center gap-2"
            >
              <VolumeX className="w-8 h-8 text-white" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
