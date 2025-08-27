import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Play } from "lucide-react";
import type { Course } from "@/hooks/useCourses";

interface CourseCardProps {
  course: Course;
  onEnroll?: () => void;
}

const CourseCard = ({ course, onEnroll }: CourseCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  return (
    <Card 
      className="group overflow-hidden bg-transparent border-border/30 hover:border-primary/50 hover:shadow-primary/20 transition-all duration-300 flex flex-col h-full p-0"
      onClick={onEnroll}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative w-full h-full">
        {course.commercial_video_url && isHovered ? (
          <div className="relative w-full h-full">
            <video
              src={course.commercial_video_url}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-cover"
              onClick={handleVideoClick}
            />
            <button 
              onClick={handleVideoClick}
              className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1.5 text-white"
              aria-label={isMuted ? "Ativar som" : "Desativar som"}
            >
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              )}
            </button>
          </div>
        ) : course.cover_image_url ? (
          <div className="relative w-full h-full">
            <img 
              src={course.cover_image_url} 
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {course.commercial_video_url && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  <Play className="w-6 h-6 text-white" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary/50">
              {course.title.charAt(0)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CourseCard;