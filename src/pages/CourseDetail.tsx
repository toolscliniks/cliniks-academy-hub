import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Clock, 
  BookOpen, 
  Users, 
  Star, 
  CheckCircle, 
  Lock,
  ArrowLeft
} from 'lucide-react';

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
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  duration_minutes: number;
  is_free: boolean;
  order_index: number;
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
          // Show payment modal or redirect to payment page
          toast({
            title: "Pagamento Criado",
            description: "Redirecionando para o pagamento..."
          });
          
          // For now, we'll show the PIX QR code in a simple way
          // In a real implementation, you'd create a proper payment modal
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

        // Refresh enrollment data
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
      {/* Hero Section */}
      <div className="relative">
        {/* Background Image */}
        {course.cover_image_url && (
          <div className="absolute inset-0 h-[70vh]">
            <img 
              src={course.cover_image_url} 
              alt={course.title}
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>
        )}
        
        <div className="relative container mx-auto px-4 py-8">
          {/* Navigation */}
          <Button
            variant="ghost"
            onClick={() => navigate('/courses')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos cursos
          </Button>

          {/* Course Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="secondary">{course.category}</Badge>
                <Badge variant="outline">{course.difficulty_level}</Badge>
              </div>
              
              <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-muted-foreground mb-6">{course.description}</p>
              
              <div className="flex flex-wrap items-center gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm">Instrutor: {course.instructor_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm">{Math.ceil(getTotalDuration() / 60)}h de conteúdo</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm">{lessons.length} aulas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-primary" />
                  <span className="text-sm">{getFreeLessonsCount()} aulas gratuitas</span>
                </div>
              </div>

              {enrollment && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-semibold">Você está inscrito neste curso!</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Progresso: {enrollment.progress.toFixed(0)}%
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${enrollment.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="bg-gradient-card border-border/50 sticky top-8">
                <CardHeader>
                  <div className="aspect-video mb-4">
                    {course.cover_image_url ? (
                      <img 
                        src={course.cover_image_url} 
                        alt={course.title}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {course.price && course.price > 0 ? (
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-primary">
                        {course.currency === 'BRL' ? 'R$' : course.currency === 'USD' ? '$' : '€'} 
                        {course.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Pagamento único</div>
                    </div>
                  ) : (
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-green-500">Gratuito</div>
                    </div>
                  )}
                </CardHeader>
                
                <CardContent>
                  {enrollment ? (
                    <Button 
                      className="w-full mb-4" 
                      onClick={() => navigate('/dashboard')}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Continuar Assistindo
                    </Button>
                  ) : (
                    <Button 
                      className="w-full mb-4" 
                      onClick={handleEnroll}
                      disabled={enrolling}
                    >
                      {enrolling ? 'Inscrevendo...' : 
                       course.price && course.price > 0 ? 'Comprar Curso' : 'Inscrever-se Grátis'}
                    </Button>
                  )}
                  
                  <div className="text-center text-sm text-muted-foreground">
                    Acesso vitalício • Certificado de conclusão
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">Conteúdo do Curso</h2>
        
        <div className="space-y-4">
          {modules.map((module, moduleIndex) => {
            const moduleLessons = lessons.filter(l => l.module_id === module.id);
            const totalDuration = moduleLessons.reduce((sum, lesson) => sum + lesson.duration_minutes, 0);
            
            return (
              <Card key={module.id} className="bg-gradient-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Módulo {moduleIndex + 1}: {module.title}</span>
                    <div className="text-sm text-muted-foreground">
                      {moduleLessons.length} aulas • {Math.ceil(totalDuration / 60)}h {totalDuration % 60}min
                    </div>
                  </CardTitle>
                  {module.description && (
                    <CardDescription>{module.description}</CardDescription>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    {moduleLessons.map((lesson, lessonIndex) => (
                      <div 
                        key={lesson.id}
                        className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted/20 transition-colors"
                        onClick={() => watchLesson(lesson.id, lesson.is_free)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-primary/10 text-primary text-xs font-semibold rounded-full flex items-center justify-center">
                            {lessonIndex + 1}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{lesson.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {lesson.duration_minutes} min
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {lesson.is_free ? (
                            <Badge variant="secondary" className="text-xs">
                              Gratuita
                            </Badge>
                          ) : !enrollment ? (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Play className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;