"use client"
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from "axios";
import dynamic from 'next/dynamic';
import NavBar from '../components/navbar';

// Dynamically import the video player with no SSR to avoid hydration issues
const CompleteHLSPlayer = dynamic(() => import('./VideoJSPlayer'), {
  ssr: false
});

export default function WatchPage() {
  const searchParams = useSearchParams();
  const videoUrl = searchParams.get('v');
  
  const [loading, setLoading] = useState(true);
  const [videoData, setVideoData] = useState(null);
  const [error, setError] = useState(null);
  const [playerKey, setPlayerKey] = useState(0); // Used to force remount

  useEffect(() => {
    if (!videoUrl) {
      setError('No video URL parameter provided');
      setLoading(false);
      return;
    }

    const fetchVideoData = async () => {
      try {
        setLoading(true);
        
        const response = await axios.get(`http://localhost:8082/watch`, {
          params: { url: videoUrl },
        });
        
        if (!response.data.signedUrl) {
          throw new Error('No valid video URL received from server');
        }
        
        setVideoData(response.data);
        setLoading(false);
        // Force player to remount with new data
        setPlayerKey(prevKey => prevKey + 1);
      } catch (error) {
        setError(error.message || 'Failed to load video');
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [videoUrl]);

  const handleVideoError = (error) => {
    console.error('Video playback error:', error);
    setError('Failed to play video. Please try again later.');
  };

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-gray-900">
        <NavBar />
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="text-white text-center">No video URL provided</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 mt-20">
            <h3 className="text-2xl font-semibold mb-2">Error</h3>
            <p>{error}</p>
          </div>
        ) : videoData && videoData.signedUrl ? (
          <div className="grid grid-cols-1 gap-6">
            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
              <div className="absolute inset-0">
                <CompleteHLSPlayer
                  key={playerKey}
                  src={videoData.signedUrl}
                  poster={videoData.thumbnailUrl}
                  onError={handleVideoError}
                />
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
        ) : (
          <div className="text-center text-red-500 mt-20">
            <h3 className="text-2xl font-semibold mb-2">Error</h3>
            <p>No video URL available</p>
          </div>
        )}
      </div>
    </div>
  );
}