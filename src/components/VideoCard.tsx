import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RedditVideo } from '../services/redditService';
import { SkeletonLoader } from './SkeletonLoader';
import * as dashjs from 'dashjs';

interface VideoCardProps {
  video: RedditVideo;
  isActive: boolean;
  shouldLoad: boolean;
  isGlobalMuted: boolean;
  onMuteToggle: (muted: boolean) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, isActive, shouldLoad, isGlobalMuted, onMuteToggle }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasAudioError, setHasAudioError] = useState(false);

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

  // Initialize DASH player for Reddit videos
  useEffect(() => {
    if (isActive && shouldLoad && videoRef.current && video.url.includes('v.redd.it')) {
      const mpdUrl = video.url.split('/DASH_')[0] + '/DASHPlaylist.mpd';
      
      if (!playerRef.current) {
        playerRef.current = dashjs.MediaPlayer().create();
        playerRef.current.initialize(videoRef.current, mpdUrl, true);
        playerRef.current.setMute(isLocalMuted);
        
        playerRef.current.on(dashjs.MediaPlayer.events.ERROR, (e) => {
          console.error('DASH Player Error:', e);
          setHasAudioError(true);
        });
      }
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [isActive, shouldLoad, video.url]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setMute(isLocalMuted);
    }
    if (videoRef.current) {
      videoRef.current.muted = isLocalMuted;
    }
  }, [isLocalMuted]);

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
    <div className="relative h-screen w-full snap-start snap-always bg-black flex items-center justify-center overflow-hidden">
      {/* Video Element */}
      {shouldLoad ? (
        <video
          ref={videoRef}
          src={video.url}
          poster={video.thumbnail}
          className="h-full w-full object-cover cursor-pointer"
          loop
          playsInline
          preload="auto"
          muted={isLocalMuted}
          onLoadedData={() => setIsLoaded(true)}
          onCanPlay={() => setIsLoaded(true)}
          onTimeUpdate={handleTimeUpdate}
          onClick={handleVideoClick}
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
              <span className="text-white text-[10px] font-bold">TAP TO UNMUTE</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};
