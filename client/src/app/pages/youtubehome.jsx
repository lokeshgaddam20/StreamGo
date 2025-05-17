"use client"
import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from "axios";
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import NavBar from '../components/navbar';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import debounce from 'lodash/debounce';

const YouTubeHome = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalVideos, setTotalVideos] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
    const searchInputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const observerRef = useRef(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const VIDEOS_PER_PAGE = 12;

    // API base URL - can be set in environment variables
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082';

    // Click outside handler to close suggestions
    useEffect(() => {
        function handleClickOutside(event) {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
                searchInputRef.current && !searchInputRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const fetchVideos = useCallback(async (query = '', pageNum = 1, append = false) => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/watch/home`, {
                params: {
                    q: query,
                    page: pageNum,
                    limit: VIDEOS_PER_PAGE
                }
            });
            
            // Safely handle API response - check if videos property exists
            const videosData = res.data && res.data.videos ? res.data.videos : [];
            const totalCount = res.data && res.data.total ? res.data.total : 0;
            
            if (append) {
                setVideos(prev => [...prev, ...videosData]);
            } else {
                setVideos(videosData);
            }
            
            setTotalVideos(totalCount);
            setHasMore(videosData.length === VIDEOS_PER_PAGE && (pageNum * VIDEOS_PER_PAGE) < totalCount);
            setLoading(false);
        } catch (error) {
            console.error('Error in fetching videos:', error);
            // Reset state on error to prevent UI issues
            if (!append) {
                setVideos([]);
            }
            setLoading(false);
            setHasMore(false);
        }
    }, [API_BASE_URL, VIDEOS_PER_PAGE]);

    const fetchSuggestions = useCallback(async (query) => {
        if (!query || query.trim() === '') {
            setSuggestions([]);
            return;
        }
        
        try {
            const res = await axios.get(`${API_BASE_URL}/watch/suggestions`, {
                params: { q: query }
            });
            // Safely handle API response
            const suggestionsData = res.data && res.data.suggestions ? res.data.suggestions : [];
            setSuggestions(suggestionsData);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            setSuggestions([]);
        }
    }, [API_BASE_URL]);

    // Infinite scroll handler
    const lastVideoRef = useCallback(node => {
        if (loading) return;
        if (observerRef.current) observerRef.current.disconnect();
        
        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchVideos(searchQuery, nextPage, true);
            }
        });
        
        if (node) observerRef.current.observe(node);
    }, [loading, hasMore, page, searchQuery, fetchVideos]);

    // Debounced search function with useCallback to prevent re-creation
    const debouncedSearch = useCallback(
        debounce((query) => {
            setPage(1);
            fetchVideos(query, 1, false);
            
            // Update URL with search query
            // Using router.replace to prevent history stack issues
            const params = new URLSearchParams(searchParams.toString());
            if (query) {
                params.set('q', query);
            } else {
                params.delete('q');
            }
            router.replace(`/?${params.toString()}`, { scroll: false });
        }, 500),
        [fetchVideos, router, searchParams]
    );

    // Debounced suggestions with useCallback to prevent re-creation
    const debouncedSuggestions = useCallback(
        debounce((query) => {
            fetchSuggestions(query);
        }, 300),
        [fetchSuggestions]
    );

    // Initial fetch based on URL parameters
    useEffect(() => {
        const query = searchParams.get('q') || '';
        setSearchQuery(query);
        fetchVideos(query, 1, false);
    }, [searchParams, fetchVideos]);

    const handleSearch = useCallback((e) => {
        const query = e.target.value;
        setSearchQuery(query);
        debouncedSearch(query);
        debouncedSuggestions(query);
        setShowSuggestions(true);
    }, [debouncedSearch, debouncedSuggestions]);

    const handleSuggestionClick = useCallback((suggestion) => {
        setSearchQuery(suggestion);
        setShowSuggestions(false);
        // Since we're using a debounced search function that takes time,
        // execute an immediate search here to improve UX
        fetchVideos(suggestion, 1, false);
        
        // Update URL with search query
        const params = new URLSearchParams(searchParams.toString());
        params.set('q', suggestion);
        router.replace(`/?${params.toString()}`, { scroll: false });
    }, [fetchVideos, router, searchParams]);

    const handleVideoClick = useCallback((video) => {
        if (!video || !video.url) {
            console.error('Invalid video data');
            return;
        }
        
        try {
            const bucketBase = video.url.split('.s3.')[0] + '.s3.' + video.url.split('.s3.')[1].split('/')[0];
            // Sanitize the title exactly as in the backend
            const hlsTitle = video.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
            const hlsUrl = `${bucketBase}/hls/${hlsTitle}/master.m3u8`;
            router.push(`/watch?v=${encodeURIComponent(hlsUrl)}`);
        } catch (error) {
            console.error('Error processing video URL:', error);
        }
    }, [router]);

  const generateThumbnail = useCallback((video) => {
    try {
        // Basic validation
        if (!video || !video.url || !video.title) {
            console.log("Missing video data - using placeholder");
            return "https://placehold.co/480x270/333/FFF?text=Video";
        }
        
        console.log("Processing video:", video.title);
        console.log("Original URL:", video.url);
        
        // Parse the S3 URL correctly
        let bucketBase;
        let parsedUrl;
        
        try {
            // Try to parse as a URL first
            parsedUrl = new URL(video.url);
            
            // Check if it's an S3 URL
            if (parsedUrl.hostname.includes('.s3.')) {
                // Extract the base URL up to the region
                const hostnameParts = parsedUrl.hostname.split('.');
                const bucketName = hostnameParts[0];
                const region = hostnameParts[2]; // Assuming format: bucket-name.s3.region.amazonaws.com
                
                bucketBase = `${parsedUrl.protocol}//${bucketName}.s3.${region}.amazonaws.com`;
                console.log("Extracted bucket base from S3 URL:", bucketBase);
            } else {
                // If it's not an S3 URL, just use the origin as the base
                bucketBase = parsedUrl.origin;
                console.log("Using origin as bucket base:", bucketBase);
            }
        } catch (urlError) {
            console.error("Error parsing URL:", urlError);
            // Fallback to the original split method
            if (video.url.includes('.s3.')) {
                const urlParts = video.url.split('.s3.');
                bucketBase = urlParts[0] + '.s3.' + urlParts[1].split('/')[0];
                console.log("Extracted bucket base using split method:", bucketBase);
            } else {
                console.log("URL doesn't contain '.s3.' pattern, using full URL as base");
                bucketBase = video.url.substring(0, video.url.lastIndexOf('/'));
            }
        }
        
        // Sanitize the title exactly as it's done in the backend
        // Make sure this matches the sanitization in s3ToS3.js
        const sanitizedTitle = video.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
            
        console.log("Sanitized title:", sanitizedTitle);
        
        // Construct the thumbnail URL
        // This now matches how the transcoding service generates thumbnails
        const thumbnailUrl = `${bucketBase}/thumbnails/${sanitizedTitle}/thumbnail.jpg`;
        console.log("Generated thumbnail URL:", thumbnailUrl);
        
        return thumbnailUrl;
    } catch (error) {
        console.error('Error generating thumbnail URL:', error);
        return "https://placehold.co/480x270/333/FFF?text=Error";
    }
}, []);

    // Handle keyboard navigation in suggestions
    const handleKeyDown = useCallback((e) => {
        // Down arrow
        if (e.key === 'ArrowDown' && showSuggestions) {
            e.preventDefault();
            setActiveSuggestionIndex(prev => 
                prev < suggestions.length - 1 ? prev + 1 : prev
            );
        }
        // Up arrow
        else if (e.key === 'ArrowUp' && showSuggestions) {
            e.preventDefault();
            setActiveSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
        }
        // Enter key
        else if (e.key === 'Enter' && showSuggestions && activeSuggestionIndex >= 0) {
            e.preventDefault();
            handleSuggestionClick(suggestions[activeSuggestionIndex]);
        }
        // Escape key
        else if (e.key === 'Escape' && showSuggestions) {
            setShowSuggestions(false);
        }
    }, [showSuggestions, suggestions, activeSuggestionIndex, handleSuggestionClick]);

    return (
        <div className="min-h-screen bg-gray-900">
            <NavBar />
            <div className="max-w-screen-xl mx-auto px-4 py-8">
                <div className="mb-8 relative">
                    <div className="relative">
                        <Input
                            ref={searchInputRef}
                            type="search"
                            placeholder="Search videos..."
                            value={searchQuery}
                            onChange={handleSearch}
                            onFocus={() => {
                                if (searchQuery) setShowSuggestions(true);
                            }}
                            onKeyDown={handleKeyDown}
                            className="bg-gray-800 text-white border-gray-700 focus:border-purple-500 pr-10"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <svg 
                                className="w-5 h-5 text-gray-400" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24" 
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth="2" 
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                ></path>
                            </svg>
                        </div>
                    </div>
                    
                    {/* Search suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div 
                            ref={suggestionsRef}
                            className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto"
                        >
                            <ul className="py-1">
                                {suggestions.map((suggestion, index) => (
                                    <li 
                                        key={index}
                                        className={`px-4 py-2 cursor-pointer hover:bg-gray-700 flex items-center ${
                                            index === activeSuggestionIndex ? 'bg-gray-700' : ''
                                        }`}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                                    >
                                        <svg 
                                            className="w-4 h-4 mr-2 text-gray-400" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24" 
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round" 
                                                strokeWidth="2" 
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                            ></path>
                                        </svg>
                                        <span className="text-white">{suggestion}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {videos.map((video, index) => {
                            // Add ref to last element for infinite scrolling
                            const isLastElement = index === videos.length - 1;
                            return (
                                <Card 
                                    key={video.id || index} 
                                    ref={isLastElement ? lastVideoRef : null}
                                    className="bg-gray-800 text-white overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
                                    onClick={() => handleVideoClick(video)}
                                >
                                    <div className="aspect-video relative">
                                        <Image
                                            src={generateThumbnail(video)}
                                            alt={video.title || "Video"}
                                            fill
                                            className="object-cover"
                                            onError={(e) => {
                                                // Fallback if thumbnail fails to load
                                                e.target.src = "https://placehold.co/480x270/333/FFF?text=Video";
                                            }}
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
                                        <h2 className="text-lg font-semibold mb-2 line-clamp-2">
                                            {video.highlights && video.highlights.title 
                                                ? <span dangerouslySetInnerHTML={{ __html: video.highlights.title[0] }} />
                                                : video.title || "Untitled Video"
                                            }
                                        </h2>
                                        <p className="text-sm text-gray-400 mb-2">By {video.author || "Unknown Author"}</p>
                                        {video.description && (
                                            <p className="text-sm text-gray-300 line-clamp-2">
                                                {video.highlights && video.highlights.description
                                                    ? <span dangerouslySetInnerHTML={{ __html: video.highlights.description[0] }} />
                                                    : video.description
                                                }
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
                
                {/* Loading indicator at bottom for infinite scroll */}
                {loading && videos.length > 0 && (
                    <div className="flex justify-center mt-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default YouTubeHome;