import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCourses } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronLeft, ChevronRight, Play, User, LogOut, Clock } from 'lucide-react';
import type { Course } from '@/hooks/useCourses';
import heroImage from '@/assets/hero-image.jpg';

interface IncompleteLessonWithCourse {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  duration_minutes?: number;
  course: {
    id: string;
    title: string;
    instructor_name?: string;
  };
  module: {
    title: string;
  };
}

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const navigate = useNavigate();
  const [incompleteLessons, setIncompleteLessons] = useState<IncompleteLessonWithCourse[]>([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { state: { from: { pathname: '/dashboard' } } });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchIncompleteLessons();
    }
  }, [user]);

  const fetchIncompleteLessons = async () => {
    if (!user) return;
    
    setLessonsLoading(true);
    try {
      // Get lessons with progress less than 100% or no progress at all
      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          description,
          video_url,
          duration_minutes,
          module_id,
          modules!inner (
            title,
            course_id,
            courses!inner (
              id,
              title,
              instructor_name,
              is_published
            )
          )
        `)
        .eq('modules.courses.is_published', true)
        .limit(10);

      if (error) throw error;

      // Transform the data to match our interface
      const transformedLessons: IncompleteLessonWithCourse[] = lessonsData?.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        video_url: lesson.video_url,
        duration_minutes: lesson.duration_minutes,
        course: {
          id: lesson.modules.courses.id,
          title: lesson.modules.courses.title,
          instructor_name: lesson.modules.courses.instructor_name,
        },
        module: {
          title: lesson.modules.title,
        },
      })) || [];

      setIncompleteLessons(transformedLessons);
    } catch (error) {
      console.error('Error fetching incomplete lessons:', error);
    } finally {
      setLessonsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    const container = document.getElementById('progress-carousel');
    if (container) {
      const cardWidth = 400; // Width of each lesson card (horizontal)
      const scrollAmount = cardWidth * 2; // Scroll 2 cards at a time
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);
      
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                GUSTAVO MEDEIROS
              </h1>
              <span className="text-lg font-light text-muted-foreground">cliniks</span>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="text-muted-foreground hover:text-primary"
              >
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-primary"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[500px] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.2) 70%), url(${heroImage})`
          }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent" />
        
        <div className="relative z-10 container mx-auto px-6 h-full flex items-center">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white animate-fade-in">
              GUSTAVO<br />MEDEIROS
            </h2>
            <p className="text-lg text-white/90 mb-2 animate-fade-in">cliniks</p>
            <p className="text-white/80 animate-fade-in">
              Transforme sua comunicação e alcance resultados extraordinários
            </p>
          </div>
        </div>
      </section>

      {/* Continue Progress Section - Horizontal */}
      <section className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-16">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold text-white">Continuar progresso</h3>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
                onClick={() => scrollCarousel('left')}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
                onClick={() => scrollCarousel('right')}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <div 
              id="progress-carousel"
              className="flex space-x-6 overflow-x-auto scrollbar-hide pb-6"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {lessonsLoading ? (
                <div className="flex items-center justify-center w-full py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              ) : (
                incompleteLessons.map((lesson) => (
                  <div 
                    key={lesson.id} 
                    className="flex-shrink-0 w-[380px] cursor-pointer transition-all duration-300 hover:scale-105"
                    onClick={() => navigate(`/course/${lesson.course.id}/lesson/${lesson.id}`)}
                  >
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-white/20">
                      {/* Horizontal thumbnail */}
                      <div className="relative aspect-video bg-gradient-to-br from-gray-700 to-gray-900">
                        {lesson.video_url ? (
                          <img
                            src={lesson.video_url}
                            alt={lesson.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={lesson.video_url ? "hidden w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center" : "w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center"}>
                          <Play className="w-12 h-12 text-white/70" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                          <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                            {lesson.module.title}
                          </Badge>
                          {lesson.duration_minutes && (
                            <div className="flex items-center space-x-1 bg-black/50 rounded px-2 py-1">
                              <Clock className="w-3 h-3 text-white" />
                              <span className="text-xs text-white">{lesson.duration_minutes}min</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-white mb-1 line-clamp-2 text-sm">
                          {lesson.title}
                        </h4>
                        <p className="text-xs text-white/70 mb-1">
                          {lesson.course.title}
                        </p>
                        <p className="text-xs text-white/50">
                          Por {lesson.course.instructor_name || 'Gustavo Medeiros'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* All Courses Section - Grid */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16">
        <div className="container mx-auto px-6">
          <h3 className="text-3xl font-bold text-white mb-8">Todos os Cursos</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {coursesLoading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : (
              courses?.map((course) => (
                <div 
                  key={course.id}
                  className="cursor-pointer transition-all duration-300 hover:scale-105 group"
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-700/50">
                    <div className="relative aspect-[708/1494] bg-gradient-to-br from-gray-700 to-gray-900">
                      {course.cover_image_url ? (
                        <img
                          src={course.cover_image_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                          <Play className="w-12 h-12 text-white/70" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                          {course.difficulty_level}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-white mb-1 line-clamp-2 text-sm">
                        {course.title}
                      </h4>
                      <p className="text-xs text-white/70">
                        Por {course.instructor_name || 'Gustavo Medeiros'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;