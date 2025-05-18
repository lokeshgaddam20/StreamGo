import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from "axios";
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";
import NavBar from '../components/navbar';
import debounce from 'lodash/debounce';

const VideoSkeleton = () => {
  const { theme } = useTheme();
  return (
    <div className="space-y-3">
      <Skeleton className={`w-full aspect-video rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`} />
      <div className="flex gap-3 py-2">
        <Skeleton className={`h-10 w-10 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`} />
        <div className="space-y-2 flex-1">
          <Skeleton className={`h-4 w-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`} />
          <Skeleton className={`h-3 w-3/4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`} />
        </div>
      </div>
    </div>
  );
};

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
    const [sortBy, setSortBy] = useState("date");
    const searchInputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const observerRef = useRef(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { theme } = useTheme();
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

    const fetchVideos = useCallback(async (query = '', pageNum = 1, sort = 'date', append = false) => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/watch/home`, {
                params: {
                    q: query,
                    page: pageNum,
                    limit: VIDEOS_PER_PAGE,
                    sort: sort
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
                fetchVideos(searchQuery, nextPage, sortBy, true);
            }
        });
        
        if (node) observerRef.current.observe(node);
    }, [loading, hasMore, page, searchQuery, sortBy, fetchVideos]);

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce((query) => {
            setPage(1);
            fetchVideos(query, 1, sortBy, false);
            
            // Update URL with search query
            const params = new URLSearchParams(searchParams.toString());
            if (query) {
                params.set('q', query);
            } else {
                params.delete('q');
            }
            router.replace(`/?${params.toString()}`, { scroll: false });
        }, 500),
        [fetchVideos, router, searchParams, sortBy]
    );

    // Debounced suggestions
    const debouncedSuggestions = useCallback(
        debounce((query) => {
            fetchSuggestions(query);
        }, 300),
        [fetchSuggestions]
    );

    // Initial fetch based on URL parameters
    useEffect(() => {
        const query = searchParams.get('q') || '';
        const sort = searchParams.get('sort') || 'date';
        setSearchQuery(query);
        setSortBy(sort);
        fetchVideos(query, 1, sort, false);
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
        fetchVideos(suggestion, 1, sortBy, false);
        
        const params = new URLSearchParams(searchParams.toString());
        params.set('q', suggestion);
        router.replace(`/?${params.toString()}`, { scroll: false });
    }, [fetchVideos, router, searchParams, sortBy]);

    const handleVideoClick = useCallback((video) => {
        if (!video || !video.url) {
            console.error('Invalid video data');
            return;
        }
        
        try {
            const bucketBase = video.url.split('.s3.')[0] + '.s3.' + video.url.split('.s3.')[1].split('/')[0];
            const hlsTitle = video.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
            const hlsUrl = `${bucketBase}/hls/${hlsTitle}/master.m3u8`;
            router.push(`/watch?v=${encodeURIComponent(hlsUrl)}`);
        } catch (error) {
            console.error('Error processing video URL:', error);
        }
    }, [router]);

    const generateThumbnail = useCallback((video) => {
        try {
            if (!video || !video.url || !video.title) {
                return "https://placehold.co/480x270/333/FFF?text=Video";
            }
            
            let bucketBase;
            
            try {
                const parsedUrl = new URL(video.url);
                
                if (parsedUrl.hostname.includes('.s3.')) {
                    const hostnameParts = parsedUrl.hostname.split('.');
                    const bucketName = hostnameParts[0];
                    const region = hostnameParts[2];
                    
                    bucketBase = `${parsedUrl.protocol}//${bucketName}.s3.${region}.amazonaws.com`;
                } else {
                    bucketBase = parsedUrl.origin;
                }
            } catch (urlError) {
                if (video.url.includes('.s3.')) {
                    const urlParts = video.url.split('.s3.');
                    bucketBase = urlParts[0] + '.s3.' + urlParts[1].split('/')[0];
                } else {
                    bucketBase = video.url.substring(0, video.url.lastIndexOf('/'));
                }
            }
            
            const sanitizedTitle = video.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
            const thumbnailUrl = `${bucketBase}/thumbnails/${sanitizedTitle}/thumbnail.jpg`;
            
            return thumbnailUrl;
        } catch (error) {
            console.error('Error generating thumbnail URL:', error);
            return "https://placehold.co/480x270/333/FFF?text=Error";
        }
    }, []);

    // Handle keyboard navigation in suggestions
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowDown' && showSuggestions) {
            e.preventDefault();
            setActiveSuggestionIndex(prev => 
                prev < suggestions.length - 1 ? prev + 1 : prev
            );
        }
        else if (e.key === 'ArrowUp' && showSuggestions) {
            e.preventDefault();
            setActiveSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
        }
        else if (e.key === 'Enter' && showSuggestions && activeSuggestionIndex >= 0) {
            e.preventDefault();
            handleSuggestionClick(suggestions[activeSuggestionIndex]);
        }
        else if (e.key === 'Escape' && showSuggestions) {
            setShowSuggestions(false);
        }
    }, [showSuggestions, suggestions, activeSuggestionIndex, handleSuggestionClick]);

    const handleSortChange = (value) => {
        setSortBy(value);
        setPage(1);
        fetchVideos(searchQuery, 1, value, false);
        
        // Update URL with sort parameter
        const params = new URLSearchParams(searchParams.toString());
        params.set('sort', value);
        router.replace(`/?${params.toString()}`, { scroll: false });
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffMonths / 12);
        
        if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
        if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        return 'Just now';
    };

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
            <NavBar />
            <div className="max-w-screen-xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div className="relative flex-1">
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
                            className={`${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'} pr-10`}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <svg 
                                className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
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
                        
                        {showSuggestions && suggestions.length > 0 && (
                            <div 
    ref={suggestionsRef}
    className={`absolute z-10 w-full mt-1 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-md shadow-lg max-h-60 overflow-auto`}
>
                                <ul className="py-1">
                                    {suggestions.map((suggestion, index) => (
                                        <li 
                                            key={index}
                                            className={`px-4 py-2 cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-900'} flex items-center ${
                                                index === activeSuggestionIndex ? theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100' : ''
                                            }`}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            onMouseEnter={() => setActiveSuggestionIndex(index)}
                                        >
                                            <svg 
                                                className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
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
                                            <span>{suggestion}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    
                    {/* Sort dropdown */}
                    <div className="w-full md:w-auto">
                        <Select value={sortBy} onValueChange={handleSortChange}>
                            <SelectTrigger className={`w-full md:w-[200px] ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}>
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent className={theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'}>
                                <SelectItem value="date">Upload Date (Newest)</SelectItem>
                                <SelectItem value="title">Title (A-Z)</SelectItem>
                                <SelectItem value="views">View Count (Highest)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {loading && videos.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(12)].map((_, index) => (
                            <VideoSkeleton key={index} />
                        ))}
                    </div>
                ) : videos.length === 0 ? (
                    <div className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-20`}>
                        <h3 className="text-2xl font-semibold mb-2">No videos found</h3>
                        <p>{searchQuery ? 'Try different search terms' : 'Be the first to upload educational content!'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {videos.map((video, index) => {
                            const isLastElement = index === videos.length - 1;
                            return (
                                <div 
                                    key={video.id || index} 
                                    ref={isLastElement ? lastVideoRef : null}
                                    className="cursor-pointer group"
                                    onClick={() => handleVideoClick(video)}
                                >
                                    {/* Thumbnail with overlay */}
                                    <div className="relative aspect-video overflow-hidden rounded-xl mb-3">
                                        <Image
                                            src={generateThumbnail(video)}
                                            alt={video.title || "Video"}
                                            fill
                                            className="object-cover transition-transform group-hover:scale-105"
                                            onError={(e) => {
                                                e.target.src = "https://placehold.co/480x270/333/FFF?text=Video";
                                            }}
                                        />
                                        {/* Example for video card hover states */}
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                            <svg
                                                className="w-16 h-16 text-white"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M8 5v14l11-7z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    
                                    {/* Video info with channel avatar */}
                                    <div className="flex gap-3">
                                        <div className="h-9 w-9 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                                            {video.authorImage ? (
                                                <Image
                                                    src={video.authorImage}
                                                    alt={video.author || "Author"}
                                                    width={36}
                                                    height={36}
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                                                        {video.author?.charAt(0) || "?"}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1">
                                            <h2 className={`font-semibold line-clamp-2 text-base mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                {video.highlights && video.highlights.title 
                                                    ? <span dangerouslySetInnerHTML={{ __html: video.highlights.title[0] }} />
                                                    : video.title || "Untitled Video"
                                                }
                                            </h2>
                                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {video.author || "Unknown Author"}
                                            </p>
                                            <div className="flex items-center gap-1 text-xs mt-1">
                                                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                                    {video.views || Math.floor(Math.random() * 1000)} views
                                                </span>
                                                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>•</span>
                                                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                                    {video.createdAt ? formatTimeAgo(video.createdAt) : '2 days ago'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* Loading indicator at bottom for infinite scroll */}
                {loading && videos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                        {[...Array(4)].map((_, index) => (
                            <VideoSkeleton key={`load-more-${index}`} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default YouTubeHome;