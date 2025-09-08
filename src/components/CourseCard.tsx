import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Clock, BookOpen, Star, User } from "lucide-react";
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

  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return 'Gratuito';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(price);
  };

  return (
    <Card 
      className="group overflow-hidden bg-card/50 backdrop-blur-sm border-border/30 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 flex flex-col h-full cursor-pointer"
      onClick={onEnroll}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Course Image/Video */}
      <div className="relative w-full h-56 overflow-hidden">
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
              className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1.5 text-white hover:bg-black/70 transition-colors"
              aria-label={isMuted ? "Ativar som" : "Desativar som"}
            >
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              )}
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {course.cover_image_url ? (
              <img 
                src={course.cover_image_url} 
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary/50">
                  {course.title.charAt(0)}
                </span>
              </div>
            )}
            {course.commercial_video_url && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  <Play className="w-6 h-6 text-white" />
                </div>
              </div>
            )}
            {course.is_featured && (
              <Badge className="absolute top-2 right-2 bg-yellow-500 hover:bg-yellow-600">
                <Star className="w-3 h-3 mr-1" />
                Destaque
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Course Content */}
      <CardHeader className="pb-1 pt-3">
        <div className="flex justify-between items-start mb-1">
          {course.category && (
            <Badge variant="outline" className="text-xs">
              {course.category}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {course.title}
        </CardTitle>
        {course.description && (
          <CardDescription className="line-clamp-2 text-sm">
            {course.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-1 pb-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Course Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span className="truncate">{course.instructor_name || 'Instrutor'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{course.duration_hours}h</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-primary">
              {formatPrice(course.price, course.currency)}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          className="w-full mt-3" 
          onClick={(e) => {
            e.stopPropagation();
            onEnroll?.();
          }}
        >
          {course.price ? 'Ver Detalhes' : 'Acessar Grátis'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CourseCard;