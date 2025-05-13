"use client"
import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';

// Import styles
import 'video.js/dist/video-js.css';
import '@videojs/http-streaming';
import 'videojs-contrib-quality-levels';
import 'videojs-hls-quality-selector';

const CompleteHLSPlayer = ({ src, poster, onError }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  // First effect to handle mounting state
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Second effect to handle player initialization after mounting
  useEffect(() => {
    // Only initialize when component is mounted and we have a source
    if (!mounted || !src) return;

    // Extra safety check to ensure video element exists
    if (!videoRef.current) {
      console.error('Video element ref not available');
      if (onError) onError(new Error('Video element not found'));
      return;
    }

    // Initialize player with delay to ensure DOM is ready
    const initializePlayer = () => {
      try {
        // Cleanup any existing player
        if (playerRef.current) {
          playerRef.current.dispose();
          playerRef.current = null;
        }

        // Initialize video.js with proper configuration
        const videoElement = videoRef.current;

        // Verify element is in DOM before initializing
        if (!document.body.contains(videoElement)) {
          console.error('Video element not in DOM');
          if (onError) onError(new Error('Video element not in DOM'));
          return;
        }

        const vjsOptions = {
          controls: true,
          autoplay: false,
          preload: 'auto',
          fluid: true,
          responsive: true,
          html5: {
            hls: {
              enableLowInitialPlaylist: true,
              smoothQualityChange: true,
              overrideNative: true
            },
            nativeVideoTracks: false,
            nativeAudioTracks: false,
            nativeTextTracks: false
          },
          sources: [{
            src: src,
            type: src?.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
          }],
          poster: poster
        };

        console.log('Initializing VideoJS player with options:', vjsOptions);
        
        const player = videojs(videoElement, vjsOptions);

        // Setup quality selector after player is ready
        player.ready(() => {
          console.log('Player is ready');
          try {
            if (player.qualityLevels && player.hlsQualitySelector) {
              player.qualityLevels();
              player.hlsQualitySelector({ displayCurrentQuality: true });
            }
          } catch (e) {
            console.warn('Failed to initialize quality selector:', e);
          }
        });

        // Error handling
        player.on('error', function(e) {
          console.error('VideoJS Error:', player.error());
          if (onError) {
            onError(player.error());
          }
        });

        playerRef.current = player;
      } catch (error) {
        console.error('Error initializing VideoJS:', error);
        if (onError) onError(error);
      }
    };

    // Small timeout to ensure DOM is fully ready
    const timeoutId = setTimeout(initializePlayer, 100);

    return () => {
      clearTimeout(timeoutId);
      if (playerRef.current) {
        try {
          playerRef.current.dispose();
        } catch (e) {
          console.warn('Error disposing player:', e);
        }
        playerRef.current = null;
      }
    };
  }, [src, poster, onError, mounted]);

  return (
    <div className="w-full h-full" ref={containerRef}>
      {mounted && (
        <div data-vjs-player className="w-full h-full">
          <video
            ref={videoRef}
            className="video-js vjs-default-skin vjs-big-play-centered vjs-16-9"
            playsInline
          />
        </div>
      )}
    </div>
  );
};

export default CompleteHLSPlayer;