import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SubscriptionCard from '@/components/SubscriptionCard';
import NotificationCenter from '@/components/NotificationCenter';
import { BookOpen, Star, Clock, Trophy, ChevronLeft, ChevronRight, Play, User, LogOut, Loader2, TrendingUp } from 'lucide-react';
import { useCourses } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import type { Course } from '@/hooks/useCourses';

interface EnrolledCourse {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  enrolled_at: string;
  completed_at?: string;
  courses?: Course;
}

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
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [incompleteLessons, setIncompleteLessons] = useState<IncompleteLessonWithCourse[]>([]);
  const [continueWatchingScrollPos, setContinueWatchingScrollPos] = useState(0);
  const [exploreScrollPos, setExploreScrollPos] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { state: { from: { pathname: '/dashboard' } } });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEnrolledCourses();
      fetchIncompleteLessons();
    }
  }, [user]);

  const fetchEnrolledCourses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          courses(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setEnrolledCourses(data || []);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    }
  };

  const fetchIncompleteLessons = async () => {
    if (!user) return;
    
    try {
      // First try to get custom featured courses from settings
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'homepage_featured_courses')
        .single();

      let lessonsQuery = supabase
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
              cover_image_url,
              is_published
            )
          )
        `)
        .eq('modules.courses.is_published', true);

      // If there are featured courses settings, filter by them
      if (settingsData?.setting_value) {
        const featuredCourses = settingsData.setting_value as any[];
        const featuredCourseIds = featuredCourses
          .filter(fc => fc.is_featured_on_homepage)
          .map(fc => fc.course_id);
        
        if (featuredCourseIds.length > 0) {
          lessonsQuery = lessonsQuery.in('modules.courses.id', featuredCourseIds);
        }
      }

      const { data: lessonsData, error } = await lessonsQuery.limit(20);

      if (error) throw error;

      const transformedLessons: IncompleteLessonWithCourse[] = lessonsData?.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        video_url: lesson.modules.courses.cover_image_url,
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
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const scrollCarousel = (containerId: string, direction: 'left' | 'right', stateUpdater: (pos: number) => void, currentPos: number) => {
    const container = document.getElementById(containerId);
    if (container) {
      const cardWidth = 320;
      const scrollAmount = cardWidth * 2;
      const newPosition = direction === 'left' 
        ? Math.max(0, currentPos - scrollAmount)
        : Math.min(container.scrollWidth - container.clientWidth, currentPos + scrollAmount);
      
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      stateUpdater(newPosition);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Netflix-style Header */}
      <header className="bg-black/95 backdrop-blur-sm border-b border-zinc-800/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                GUSTAVO MEDEIROS
              </h1>
              <nav className="hidden md:flex space-x-6">
                <Button variant="ghost" className="text-white hover:text-primary transition-colors">Início</Button>
                <Button variant="ghost" className="text-zinc-400 hover:text-white transition-colors" onClick={() => navigate('/courses')}>Cursos</Button>
                <Button variant="ghost" className="text-zinc-400 hover:text-white transition-colors" onClick={() => navigate('/certificates')}>Certificados</Button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationCenter />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Brand */}
      <div className="relative h-[60vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/10 to-secondary/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        <div className="relative container mx-auto px-6 h-full flex items-center">
          <div className="max-w-2xl">
            <p className="text-primary/80 text-lg mb-2 font-medium">cliniks</p>
            <h1 className="text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              GUSTAVO<br />
              MEDEIROS
            </h1>
            <p className="text-xl text-zinc-300 mb-8 leading-relaxed">
              Transforme sua comunicação e alcance resultados extraordinários
            </p>
            <Button 
              size="lg" 
              className="bg-white text-black hover:bg-zinc-200 font-semibold px-8 py-3 text-lg"
              onClick={() => navigate('/courses')}
            >
              <Play className="w-5 h-5 mr-2" />
              Explorar Cursos
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-16">
        {/* Continue Progress Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Continue sua jornada</h2>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full w-12 h-12 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
                onClick={() => scrollCarousel('continue-carousel', 'left', setContinueWatchingScrollPos, continueWatchingScrollPos)}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full w-12 h-12 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
                onClick={() => scrollCarousel('continue-carousel', 'right', setContinueWatchingScrollPos, continueWatchingScrollPos)}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <div 
              id="continue-carousel"
              className="flex space-x-6 overflow-x-hidden pb-4"
            >
              {incompleteLessons.slice(0, 8).map((lesson) => (
                <div 
                  key={lesson.id} 
                  className="flex-shrink-0 w-[340px] cursor-pointer transition-all duration-300 hover:scale-105 group"
                  onClick={() => navigate(`/lesson/${lesson.id}`)}
                >
                  <div className="bg-zinc-900/50 rounded-xl overflow-hidden shadow-2xl hover:shadow-primary/10 transition-all duration-300 backdrop-blur-sm">
                    <div className="relative aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900">
                      {lesson.video_url ? (
                        <img
                          src={lesson.video_url}
                          alt={lesson.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-16 h-16 text-zinc-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      
                      {/* Progress Bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700/50">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: '35%' }} />
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-8 h-8 ml-1" />
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-lg mb-2 line-clamp-2 leading-tight">
                        {lesson.title}
                      </h3>
                      <p className="text-zinc-400 mb-2 font-medium">
                        {lesson.course.title}
                      </p>
                      <div className="flex items-center justify-between text-sm text-zinc-500">
                        <span>Por {lesson.course.instructor_name || 'Gustavo Medeiros'}</span>
                        {lesson.duration_minutes && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{lesson.duration_minutes}min</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Explore Courses Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Explorar cursos</h2>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full w-12 h-12 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
                onClick={() => scrollCarousel('explore-carousel', 'left', setExploreScrollPos, exploreScrollPos)}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full w-12 h-12 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
                onClick={() => scrollCarousel('explore-carousel', 'right', setExploreScrollPos, exploreScrollPos)}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <div 
              id="explore-carousel"
              className="flex space-x-6 overflow-x-hidden pb-4"
            >
              {coursesLoading ? (
                <>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex-shrink-0 w-[280px] animate-pulse bg-zinc-900/50 rounded-xl">
                      <div className="aspect-[2/3] bg-zinc-800 rounded-t-xl" />
                      <div className="p-4">
                        <div className="h-4 bg-zinc-800 rounded mb-2" />
                        <div className="h-3 bg-zinc-800 rounded" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                courses?.map((course) => (
                  <div 
                    key={course.id}
                    className="flex-shrink-0 w-[280px] cursor-pointer transition-all duration-300 hover:scale-105 group"
                    onClick={() => navigate(`/courses/${course.id}`)}
                  >
                    <div className="bg-zinc-900/50 rounded-xl overflow-hidden shadow-2xl hover:shadow-primary/10 transition-all duration-300 backdrop-blur-sm">
                      <div className="relative aspect-[2/3] bg-gradient-to-br from-zinc-800 to-zinc-900">
                        {course.cover_image_url ? (
                          <img
                            src={course.cover_image_url}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {course.is_featured && (
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-primary/90 text-primary-foreground text-xs font-bold">
                              <Star className="w-3 h-3 mr-1" />
                              Destaque
                            </Badge>
                          </div>
                        )}
                        
                        <div className="absolute bottom-3 left-3">
                          <Badge className="bg-black/60 text-white border-zinc-700 text-xs font-medium">
                            {course.difficulty_level}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-base mb-2 line-clamp-2 leading-tight">
                          {course.title}
                        </h3>
                        <p className="text-xs text-zinc-500">
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
    </div>
  );
};

export default Dashboard;
