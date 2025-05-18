"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, ThumbsUp, Share2, Clock } from "lucide-react";

const VideoCard = ({ video, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Generate thumbnail with fallback
  const thumbnailUrl = video.thumbnailUrl || 
    (video.url ? `${video.url.split('.s3.')[0]}.s3.${video.url.split('.s3.')[1].split('/')[0]}/thumbnails/${video.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}/thumbnail.jpg` : 
    "https://placehold.co/480x270/333/FFF?text=Video");
  
  return (
    <Card 
      className="bg-card text-card-foreground overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(video)}
    >
      <div className="aspect-video relative overflow-hidden">
        <Image
          src={thumbnailUrl}
          alt={video.title || "Video"}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            e.target.src = "https://placehold.co/480x270/333/FFF?text=Video";
          }}
        />
        
        {/* Hovering overlay with play button */}
        <div className={`absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-16 h-16 rounded-full bg-purple-600 bg-opacity-80 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
        
        {/* Video duration */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {video.duration || "4:32"}
        </div>
        
        {/* New video badge */}
        {video.isNew && (
          <Badge className="absolute top-2 left-2 bg-purple-600 text-white">
            NEW
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Author avatar */}
          <div className="h-8 w-8 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
            {video.authorImage ? (
              <Image 
                src={video.authorImage} 
                alt={video.author || "Author"} 
                width={32} 
                height={32}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white">
                {(video.author || "A").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Video info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold mb-1 line-clamp-2">
              {video.highlights && video.highlights.title 
                ? <span dangerouslySetInnerHTML={{ __html: video.highlights.title[0] }} />
                : video.title || "Untitled Video"
              }
            </h2>
            <p className="text-sm text-muted-foreground mb-2">{video.author || "Unknown Author"}</p>
            
            {/* Video stats */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {video.views || "1.2K"}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" /> {video.likes || "243"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {video.uploadedAt || "2 days ago"}
              </span>
            </div>
          </div>
        </div>
        
        {/* Description - only show on hover */}
        {video.description && (
          <div className={`mt-2 text-sm text-muted-foreground line-clamp-2 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            {video.highlights && video.highlights.description
              ? <span dangerouslySetInnerHTML={{ __html: video.highlights.description[0] }} />
              : video.description
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoCard;