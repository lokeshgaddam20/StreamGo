"use client"
import React, { useEffect, useState } from 'react';
import axios from "axios";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import NavBar from '../components/navbar';
import { Card, CardContent } from "@/components/ui/card";

const YouTubeHome = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchVideos = async () => {
        try {
            const res = await axios.get('http://localhost:8082/watch/home');
            setVideos(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error in fetching videos:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    const handleVideoClick = (video) => {
        router.push(`/watch?v=${encodeURIComponent(video.url)}`);
    };

    const generateThumbnail = (url) => {
        // For now, using a placeholder. In the future, we can generate actual thumbnails
        return "https://placehold.co/480x270/333/FFF?text=Click+to+Play";
    };

    return (
        <div className="min-h-screen bg-gray-900">
            <NavBar />
            <div className="max-w-screen-xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                ) : videos.length === 0 ? (
                    <div className="text-center text-gray-400 mt-20">
                        <h3 className="text-2xl font-semibold mb-2">No videos available</h3>
                        <p>Be the first to upload educational content!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {videos.map(video => (
                            <Card 
                                key={video.id} 
                                className="bg-gray-800 text-white overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
                                onClick={() => handleVideoClick(video)}
                            >
                                <div className="aspect-video relative">
                                    <Image
                                        src={generateThumbnail(video.url)}
                                        alt={video.title}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <svg 
                                            className="w-16 h-16 text-white" 
                                            fill="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M8 5v14l11-7z"/>
                                        </svg>
                                    </div>
                                </div>
                                <CardContent className="p-4">
                                    <h2 className="text-lg font-semibold mb-2 line-clamp-2">{video.title}</h2>
                                    <p className="text-sm text-gray-400 mb-2">By {video.author}</p>
                                    {video.description && (
                                        <p className="text-sm text-gray-300 line-clamp-2">{video.description}</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default YouTubeHome;
