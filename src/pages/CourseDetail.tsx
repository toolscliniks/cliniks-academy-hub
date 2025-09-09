import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import CertificateNameDialog from '@/components/CertificateNameDialog';

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
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [lastCompletedLessonId, setLastCompletedLessonId] = useState<string | null>(null);
  const [actualProgress, setActualProgress] = useState<number>(0);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);

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
            // Get all completed lessons for this course - only if user is enrolled
            const { data: allProgressData } = await supabase
              .from('lesson_progress')
              .select('lesson_id, completed_at')
              .eq('user_id', user.id)
              .eq('is_completed', true)
              .in('lesson_id', lessonIds);
            
            // Calculate actual progress only for enrolled users
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
        } else {
          // Reset progress if user is not enrolled
          setActualProgress(0);
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
            type: 'course',
            billingType: paymentMethod
          }
        });

        if (error) {
          console.error('Payment creation error:', error);
          throw error;
        }

        console.log('Payment response:', data);

        // Check if there are missing required fields
        if (data && data.error === 'Dados obrigatórios não preenchidos') {
          toast({
            title: "Dados do Perfil Incompletos",
            description: data.message,
            variant: "destructive",
            duration: 8000
          });
          
          // Redirect to profile page
          setTimeout(() => {
            navigate('/profile');
          }, 2000);
          return;
        }

        // Show success message about payment email
        toast({
          title: "Solicitação de Compra Enviada!",
          description: "Você receberá um email em breve com as instruções de pagamento. Verifique sua caixa de entrada e spam.",
          duration: 8000
        });
        
        // Redirect to dashboard after showing the message
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
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

  const generateCertificateWithCustomName = async (customName: string) => {
    if (!user || !courseId) return;

    try {
      setGeneratingCertificate(true);
      
      // First, update the user's profile with the custom name for the certificate
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ certificate_name: customName })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Generate the certificate
      const { data, error } = await supabase.functions.invoke('generate-certificate-pdf', {
        body: { 
          courseId,
          customName // Pass the custom name to override the default
        }
      });

      if (error) throw error;

      // Decode the base64 HTML and create a blob URL
      const base64Data = data.certificateUrl.replace('data:text/html;base64,', '');
      const htmlContent = atob(base64Data);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Open the certificate in a new window
      const printWindow = window.open(blobUrl, '_blank');
      
      if (printWindow) {
        printWindow.focus();
        // Add a small delay to ensure the content loads before triggering print dialog
        setTimeout(() => {
          printWindow.print();
          // Clean up the blob URL after use
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      } else {
        // Clean up if window couldn't be opened
        URL.revokeObjectURL(blobUrl);
      }

      toast({
        title: "Certificado gerado!",
        description: `Certificado gerado com sucesso para ${customName}.`
      });
    } catch (error: any) {
      console.error('Error generating certificate:', error);
      toast({
        title: "Erro ao gerar certificado",
        description: error.message || "Não foi possível gerar o certificado.",
        variant: "destructive"
      });
    } finally {
      setGeneratingCertificate(false);
    }
  };

  const handleCertificateClick = () => {
    setShowCertificateDialog(true);
  };

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
                    <div className="aspect-video rounded-t-lg overflow-hidden">
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${extractYouTubeVideoId(course.trailer_video_url)}?autoplay=0&controls=1&rel=0&modestbranding=1`}
                        title="Trailer do curso"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
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
                          <Button 
                            size="sm" 
                            className="w-full bg-green-500 hover:bg-green-600 text-white"
                            onClick={handleCertificateClick}
                            disabled={generatingCertificate}
                          >
                            <Award className="mr-2 h-4 w-4" />
                            {generatingCertificate ? 'Gerando...' : 'Baixar Certificado'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center">
                        {course.price && course.price > 0 ? <p className="text-3xl font-bold text-white">R$ {course.price}</p> : <p className="text-3xl font-bold text-white">Gratuito</p>}
                      </div>
                      {course.price && course.price > 0 && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-white/90 mb-2 block">Método de Pagamento</label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                              <SelectTrigger className="w-full bg-background/50 border-white/20 text-white">
                                <SelectValue placeholder="Selecione o método de pagamento" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CREDIT_CARD">💳 Cartão de Crédito</SelectItem>
                                <SelectItem value="DEBIT_CARD">💳 Cartão de Débito</SelectItem>
                                <SelectItem value="PIX">🔄 PIX</SelectItem>
                                <SelectItem value="BOLETO">📄 Boleto Bancário</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Conteúdo do Curso
              </h2>
              <p className="text-muted-foreground text-lg">
                Explore os módulos e aulas deste curso incrível
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module, index) => {
                const moduleLessons = lessons.filter(l => l.module_id === module.id);
                return (
                  <Collapsible key={module.id} open={expandedModules.has(module.id)} onOpenChange={() => toggleModule(module.id)}>
                    <Card className="group relative overflow-hidden bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 transform hover:-translate-y-1 h-fit">
                      {/* 3D Effect Background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <CollapsibleTrigger asChild>
                        <CardHeader className="relative p-0 cursor-pointer overflow-hidden">
                          {/* Module Cover Image - Vertical Format */}
                          <div className="relative h-64 w-full overflow-hidden">
                            {module.cover_image_url ? (
                              <>
                                <img 
                                  src={module.cover_image_url} 
                                  alt={module.title} 
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              </>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 flex items-center justify-center">
                                <BookOpen className="w-12 h-12 text-primary/60" />
                              </div>
                            )}
                            
                            {/* Floating Elements for 3D Effect */}
                            <div className="absolute top-3 right-3 w-2 h-2 bg-primary/30 rounded-full animate-pulse" />
                            <div className="absolute bottom-6 left-4 w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce" style={{animationDelay: '1s'}} />
                            
                            {/* Expand Icon - Top Right Corner */}
                            <div className="absolute top-3 right-3">
                              <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-transform duration-300 group-hover:rotate-180">
                                {expandedModules.has(module.id) ? 
                                  <ChevronDown className="w-4 h-4 text-white" /> : 
                                  <ChevronRight className="w-4 h-4 text-white" />
                                }
                              </div>
                            </div>
                            
                            {/* Module Number Badge - Top Left */}
                            <div className="absolute top-3 left-3">
                              <div className="w-6 h-6 rounded-full bg-primary/80 backdrop-blur-sm border border-primary/30 flex items-center justify-center">
                                <span className="text-xs font-bold text-white">{index + 1}</span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      {/* Module Info - Below Image */}
                      <div className="p-4 pb-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {moduleLessons.length} aulas
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {moduleLessons.reduce((acc, l) => acc + l.duration_minutes, 0)} min
                          </span>
                        </div>
                        <CardTitle className="text-base font-semibold line-clamp-2 mb-1">
                          {module.title}
                        </CardTitle>
                      </div>
                      
                      <CollapsibleContent>
                        <CardContent className="p-4">
                          <div className="grid gap-3">
                            {moduleLessons.map((lesson, lessonIndex) => (
                              <div 
                                key={lesson.id} 
                                className="group/lesson relative overflow-hidden rounded-lg border border-border/30 bg-gradient-to-r from-card to-card/80 hover:from-primary/5 hover:to-accent/5 transition-all duration-300 cursor-pointer hover:shadow-md hover:shadow-primary/5 transform hover:-translate-y-0.5" 
                                onClick={() => watchLesson(lesson.id, lesson.is_free)}
                              >
                                <div className="flex items-center gap-3 p-3">
                                  {/* Lesson Thumbnail - Compact */}
                                  <div className="relative w-16 h-10 rounded-md overflow-hidden bg-muted/20 flex-shrink-0 group-hover/lesson:shadow-md transition-shadow duration-300">
                                    {lesson.video_type === 'youtube' && lesson.external_video_id ? (
                                      <>
                                        <img 
                                          src={`https://img.youtube.com/vi/${lesson.external_video_id}/mqdefault.jpg`} 
                                          alt={lesson.title} 
                                          className="w-full h-full object-cover transition-transform duration-300 group-hover/lesson:scale-105" 
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/lesson:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                          <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                                            <Play className="w-3 h-3 text-primary ml-0.5" />
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                                        <Video className="w-4 h-4 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Lesson Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                                        {lessonIndex + 1}
                                      </span>
                                      <div className="font-medium text-sm group-hover/lesson:text-primary transition-colors duration-300 truncate">
                                        {lesson.title}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{lesson.duration_minutes} min</span>
                                      </div>
                                      {lesson.is_free && (
                                        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500 border-green-500/20 px-1.5 py-0.5">
                                          Gratuita
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Lesson Status */}
                                  <div className="flex items-center gap-2">
                                    {lesson.is_free ? (
                                      <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                                        <Play className="w-5 h-5 text-green-500" />
                                      </div>
                                    ) : !enrollment ? (
                                      <div className="w-10 h-10 rounded-full bg-muted/20 border border-border/30 flex items-center justify-center">
                                        <Lock className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center opacity-0 group-hover/lesson:opacity-100 transition-opacity duration-300">
                                        <Play className="w-5 h-5 text-primary" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Subtle 3D border effect */}
                                <div className="absolute inset-0 rounded-xl border border-primary/0 group-hover/lesson:border-primary/20 transition-colors duration-300 pointer-events-none" />
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
      
      <CertificateNameDialog
        open={showCertificateDialog}
        onOpenChange={setShowCertificateDialog}
        onConfirm={generateCertificateWithCustomName}
        courseName={course?.title || ''}
        defaultName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''}
      />
    </div>
  );
};

export default CourseDetail;