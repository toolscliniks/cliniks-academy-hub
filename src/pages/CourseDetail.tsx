import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
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
  is_featured: boolean;
  category: string;
  cover_image_url: string;
  trailer_video_url?: string;
  price: number | null;
  currency: string;
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
  external_video_id?: string;
  external_video_platform?: string;
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
  const [lastCompletedLessonId, setLastCompletedLessonId] = useState<string | null>(null);
  const [actualProgress, setActualProgress] = useState<number>(0);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId, user]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);

      const { data: courseData, error: courseError } = await supabase
        .from('courses').select('*').eq('id', courseId).eq('is_published', true).single();
      if (courseError) throw courseError;
      setCourse(courseData);

      const { data: modulesData, error: modulesError } = await supabase
        .from('modules').select('*').eq('course_id', courseId).order('order_index');
      if (modulesError) throw modulesError;
      const orderedModules = modulesData || [];
      setModules(orderedModules);

      const moduleIds = orderedModules.map(m => m.id);
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons').select('*').in('module_id', moduleIds).order('module_id').order('order_index');
      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);

      if (user) {
        const { data: enrollmentData } = await supabase
          .from('course_enrollments').select('*').eq('user_id', user.id).eq('course_id', courseId).maybeSingle();
        setEnrollment(enrollmentData);

        if (enrollmentData) {
          // Get all lessons for this course to filter progress
          const lessonIds = lessonsData?.map(l => l.id) || [];
          
          if (lessonIds.length > 0) {
            // Get all completed lessons for this course
            const { data: allProgressData } = await supabase
              .from('lesson_progress')
              .select('lesson_id, completed_at')
              .eq('user_id', user.id)
              .eq('is_completed', true)
              .in('lesson_id', lessonIds);
            
            // Calculate actual progress
            const completedCount = allProgressData?.length || 0;
            const totalLessons = lessonIds.length;
            const calculatedProgress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
            setActualProgress(calculatedProgress);
            
            // Get the last completed lesson
            if (allProgressData && allProgressData.length > 0) {
              const sortedProgress = allProgressData.sort((a, b) => 
                new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
              );
              setLastCompletedLessonId(sortedProgress[0].lesson_id);
            }
          }
        }
      }

      if (orderedModules.length > 0) {
        setExpandedModules(new Set([orderedModules[0].id]));
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast({ title: "Erro", description: "Não foi possível carregar o curso", variant: "destructive" });
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const findNextLesson = () => {
    if (!lessons.length) return null;
    
    const sortedLessons = [...lessons].sort((a, b) => {
      const moduleA = modules.find(m => m.id === a.module_id)?.order_index || 0;
      const moduleB = modules.find(m => m.id === b.module_id)?.order_index || 0;
      if (moduleA !== moduleB) return moduleA - moduleB;
      return a.order_index - b.order_index;
    });

    if (!lastCompletedLessonId) {
      return sortedLessons[0]?.id;
    }

    const lastCompletedIndex = sortedLessons.findIndex(l => l.id === lastCompletedLessonId);
    if (lastCompletedIndex > -1 && lastCompletedIndex < sortedLessons.length - 1) {
      return sortedLessons[lastCompletedIndex + 1].id;
    }

    return sortedLessons[0]?.id;
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (course?.price && course.price > 0) {
      try {
        setEnrolling(true);
        console.log('Creating payment for course:', courseId);
        
        toast({ 
          title: "Redirecionando...", 
          description: "Você será redirecionado para a página de pagamento." 
        });

        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: { 
            courseId: courseId,
            type: 'course'
          }
        });

        if (error) {
          console.error('Payment creation error:', error);
          throw error;
        }

        console.log('Payment response:', data);

        if (data?.invoiceUrl) {
          // Redirect to Asaas payment page
          window.open(data.invoiceUrl, '_blank');
          toast({
            title: "Pagamento criado!",
            description: "Você será redirecionado para finalizar o pagamento."
          });
        } else if (data?.checkoutUrl) {
          // Alternative checkout URL
          window.open(data.checkoutUrl, '_blank');
          toast({
            title: "Pagamento criado!",
            description: "Você será redirecionado para finalizar o pagamento."
          });
        } else if (data?.message) {
          // N8N webhook mode
          toast({
            title: "Sucesso!",
            description: data.message,
          });
          navigate('/dashboard');
        } else {
          throw new Error('Resposta de pagamento inválida');
        }
      } catch (error: any) {
        console.error('Error creating payment:', error);
        toast({ 
          title: "Erro no pagamento", 
          description: error.message || "Erro ao processar pagamento", 
          variant: "destructive" 
        });
      } finally {
        setEnrolling(false);
      }
      return;
    }

    // Free course enrollment
    try {
      setEnrolling(true);
      const { data, error } = await supabase.from('course_enrollments')
        .insert({ user_id: user.id, course_id: courseId, enrolled_at: new Date().toISOString() })
        .select().single();
      if (error) throw error;
      setEnrollment(data);
      toast({ title: "Inscrição realizada!", description: "Você agora tem acesso a este curso.", variant: "success" as any });
    } catch (error) {
      console.error('Error enrolling in course:', error);
      toast({ title: "Erro na Inscrição", description: "Não foi possível concluir a inscrição.", variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  const watchLesson = (lessonId: string, isFree: boolean) => {
    if (isFree || enrollment) {
      navigate(`/courses/${courseId}/lessons/${lessonId}`);
    } else {
      toast({ title: "Acesso Restrito", description: "Inscreva-se no curso para assistir a esta aula.", variant: "destructive" });
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) newSet.delete(moduleId); else newSet.add(moduleId);
      return newSet;
    });
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|watch\?v=|embed\/|v\/)|youtu\.be\/)([^"&?\/\s]{11})/;    
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const getTotalDuration = () => {
    const totalMinutes = lessons.reduce((sum, lesson) => sum + lesson.duration_minutes, 0);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`;
  };

  const getFreeLessonsCount = () => lessons.filter(lesson => lesson.is_free).length;

  if (loading) return <div className="flex items-center justify-center h-screen bg-background text-foreground">Carregando...</div>;
  if (!course) return <div className="flex items-center justify-center h-screen bg-background text-foreground">Curso não encontrado.</div>;

  const totalLessons = lessons.length;

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="relative h-[50vh] md:h-[60vh] bg-cover bg-center" style={{ backgroundImage: `url(${course.cover_image_url})` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-12 md:pb-20">
          <Button variant="outline" className="absolute top-6 left-4 bg-background/50 backdrop-blur-sm border-white/20 hover:bg-background/80" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center w-full">
            <div className="lg:col-span-3 space-y-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">{course.category}</Badge>
                {course.is_featured && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Star className="w-3 h-3 mr-1" />Destaque</Badge>}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white shadow-lg">{course.title}</h1>
              <p className="text-lg md:text-xl text-white/80 max-w-3xl">{course.description}</p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/90">
                <div className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /><span>Por {course.instructor_name}</span></div>
                <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /><span>{getTotalDuration()}</span></div>
                <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /><span>{totalLessons} aulas</span></div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <Card className="bg-background/70 backdrop-blur-lg border-white/10 shadow-2xl">
                {course.trailer_video_url && extractYouTubeVideoId(course.trailer_video_url) && (
                  <CardHeader className="p-0">
                    <div className="aspect-video rounded-t-lg overflow-hidden relative group">
                      <img src={`https://img.youtube.com/vi/${extractYouTubeVideoId(course.trailer_video_url)}/hqdefault.jpg`} alt="Trailer do curso" className="w-full h-full object-cover" />
                      <a href={course.trailer_video_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-12 h-12 text-white drop-shadow-lg" />
                      </a>
                    </div>
                  </CardHeader>
                )}
                <CardContent className="p-6">
                  {enrollment ? (
                    <div className="space-y-4">
                      {actualProgress < 100 ? (
                        <>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <p className="text-sm font-medium text-muted-foreground">Seu Progresso</p>
                              <p className="text-sm font-bold text-primary">{Math.round(actualProgress)}%</p>
                            </div>
                            <Progress value={actualProgress} className="h-2" />
                          </div>
                          <Button className="w-full" onClick={() => { const nextLessonId = findNextLesson(); if (nextLessonId) watchLesson(nextLessonId, false); }}>
                            <Play className="mr-2 h-4 w-4" />
                            Continuar de onde parou
                          </Button>
                        </>
                      ) : (
                        <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                          <Award className="w-10 h-10 text-green-500 mx-auto mb-3" />
                          <h3 className="text-lg font-bold text-green-500">Parabéns, você concluiu!</h3>
                          <p className="text-xs text-muted-foreground mt-1 mb-3">Seu certificado já está disponível.</p>
                          <Button size="sm" className="w-full bg-green-500 hover:bg-green-600 text-white"><Award className="mr-2 h-4 w-4" />Baixar Certificado</Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center">
                        {course.price && course.price > 0 ? <p className="text-3xl font-bold text-white">R$ {course.price}</p> : <p className="text-3xl font-bold text-white">Gratuito</p>}
                      </div>
                      <Button size="lg" className="w-full text-lg py-6" onClick={handleEnroll} disabled={enrolling}>{enrolling ? 'Processando...' : 'Inscreva-se Agora'}</Button>
                      <h4 className="font-bold pt-4 text-white">Este curso inclui:</h4>
                      <ul className="space-y-2 text-sm text-white/80">
                        <li className="flex items-center gap-3"><Clock className="w-4 h-4 text-primary" /><span>{getTotalDuration()} de conteúdo</span></li>
                        <li className="flex items-center gap-3"><BookOpen className="w-4 h-4 text-primary" /><span>{totalLessons} aulas</span></li>
                        {getFreeLessonsCount() > 0 && <li className="flex items-center gap-3"><Video className="w-4 h-4 text-primary" /><span>{getFreeLessonsCount()} aulas gratuitas</span></li>}
                        <li className="flex items-center gap-3"><Award className="w-4 h-4 text-primary" /><span>Certificado de conclusão</span></li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-bold mb-8">Conteúdo do Curso</h2>
            {modules.map((module, index) => {
              const moduleLessons = lessons.filter(l => l.module_id === module.id);
              return (
                <Collapsible key={module.id} open={expandedModules.has(module.id)} onOpenChange={() => toggleModule(module.id)} className="mb-6">
                  <Card className="bg-card border border-border/50 overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="flex flex-row items-center justify-between p-6 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-6">
                          {module.cover_image_url && <img src={module.cover_image_url} alt={module.title} className="w-24 h-14 object-cover rounded-md" />}
                          <div>
                            <CardTitle className="text-xl font-semibold">{index + 1}. {module.title}</CardTitle>
                            <CardDescription className="mt-1">{moduleLessons.length} aulas</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground hidden sm:block">{moduleLessons.reduce((acc, l) => acc + l.duration_minutes, 0)} min</span>
                          {expandedModules.has(module.id) ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-6">
                        <div className="space-y-2">
                          {moduleLessons.map((lesson, lessonIndex) => (
                            <div key={lesson.id} className="flex items-center gap-4 p-4 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group" onClick={() => watchLesson(lesson.id, lesson.is_free)}>
                              <div className="w-16 h-10 rounded overflow-hidden bg-muted/20 flex-shrink-0 relative">
                                {lesson.video_type === 'youtube' && lesson.external_video_id ? (
                                  <img src={`https://img.youtube.com/vi/${lesson.external_video_id}/mqdefault.jpg`} alt={lesson.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center"><Video className="w-4 h-4 text-muted-foreground" /></div>
                                )}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Play className="w-3 h-3 text-white" /></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">{lessonIndex + 1}. {lesson.title}</div>
                                <div className="text-xs text-muted-foreground">{lesson.duration_minutes} min</div>
                              </div>
                              <div className="flex items-center gap-2">
                                {lesson.is_free ? (
                                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">Gratuita</Badge>
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