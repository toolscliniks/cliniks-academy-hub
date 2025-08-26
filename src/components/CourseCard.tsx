import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Star, Users } from "lucide-react";
import type { Course } from "@/hooks/useCourses";

interface CourseCardProps {
  course: Course;
  onEnroll?: () => void;
}

const CourseCard = ({ course, onEnroll }: CourseCardProps) => {
  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'Iniciante':
        return 'bg-success/20 text-success border-success/30';
      case 'Intermediário':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'Avançado':
        return 'bg-accent/20 text-accent border-accent/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  return (
    <Card className="group overflow-hidden bg-gradient-card border-border/50 hover:border-primary/30 hover:shadow-primary transition-all duration-300">
      <div className="relative aspect-video overflow-hidden">
        {course.cover_image_url ? (
          <img 
            src={course.cover_image_url} 
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground opacity-80">
              {course.title.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge className={getDifficultyColor(course.difficulty_level)}>
            {course.difficulty_level}
          </Badge>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          {course.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {course.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {course.duration_hours > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{course.duration_hours}h</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            <span>4.8</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>1.2k</span>
          </div>
        </div>

        {course.instructor_name && (
          <p className="text-sm text-muted-foreground">
            Por <span className="font-medium text-foreground">{course.instructor_name}</span>
          </p>
        )}

        <Button 
          onClick={onEnroll}
          className="w-full"
          variant="premium"
        >
          Ver Curso
        </Button>
      </div>
    </Card>
  );
};

export default CourseCard;