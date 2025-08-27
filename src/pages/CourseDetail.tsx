import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Clock, 
  BookOpen, 
  Users, 
  Star, 
  CheckCircle, 
  Lock,
  ArrowLeft,
  Award,
  Video,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor_name: string;
  duration_hours: number;
  difficulty_level: string;
  category: string;
  cover_image_url: string;
  price: number | null;
  currency: string;
  is_featured: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
  cover_image_url: string | null;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  duration_minutes: number;
  is_free: boolean;
  order_index: number;
  video_url: string | null;
  video_type: string;
}

interface Enrollment {
  id: string;
  progress: number;
  enrolled_at: string;
  completed_at: string | null;
}

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId, user]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);

      // Fetch course data
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('is_published', true)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .in('module_id', modulesData?.map(m => m.id) || [])
        .order('order_index');

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);

      // Check if user is enrolled (only if logged in)
      if (user) {
        const { data: enrollmentData } = await supabase
          .from('course_enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();

        setEnrollment(enrollmentData);
      }

      // Expand first module by default
      if (modulesData && modulesData.length > 0) {
        setExpandedModules(new Set([modulesData[0].id]));
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o curso",
        variant: "destructive"
      });
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (course?.price && course.price > 0) {
      // Paid course - redirect to payment
      try {
        setEnrolling(true);
        
        const { data, error } = await supabase.functions.invoke('create-payment-asaas', {
          body: {
            courseId: course.id,
            customerName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
            customerEmail: user.email
          }
        });

        if (error) throw error;

        if (data?.pixQrCode || data?.invoiceUrl) {
          toast({
            title: "Pagamento Criado",
            description: "Redirecionando para o pagamento..."
          });
          
          if (data.invoiceUrl) {
            window.open(data.invoiceUrl, '_blank');
          }
        }
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao processar pagamento",
          variant: "destructive"
        });
      } finally {
        setEnrolling(false);
      }
    } else {
      // Free course - enroll directly
      try {
        setEnrolling(true);
        
        const { error } = await supabase
          .from('course_enrollments')
          .insert([{
            user_id: user.id,
            course_id: course!.id
          }]);

        if (error) throw error;

        toast({
          title: "Sucesso!",
          description: "Você foi inscrito no curso com sucesso!"
        });

        fetchCourseData();
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Não foi possível se inscrever no curso",
          variant: "destructive"
        });
      } finally {
        setEnrolling(false);
      }
    }
  };

  const watchLesson = (lessonId: string, isFree: boolean) => {
    if (!isFree && !enrollment) {
      toast({
        title: "Acesso Restrito",
        description: "Você precisa se inscrever no curso para assistir esta aula",
        variant: "destructive"
      });
      return;
    }
    navigate(`/lesson/${lessonId}`);
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const getTotalDuration = () => {
    return lessons.reduce((total, lesson) => total + lesson.duration_minutes, 0);
  };

  const getFreeLessonsCount = () => {
    return lessons.filter(lesson => lesson.is_free).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando curso...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="bg-gradient-card border-border/50 max-w-md">
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Curso não encontrado</h3>
            <p className="text-muted-foreground mb-4">
              O curso que você procura não existe ou foi removido.
            </p>
            <Button onClick={() => navigate('/courses')}>
              Ver Todos os Cursos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Netflix-style Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0 h-[80vh]">
          {course.cover_image_url ? (
            <img 
              src={course.cover_image_url} 
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
        
        <div className="relative container mx-auto px-6 py-8 h-[80vh] flex items-center">
          {/* Navigation */}
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="absolute top-8 left-6 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>

          {/* Course Hero Content */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center w-full">
            <div className="lg:col-span-3 space-y-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                  {course.category}
                </Badge>
                <Badge variant="outline" className="bg-card/20 text-foreground border-border/30">
                  {course.difficulty_level}
                </Badge>
                {course.is_featured && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    <Star className="w-3 h-3 mr-1" />
                    Destaque
                  </Badge>
                )}
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                {course.title}
              </h1>
              
              <p className="text-xl text-white/90 leading-relaxed max-w-2xl">
                {course.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-8 text-white/80">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span>Por {course.instructor_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span>{Math.ceil(getTotalDuration() / 60)}h de conteúdo</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span>{lessons.length} aulas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" />
                  <span>{getFreeLessonsCount()} aulas gratuitas</span>
                </div>
              </div>

              {enrollment && (
                <div className="bg-gradient-card/80 backdrop-blur-sm border border-green-500/30 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <span className="font-semibold text-green-400 text-lg">Você está inscrito neste curso!</span>
                  </div>
                  <div className="text-white/80 mb-3">
                    Progresso: {enrollment.progress.toFixed(0)}%
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div 
                      className="bg-gradient-primary h-3 rounded-full transition-all duration-500 shadow-glow"
                      style={{ width: `${enrollment.progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                {enrollment ? (
                  <Button 
                    size="lg" 
                    className="bg-white text-black hover:bg-white/90 font-semibold px-8"
                    onClick={() => navigate('/dashboard')}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Continuar Assistindo
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    className="bg-white text-black hover:bg-white/90 font-semibold px-8"
                    onClick={handleEnroll}
                    disabled={enrolling}
                  >
                    {enrolling ? 'Inscrevendo...' : 
                     course.price && course.price > 0 ? `Comprar por ${course.currency === 'BRL' ? 'R$' : '$'} ${course.price.toFixed(2)}` : 'Inscrever-se Grátis'}
                  </Button>
                )}
                
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => {
                    const firstFreeLesson = lessons.find(l => l.is_free);
                    if (firstFreeLesson) {
                      watchLesson(firstFreeLesson.id, true);
                    }
                  }}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Prévia Gratuita
                </Button>
              </div>
            </div>

            {/* Course Trailer/Preview */}
            <div className="lg:col-span-2">
              <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl">
                {course.cover_image_url ? (
                  <img 
                    src={course.cover_image_url} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-card flex items-center justify-center">
                    <Video className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Button
                    size="lg"
                    className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                    onClick={() => {
                      const firstFreeLesson = lessons.find(l => l.is_free);
                      if (firstFreeLesson) {
                        watchLesson(firstFreeLesson.id, true);
                      }
                    }}
                  >
                    <Play className="w-8 h-8 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl">
          <h2 className="text-3xl font-bold mb-8">Conteúdo do Curso</h2>
          
          <div className="space-y-4">
            {modules.map((module, moduleIndex) => {
              const moduleLessons = lessons.filter(l => l.module_id === module.id);
              const totalDuration = moduleLessons.reduce((sum, lesson) => sum + lesson.duration_minutes, 0);
              const isExpanded = expandedModules.has(module.id);
              
              return (
                <Collapsible 
                  key={module.id} 
                  open={isExpanded} 
                  onOpenChange={() => toggleModule(module.id)}
                >
                  <Card className="bg-gradient-card border-border/50 overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Module Image */}
                            <div className="w-20 h-12 rounded-lg overflow-hidden bg-muted/20 flex-shrink-0">
                              {module.cover_image_url ? (
                                <img
                                  src={module.cover_image_url}
                                  alt={module.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                  <BookOpen className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-1">
                                Módulo {moduleIndex + 1}: {module.title}
                              </CardTitle>
                              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                <span>{moduleLessons.length} aulas</span>
                                <span>{Math.floor(totalDuration / 60)}h {totalDuration % 60}min</span>
                              </div>
                              {module.description && (
                                <CardDescription className="mt-2 line-clamp-2">
                                  {module.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">
                              {moduleLessons.filter(l => l.is_free).length} gratuitas
                            </Badge>
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-6">
                        <div className="space-y-2">
                          {moduleLessons.map((lesson, lessonIndex) => (
                            <div 
                              key={lesson.id}
                              className="flex items-center gap-4 p-4 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group"
                              onClick={() => watchLesson(lesson.id, lesson.is_free)}
                            >
                              {/* Lesson Thumbnail */}
                              <div className="w-16 h-10 rounded overflow-hidden bg-muted/20 flex-shrink-0">
                                {lesson.video_url ? (
                                  <img
                                    src={lesson.video_url}
                                    alt={lesson.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                                    <Video className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Play className="w-3 h-3 text-white" />
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                  {lessonIndex + 1}. {lesson.title}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {lesson.duration_minutes} min
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {lesson.is_free ? (
                                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                                    Gratuita
                                  </Badge>
                                ) : !enrollment ? (
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <Play className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;