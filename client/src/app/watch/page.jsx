"use client"
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from "axios";
import Hls from 'hls.js';
import NavBar from '../components/navbar';

const VideoPlayer = () => {
    const searchParams = useSearchParams();
    const videoUrl = searchParams.get('v');
    const [loading, setLoading] = useState(true);
    const [videoData, setVideoData] = useState(null);
    const [error, setError] = useState(null);
    const [currentQuality, setCurrentQuality] = useState('');
    const [bandwidth, setBandwidth] = useState(0);
    const [bufferHealth, setBufferHealth] = useState(0);
    const [availableQualities, setAvailableQualities] = useState([]);
    const videoRef = useRef(null);
    const hlsRef = useRef(null);

    const initializeVideo = (urlData) => {
        if (!videoRef.current) {
            console.error('Video element not ready');
            return;
        }

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        try {
            if (urlData.type === 'hls') {
                if (Hls.isSupported()) {
                    const hls = new Hls({
                        debug: true, // Enable debug logging temporarily
                        enableWorker: true,
                        lowLatencyMode: false,
                        // More aggressive buffer settings for poor networks
                        maxBufferSize: 15 * 1000 * 1000, // 15MB - reduced from 30MB
                        maxBufferLength: 20, // reduced from 30
                        // Faster quality level switching
                        startLevel: -1, // Let HLS.js pick initial quality
                        abrEwmaDefaultEstimate: 500000, // 500kbps initial estimate
                        abrEwmaFastLive: 3.0,
                        abrEwmaSlowLive: 9.0,
                        // More aggressive ABR settings
                        abrBandWidthFactor: 0.7, // More conservative bandwidth usage
                        abrBandWidthUpFactor: 0.5, // Slower quality increases
                        abrMaxWithRealBitrate: true,
                        // Faster segment loading timeouts
                        manifestLoadingTimeOut: 8000,
                        manifestLoadingMaxRetry: 4,
                        levelLoadingTimeOut: 8000,
                        levelLoadingMaxRetry: 4,
                        fragLoadingTimeOut: 15000,
                        fragLoadingMaxRetry: 4,
                        // Enable automatic quality switching based on viewport
                        capLevelToPlayerSize: true,
                        // Enable automatic testing of bandwidth
                        testBandwidth: true,
                        startFragPrefetch: false, // Disable prefetching on poor networks
                    });

                    // Add network condition monitoring
                    let lastBandwidth = 0;
                    let lowBandwidthCount = 0;
                    const LOW_BANDWIDTH_THRESHOLD = 800000; // 800kbps

                    hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
                        if (data && data.stats) {
                            const loadTime = data.stats.loading.end - data.stats.loading.start;
                            const bits = data.stats.total * 8;
                            const bandwidth = Math.round((bits / loadTime)); // bps
                            
                            // Monitor for consistently poor network conditions
                            if (bandwidth < LOW_BANDWIDTH_THRESHOLD) {
                                lowBandwidthCount++;
                                if (lowBandwidthCount >= 3) {
                                    // Force a lower quality level after consistent poor performance
                                    const currentLevel = hls.currentLevel;
                                    if (currentLevel > 0) {
                                        console.log('Poor network detected, forcing lower quality');
                                        hls.nextLevel = currentLevel - 1;
                                    }
                                }
                            } else {
                                lowBandwidthCount = 0;
                            }
                            
                            lastBandwidth = bandwidth;
                            setBandwidth(Math.round(bandwidth / 1000)); // Convert to kbps for display
                        }
                    });

                    // Enhanced error recovery
                    hls.on(Hls.Events.ERROR, (event, data) => {
                        console.error('HLS Error:', data);
                        if (data.fatal) {
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    console.log('Fatal network error, recovering...');
                                    hls.startLoad();
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    console.log('Fatal media error, recovering...');
                                    hls.recoverMediaError();
                                    break;
                                default:
                                    console.error('Fatal error, switching to lower quality...');
                                    if (hls.currentLevel > 0) {
                                        hls.currentLevel = hls.currentLevel - 1;
                                    }
                                    break;
                            }
                        }
                    });

                    // More aggressive quality switching on buffer stalls
                    let lastStallTime = 0;
                    videoRef.current.addEventListener('waiting', () => {
                        const now = performance.now();
                        if (now - lastStallTime > 2000) { // Prevent rapid quality changes
                            console.log('Playback stalled, attempting to switch to lower quality');
                            if (hls.currentLevel > 0) {
                                hls.nextLevel = hls.currentLevel - 1;
                            }
                            lastStallTime = now;
                        }
                    });

                    // Enhanced quality level monitoring
                    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                        const levels = hls.levels;
                        if (levels && levels[data.level]) {
                            const currentLevel = levels[data.level];
                            const qualityInfo = {
                                height: currentLevel.height,
                                width: currentLevel.width,
                                bitrate: (currentLevel.bitrate / 1000).toFixed(0)
                            };
                            console.log('Quality changed:', qualityInfo);
                            setCurrentQuality(`${qualityInfo.height}p (${qualityInfo.bitrate}kbps)`);
                        }
                    });

                    // Buffer health monitoring with more detailed logging
                    const updateBufferHealth = () => {
                        if (videoRef.current && videoRef.current.buffered.length) {
                            const buffered = videoRef.current.buffered;
                            const currentTime = videoRef.current.currentTime;
                            let bufferAhead = 0;
                            
                            for (let i = 0; i < buffered.length; i++) {
                                if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
                                    bufferAhead = buffered.end(i) - currentTime;
                                    const bufferedStart = buffered.start(i);
                                    const bufferedEnd = buffered.end(i);
                                    console.log('Buffer status:', {
                                        ahead: Math.round(bufferAhead),
                                        start: Math.round(bufferedStart),
                                        end: Math.round(bufferedEnd),
                                        currentTime: Math.round(currentTime)
                                    });
                                    break;
                                }
                            }
                            
                            setBufferHealth(Math.round(bufferAhead));
                        }
                    };

                    // More frequent buffer health updates
                    const bufferInterval = setInterval(updateBufferHealth, 1000);

                    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                        console.log('HLS: Media attached, loading source:', urlData.signedUrl);
                        hls.loadSource(urlData.signedUrl);
                    });

                    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                        console.log('HLS: Manifest parsed, found ' + data.levels.length + ' quality levels');
                        const qualities = data.levels.map(level => ({
                            height: level.height,
                            width: level.width,
                            bitrate: (level.bitrate / 1000).toFixed(0)
                        }));
                        
                        setAvailableQualities(qualities);
                        console.log('Available qualities:', qualities);

                        // Start with optimal quality based on viewport size
                        const optimalLevel = hls.nextAutoLevel;
                        console.log('Starting with quality level:', optimalLevel);
                        
                        if (videoRef.current) {
                            videoRef.current.play().catch(e => {
                                console.log('Playback failed:', e);
                                // Retry playback with lower quality if failed
                                if (hls.currentLevel > 0) {
                                    hls.currentLevel = hls.currentLevel - 1;
                                }
                            });
                        }
                    });

                    hlsRef.current = hls;

                    // Cleanup interval on component unmount
                    return () => {
                        clearInterval(bufferInterval);
                        hls.destroy();
                    };
                } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                    videoRef.current.src = urlData.signedUrl;
                }
            } else {
                console.log('Playing MP4 video:', urlData.signedUrl);
                videoRef.current.src = urlData.signedUrl;
            }
        } catch (err) {
            console.error('Error initializing video:', err);
            setError('Failed to initialize video player');
        }
    };

    const fetchVideoData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`http://localhost:8082/watch`, {
                params: { url: videoUrl }
            });
            
            if (!response.data.signedUrl) {
                throw new Error('No valid video URL received from server');
            }

            console.log('Video data received:', response.data);
            setVideoData(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching video:', error);
            setError(error.message || 'Failed to load video');
            setLoading(false);
        }
    };

    useEffect(() => {
        if (videoUrl) {
            fetchVideoData();
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [videoUrl]);

    useEffect(() => {
        if (videoData && !loading && videoRef.current) {
            console.log('Initializing video player with data:', videoData);
            initializeVideo(videoData);
            
            const videoElement = videoRef.current;
            
            const onWaiting = () => {
                console.log('Video is buffering...');
            };
            
            const onPlaying = () => {
                console.log('Video resumed playback');
            };
            
            const onProgress = () => {
                if (videoElement.buffered.length) {
                    const bufferedEnd = videoElement.buffered.end(videoElement.buffered.length - 1);
                    const duration = videoElement.duration;
                    const bufferedPercent = (bufferedEnd / duration) * 100;
                    console.log(`Buffer: ${bufferedPercent.toFixed(1)}%`);
                }
            };

            videoElement.addEventListener('waiting', onWaiting);
            videoElement.addEventListener('playing', onPlaying);
            videoElement.addEventListener('progress', onProgress);
            
            return () => {
                videoElement.removeEventListener('waiting', onWaiting);
                videoElement.removeEventListener('playing', onPlaying);
                videoElement.removeEventListener('progress', onProgress);
            };
        }
    }, [videoData, loading]);

    if (!videoUrl) {
        return <div className="text-white">No video URL provided</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <NavBar />
            <div className="max-w-screen-2xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500 mt-20">
                        <h3 className="text-2xl font-semibold mb-2">{error}</h3>
                    </div>
                ) : videoData && (
                    <div className="grid grid-cols-1 gap-6">
                        <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative">
                            <video
                                ref={videoRef}
                                className="w-full h-full"
                                controls
                                playsInline
                                crossOrigin="anonymous"
                                onError={(e) => {
                                    console.error('Video error:', e);
                                    setError('Failed to play video');
                                }}
                            />
                            <div className="absolute top-4 right-4 bg-black bg-opacity-80 text-white px-4 py-2 rounded-lg space-y-1">
                                <div className="text-sm">
                                    Current Quality: {currentQuality || 'Auto'}
                                </div>
                                <div className="text-sm">
                                    Bandwidth: {bandwidth} kbps
                                </div>
                                <div className="text-sm">
                                    Buffer: {bufferHealth}s ahead
                                </div>
                                {availableQualities.length > 0 && (
                                    <div className="text-xs text-gray-300 mt-1">
                                        Available: {availableQualities.map(q => `${q.height}p`).join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-white p-4">
                            <h1 className="text-2xl font-bold mb-4">
                                {videoData.title || 'Video Title'}
                            </h1>
                            {videoData.description && (
                                <p className="text-gray-300 mt-2">
                                    {videoData.description}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Wrap the main component with Suspense
export default function WatchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-900">
                <NavBar />
                <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            </div>
        }>
            <VideoPlayer />
        </Suspense>
    );
}