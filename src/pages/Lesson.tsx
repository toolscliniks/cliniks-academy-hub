import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProtectedVideoPlayer from '@/components/ProtectedVideoPlayer';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Clock, 
  Play, 
  CheckCircle, 
  Lock,
  Award
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_type: 'youtube' | 'upload' | 'vimeo';
  external_video_id: string | null;
  external_video_platform: string | null;
  duration_minutes: number;
  is_free: boolean;
  order_index: number;
}

interface Module {
  id: string;
  title: string;
  course_id: string;
}

interface Course {
  id: string;
  title: string;
  instructor_name: string | null;
}

const Lesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (lessonId) {
      fetchLessonData();
    }
  }, [lessonId, user]);

  const fetchLessonData = async () => {
    try {
      setLoading(true);
      
      // Fetch lesson data
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select(`
          *,
          modules!inner (
            id,
            title,
            course_id,
            courses!inner (
              id,
              title,
              instructor_name
            )
          )
        `)
        .eq('id', lessonId)
        .single();

      if (lessonError) throw lessonError;

      setLesson(lessonData as Lesson);
      setModule(lessonData.modules);
      setCourse(lessonData.modules.courses);

      // Check if user has access
      if (lessonData.is_free || !user) {
        setHasAccess(lessonData.is_free);
      } else {
        // Check if user is enrolled in the course
        const { data: enrollmentData } = await supabase
          .from('course_enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', lessonData.modules.course_id)
          .maybeSingle();

        setHasAccess(!!enrollmentData);
        setEnrollment(enrollmentData);

        // Check if lesson is completed
        if (enrollmentData) {
          const { data: progress } = await supabase
            .from('lesson_progress')
            .select('is_completed')
            .eq('user_id', user.id)
            .eq('lesson_id', lessonId)
            .single();

          setIsCompleted(progress?.is_completed || false);
        }
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a aula",
        variant: "destructive"
      });
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async () => {
    if (!user || !lesson) return;

    try {
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lesson.id,
          is_completed: true,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      setIsCompleted(true);
      toast({
        title: "Parabéns!",
        description: "Aula marcada como concluída"
      });
    } catch (error) {
      console.error('Error marking lesson as completed:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a aula como concluída",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando aula...</p>
        </div>
      </div>
    );
  }

  if (!lesson || !module || !course) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="bg-gradient-card border-border/50 max-w-md">
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Aula não encontrada</h3>
            <p className="text-muted-foreground mb-4">
              A aula que você procura não existe ou foi removida.
            </p>
            <Button onClick={() => navigate('/courses')}>
              Voltar aos Cursos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/courses/${course.id}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao curso
          </Button>
          
          <div className="text-sm text-muted-foreground mb-2">
            {course.title} → {module.title}
          </div>
          <h1 className="text-3xl font-bold">{lesson.title}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-card border-border/50">
              <CardContent className="p-0">
                {hasAccess ? (
                  <div className="aspect-video">
                    <ProtectedVideoPlayer
                      videoUrl={lesson.video_url}
                      videoType={lesson.video_type as 'youtube' | 'upload' | 'vimeo'}
                      externalVideoId={lesson.external_video_id}
                      externalVideoPlatform={lesson.external_video_platform}
                      title={lesson.title}
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted/20 flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Conteúdo Bloqueado</h3>
                      <p className="text-muted-foreground mb-4">
                        Você precisa se inscrever no curso para acessar esta aula.
                      </p>
                      <Button onClick={() => navigate(`/courses/${course.id}`)}>
                        Ver Curso Completo
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lesson Info */}
            <Card className="bg-gradient-card border-border/50 mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{lesson.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    {lesson.is_free && (
                      <Badge variant="secondary">Gratuita</Badge>
                    )}
                    {isCompleted && (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Concluída
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {lesson.duration_minutes} min
                  </div>
                  <div>Instrutor: {course.instructor_name || 'Não informado'}</div>
                </div>
              </CardHeader>
              
              {lesson.description && (
                <CardContent>
                  <p className="text-muted-foreground">{lesson.description}</p>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
              {enrollment && enrollment.completed_at && (
                <Card className="bg-gradient-card border-border/50 mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-500" />
                      Curso Concluído!
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Parabéns! Você concluiu o curso. Baixe seu certificado.
                    </p>
                    <Button
                      onClick={async () => {
                        try {
                          const { data, error } = await supabase.functions.invoke('generate-certificate-pdf', {
                            body: { courseId: course.id }
                          });
                          
                          if (error) throw error;
                          
                          // Open certificate in new tab
                          if (data?.certificateUrl) {
                            window.open(data.certificateUrl, '_blank');
                          }
                          
                          toast({
                            title: "Certificado gerado!",
                            description: "Seu certificado foi gerado com sucesso."
                          });
                        } catch (error: any) {
                          toast({
                            title: "Erro",
                            description: error.message || "Erro ao gerar certificado",
                            variant: "destructive"
                          });
                        }
                      }}
                      className="w-full"
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Baixar Certificado
                    </Button>
                  </CardContent>
                </Card>
              )}

            {hasAccess && !isCompleted && (
              <Card className="bg-gradient-card border-border/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Progresso da Aula</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={markAsCompleted}
                    className="w-full"
                    disabled={isCompleted}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como Concluída
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Sobre o Curso</CardTitle>
              </CardHeader>
              <CardContent>
                <h4 className="font-semibold mb-1">{course.title}</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Módulo: {module.title}
                </p>
                
                <Button
                  variant="outline"
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Ver Curso Completo
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lesson;