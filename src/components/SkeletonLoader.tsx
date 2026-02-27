import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const LOADING_MESSAGES = [
  "Syncing with the matrix...",
  "Fetching pure entertainment...",
  "Optimizing your dopamine levels...",
  "Calibrating digital waves...",
  "Scanning subreddits for gold...",
  "Preparing your next favorite clip...",
  "Bypassing slow internet gravity...",
  "Loading awesome in 3... 2... 1..."
];

export const SkeletonLoader: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full bg-[#050505] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-10" 
           style={{ 
             backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', 
             backgroundSize: '30px 30px' 
           }} 
      />

      {/* Central Animated Core */}
      <div className="relative">
        {/* Outer Pulsing Glow */}
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-full blur-3xl"
        />

        {/* Orbital Rings */}
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            animate={{ rotate: 360 }}
            transition={{
              duration: 4 + i * 2,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/10 rounded-full"
            style={{
              width: `${100 + i * 60}px`,
              height: `${100 + i * 60}px`,
              borderStyle: i === 2 ? 'dashed' : 'solid'
            }}
          />
        ))}

        {/* Inner Pulsing Circle */}
        <motion.div
          animate={{
            scale: [0.8, 1.1, 0.8],
            boxShadow: [
              "0 0 20px rgba(255,255,255,0.1)",
              "0 0 40px rgba(255,255,255,0.3)",
              "0 0 20px rgba(255,255,255,0.1)"
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-24 h-24 rounded-full border-2 border-white/20 flex items-center justify-center backdrop-blur-sm"
        >
          <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
        </motion.div>
      </div>

      {/* Entertaining Messages */}
      <div className="absolute bottom-32 w-full text-center px-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-white/60 text-sm font-medium tracking-widest uppercase italic"
          >
            {LOADING_MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Floating Particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 400 - 200, 
            y: Math.random() * 400 - 200,
            opacity: 0 
          }}
          animate={{ 
            y: [null, Math.random() * -500],
            opacity: [0, 0.5, 0]
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5
          }}
          className="absolute w-1 h-1 bg-white rounded-full"
        />
      ))}
    </div>
  );
};
