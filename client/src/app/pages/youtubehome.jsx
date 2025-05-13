"use client"
import React, { useEffect, useState } from 'react';
import axios from "axios";
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import NavBar from '../components/navbar';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import debounce from 'lodash/debounce';

const YouTubeHome = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalVideos, setTotalVideos] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();
    const VIDEOS_PER_PAGE = 12;

    const fetchVideos = async (query = '', pageNum = 1) => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:8082/watch/home', {
                params: {
                    q: query,
                    page: pageNum,
                    limit: VIDEOS_PER_PAGE
                }
            });
            
            if (pageNum === 1) {
                setVideos(res.data.videos);
            } else {
                setVideos(prev => [...prev, ...res.data.videos]);
            }
            
            setTotalVideos(res.data.total);
            setHasMore(res.data.videos.length === VIDEOS_PER_PAGE);
            setLoading(false);
        } catch (error) {
            console.error('Error in fetching videos:', error);
            setLoading(false);
        }
    };

    // Debounced search function
    const debouncedSearch = debounce((query) => {
        setPage(1);
        fetchVideos(query, 1);
        // Update URL with search query
        const params = new URLSearchParams(searchParams);
        if (query) {
            params.set('q', query);
        } else {
            params.delete('q');
        }
        router.push(`/?${params.toString()}`);
    }, 500);

    useEffect(() => {
        const query = searchParams.get('q') || '';
        setSearchQuery(query);
        fetchVideos(query, 1);
    }, []);

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        debouncedSearch(query);
    };

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchVideos(searchQuery, nextPage);
    };

    const handleVideoClick = (video) => {
    const bucketBase = video.url.split('.s3.')[0] + '.s3.' + video.url.split('.s3.')[1].split('/')[0];
    // Sanitize the title exactly as in the backend
    const hlsTitle = video.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const hlsUrl = `${bucketBase}/hls/${hlsTitle}/master.m3u8`;
    router.push(`/watch?v=${encodeURIComponent(hlsUrl)}`);
};

    const generateThumbnail = (url) => {
        // For now, using a placeholder. In the future, we can generate actual thumbnails
        return "https://placehold.co/480x270/333/FFF?text=Click+to+Play";
    };

    return (
        <div className="min-h-screen bg-gray-900">
            <NavBar />
            <div className="max-w-screen-xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <Input
                        type="search"
                        placeholder="Search videos..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="bg-gray-800 text-white border-gray-700 focus:border-purple-500"
                    />
                </div>

                {loading && videos.length === 0 ? (
                    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                ) : videos.length === 0 ? (
                    <div className="text-center text-gray-400 mt-20">
                        <h3 className="text-2xl font-semibold mb-2">No videos found</h3>
                        <p>{searchQuery ? 'Try different search terms' : 'Be the first to upload educational content!'}</p>
                    </div>
                ) : (
                    <>
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

                        {hasMore && (
                            <div className="mt-8 flex justify-center">
                                <Button
                                    onClick={loadMore}
                                    disabled={loading}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {loading ? 'Loading...' : 'Load More'}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default YouTubeHome;
