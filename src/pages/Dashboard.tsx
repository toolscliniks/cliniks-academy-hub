import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SubscriptionCard from '@/components/SubscriptionCard';
import NotificationCenter from '@/components/NotificationCenter';
import { Plus, BookOpen, Star, Clock, Users, Trophy, TrendingUp, ChevronLeft, ChevronRight, Play, User, LogOut } from 'lucide-react';
import { useCourses } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
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
  const [scrollPosition, setScrollPosition] = useState(0);
  const [lessonsLoading, setLessonsLoading] = useState(false);

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
    
    setLessonsLoading(true);
    try {
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
      const cardWidth = 320;
      const scrollAmount = cardWidth * 2;
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);
      
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Netflix-style Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Cliniks Academy
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationCenter />
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

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Main Content (Netflix Style) */}
          <div className="lg:col-span-3 space-y-8">
            {/* Welcome Section */}
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Bem-vindo de volta, {user?.user_metadata?.full_name || 'Gile Maeda'}! 🚀
              </h1>
              <p className="text-muted-foreground">
                Continue sua jornada de aprendizado onde parou.
              </p>
            </div>

            {/* Continue Progress Section - Netflix Style */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Continuar progresso</h3>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full w-10 h-10 p-0"
                    onClick={() => scrollCarousel('left')}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full w-10 h-10 p-0"
                    onClick={() => scrollCarousel('right')}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div 
                  id="progress-carousel"
                  className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {lessonsLoading ? (
                    <div className="flex items-center justify-center w-full py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    incompleteLessons.map((lesson) => (
                      <div 
                        key={lesson.id} 
                        className="flex-shrink-0 w-[300px] cursor-pointer transition-all duration-300 hover:scale-105 group"
                        onClick={() => navigate(`/lesson/${lesson.id}`)}
                      >
                        <Card className="bg-gradient-card border-border/50 overflow-hidden h-full">
                          <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50">
                            {lesson.video_url ? (
                              <img
                                src={lesson.video_url}
                                alt={lesson.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-12 h-12 text-muted-foreground/50" />
                              </div>
                            )}
                            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                              <Badge variant="secondary" className="text-xs">
                                {lesson.module.title}
                              </Badge>
                              {lesson.duration_minutes && (
                                <div className="flex items-center space-x-1 bg-background/80 rounded px-2 py-1">
                                  <Clock className="w-3 h-3" />
                                  <span className="text-xs">{lesson.duration_minutes}min</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <h4 className="font-semibold mb-1 line-clamp-2 text-sm">
                              {lesson.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mb-1">
                              {lesson.course.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Por {lesson.course.instructor_name || 'Instrutor'}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* All Courses Section - Netflix Style */}
            <section>
              <h3 className="text-2xl font-bold mb-6">Todos os Cursos</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {coursesLoading ? (
                  <>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                      <Card key={i} className="animate-pulse bg-gradient-card border-border/50">
                        <div className="aspect-[2/3] bg-muted/30 rounded-t-lg" />
                        <CardContent className="p-3">
                          <div className="h-3 bg-muted/30 rounded mb-1" />
                          <div className="h-2 bg-muted/20 rounded" />
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  courses?.map((course) => (
                    <Card 
                      key={course.id}
                      className="bg-gradient-card border-border/50 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-glow overflow-hidden group"
                      onClick={() => navigate(`/courses/${course.id}`)}
                    >
                      <div className="relative aspect-[2/3] bg-gradient-to-br from-muted to-muted/50">
                        {course.cover_image_url ? (
                          <img
                            src={course.cover_image_url}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2">
                          <Badge variant="secondary" className="text-xs">
                            {course.difficulty_level}
                          </Badge>
                        </div>
                        {course.is_featured && (
                          <div className="absolute top-2 left-2">
                            <Badge className="text-xs bg-primary text-primary-foreground">
                              <Star className="w-3 h-3 mr-1" />
                              Destaque
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h4 className="font-semibold mb-1 line-clamp-2 text-sm leading-tight">
                          {course.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Por {course.instructor_name || 'Instrutor'}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right Column - Subscription & Quick Actions */}
          <div className="space-y-6">
            {/* Subscription Card */}
            <SubscriptionCard />
            
            {/* Quick Stats */}
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Estatísticas Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm">Cursos Matriculados</span>
                  </div>
                  <Badge variant="secondary">{enrolledCourses.length}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">Cursos Concluídos</span>
                  </div>
                  <Badge variant="secondary">
                    {enrolledCourses.filter(e => e.completed_at).length}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Horas de Estudo</span>
                  </div>
                  <Badge variant="secondary">
                    {Math.round(
                      enrolledCourses.reduce((acc, e) => 
                        acc + (e.courses?.duration_hours || 0) * (e.progress / 100), 0
                      )
                    )}h
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Actions */}
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/courses')}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Explorar Cursos
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/certificates')}
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Meus Certificados
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/invoices')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Faturas
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;