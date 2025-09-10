import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  Play,
  VideoOff,
  X,
  BookOpen,
  Award,
  BarChart2,
  ListVideo
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SecureYouTubePlayer from '@/components/video/SecureYouTubePlayer';

// Tipos de dados
interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_type: 'youtube' | 'vimeo' | 'upload';
  duration_minutes: number;
  order_index: number;
  is_free: boolean;
  is_completed?: boolean;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  modules: Module[];
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
}

// Componente de lista de módulos e aulas
const ModuleList = ({
  courseId,
  modules,
  currentLessonId,
  onLessonSelect,
  completedLessons,
}: {
  courseId: string;
  modules: Module[];
  currentLessonId: string;
  onLessonSelect: (lessonId: string) => void;
  completedLessons: Set<string>;
}) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Expande o módulo da aula atual
  useEffect(() => {
    if (!currentLessonId || !modules.length) return;

    const currentModule = modules.find(module => 
      module.lessons.some(lesson => lesson.id === currentLessonId)
    );

    if (currentModule) {
      setExpandedModules(prev => new Set(prev).add(currentModule.id));
    }
  }, [currentLessonId, modules]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  if (!modules.length) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-2 p-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {modules.map(module => {
        const isExpanded = expandedModules.has(module.id);
        const moduleLessons = module.lessons || [];
        const completedInModule = moduleLessons.filter(l => completedLessons.has(l.id)).length;
        
        return (
          <div key={module.id} className="rounded-lg border overflow-hidden">
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{module.title}</span>
                <span className="text-xs text-muted-foreground">
                  {completedInModule}/{moduleLessons.length} concluídas
                </span>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            
            {isExpanded && (
              <div className="border-t divide-y">
                {moduleLessons.map(lesson => {
                  const isCurrent = lesson.id === currentLessonId;
                  const isCompleted = completedLessons.has(lesson.id);
                  // Removendo o bloqueio para permitir navegação entre as aulas
                  const isLocked = false;
                  
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => !isLocked && onLessonSelect(lesson.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 text-left text-sm transition-colors',
                        isCurrent 
                          ? 'bg-primary/10 text-primary font-medium' 
                          : 'hover:bg-muted/50',
                        isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                      )}
                      disabled={isLocked}
                    >
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : isLocked ? (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Play className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="truncate">{lesson.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{lesson.duration_minutes} min</span>
                        {isLocked && <Lock className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Componente principal da página de aula
// Função para validar se uma URL é de imagem
const isImageUrl = (url: string): boolean => {
  if (!url) return false;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  return imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

// Função para validar e extrair o ID do vídeo do YouTube
const getYoutubeVideoId = (url: string | null): string | null => {
  if (!url) return null;
  
  // Verifica se é uma URL de imagem (não deve ser tratada como vídeo)
  if (isImageUrl(url)) {
    console.warn('URL de imagem fornecida como vídeo do YouTube:', url);
    return null;
  }
  
  try {
    // Verifica se é uma URL do YouTube
    if (!url.match(/youtube\.com|youtu\.be/)) {
      console.error('URL do YouTube inválida ou formato não suportado:', url);
      return null;
    }
    
    // Extrai o ID do vídeo da URL
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/|v=|embed\/|youtu\.be\/|\/v\/|\/e\/|watch\?v=|\&v=))([^#\&\?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[7] && match[7].length === 11) {
      return match[7];
    }
    
    console.error('ID do YouTube inválido ou não encontrado na URL:', url);
    return null;
  } catch (error) {
    console.error('Erro ao processar URL do YouTube:', error);
    return null;
  }
};

// Função para validar e extrair o ID do vídeo do Vimeo
const getVimeoVideoId = (url: string | null): string | null => {
  if (!url) return null;
  
  // Verifica se é uma URL de imagem (não deve ser tratada como vídeo)
  if (isImageUrl(url)) {
    console.warn('URL de imagem fornecida como vídeo do Vimeo:', url);
    return null;
  }
  
  try {
    // Verifica se é uma URL do Vimeo
    if (!url.includes('vimeo.com')) {
      console.error('URL do Vimeo inválida ou formato não suportado:', url);
      return null;
    }
    
    // Extrai o ID do vídeo da URL
    const regExp = /(?:videos|video|channels|\/)([\/\d]+)/;
    const match = url.match(regExp);
    
    if (match && match[1]) {
      return match[1];
    }
    
    console.error('URL do Vimeo inválida ou formato não suportado:', url);
    return null;
  } catch (error) {
    console.error('Erro ao processar URL do Vimeo:', error);
    return null;
  }
};

// Função para validar URL de vídeo
const validateVideoUrl = (url: string | null, type: 'youtube' | 'vimeo' | 'upload'): boolean => {
  if (!url) return false;
  
  // Verifica se é uma URL de imagem
  if (isImageUrl(url)) {
    console.warn('Tentativa de usar URL de imagem como vídeo:', url);
    return false;
  }
  
  // Validação baseada no tipo de vídeo
  switch (type) {
    case 'youtube':
      return !!getYoutubeVideoId(url);
    case 'vimeo':
      return !!getVimeoVideoId(url);
    case 'upload':
      // Para uploads, verifica se a URL parece ser um vídeo
      const videoExtensions = ['.mp4', '.webm', '.ogg'];
      return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
    default:
      return false;
  }
};

// Componente VideoPlayer removido - agora usando AdvancedVideoPlayer

const LessonPage = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estados
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [isCompleting, setIsCompleting] = useState(false);
  const [showNextLessonModal, setShowNextLessonModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [nextLesson, setNextLesson] = useState<{id: string; title: string} | null>(null);

  // Buscar dados do curso e progresso
  const fetchCourseData = useCallback(async () => {
    if (!courseId || !lessonId) return;
    
    setLoading(true);
    try {
      // Buscar curso e módulos
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          modules (
            *,
            lessons (
              *
            )
          )
        `)
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      if (!courseData) throw new Error('Curso não encontrado');

      // Função para validar e obter a aula atual
      const getValidatedLesson = (lesson: Lesson): Lesson => {
        // Criar uma cópia da aula para não modificar o original
        let validatedLesson = { ...lesson };
        
        // Validar o tipo de mídia da aula
        let videoType = validatedLesson.video_type as 'youtube' | 'vimeo' | 'upload';
        
        // Se for um vídeo, verificar se a URL é válida
        if (validatedLesson.video_url) {
          if (isImageUrl(validatedLesson.video_url)) {
            console.warn(`Aula ${validatedLesson.id} tem uma URL de imagem como vídeo:`, validatedLesson.video_url);
            // Se for uma imagem, definir como null para evitar erros no player
            return {
              ...validatedLesson,
              video_url: null,
              video_type: 'upload',
              is_invalid_media: true
            } as Lesson & { is_invalid_media?: boolean };
          }
          
          // Validar a URL do vídeo com base no tipo
          if (!validateVideoUrl(validatedLesson.video_url, videoType)) {
            console.warn(`URL de vídeo inválida para a aula ${validatedLesson.id}:`, {
              url: validatedLesson.video_url,
              type: videoType
            });
            
            // Se a URL for inválida, tentar determinar o tipo correto
            let detectedType: 'youtube' | 'vimeo' | 'upload' = 'upload';
            
            if (getYoutubeVideoId(validatedLesson.video_url)) {
              detectedType = 'youtube';
            } else if (getVimeoVideoId(validatedLesson.video_url)) {
              detectedType = 'vimeo';
            }
            
            // Se o tipo detectado for diferente do tipo armazenado, atualizar
            if (detectedType !== videoType) {
              console.log(`Tipo de vídeo corrigido de ${videoType} para ${detectedType} para a aula ${validatedLesson.id}`);
              videoType = detectedType;
            } else {
              // Se não for possível determinar o tipo, marcar como inválido
              return {
                ...validatedLesson,
                video_url: null,
                video_type: 'upload',
                is_invalid_media: true
              } as Lesson & { is_invalid_media?: boolean };
            }
          }
          
          // Atualizar o tipo de vídeo se necessário
          if (videoType !== validatedLesson.video_type) {
            validatedLesson = {
              ...validatedLesson,
              video_type: videoType
            };
          }
        }
        
        return validatedLesson;
      };
      
      // Ordenar módulos e aulas
      const sortedModules = (courseData.modules || [])
        .map(module => ({
          ...module,
          lessons: (module.lessons || [])
            .map(lesson => ({
              ...lesson,
              video_type: lesson.video_type as 'youtube' | 'vimeo' | 'upload'
            }))
            .sort((a, b) => a.order_index - b.order_index)
        }))
        .sort((a, b) => a.order_index - b.order_index);

      // Buscar progresso do usuário
      let completedLessonsSet = new Set<string>();
      
      if (user) {
        const { data: progressData, error: progressError } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('is_completed', true);

        if (!progressError && progressData) {
          completedLessonsSet = new Set(progressData.map(p => p.lesson_id));
        }
      }

      // Encontrar e validar a aula atual
      let currentLessonData: (Lesson & { is_invalid_media?: boolean }) | null = null;
      
      // Procurar a aula em todos os módulos ordenados
      for (const module of sortedModules) {
        const lesson = module.lessons?.find(l => l.id === lessonId);
        if (lesson) {
          // Validar a aula encontrada
          currentLessonData = getValidatedLesson(lesson);
          break;
        }
      }
      
      // Se não encontrou a aula, lançar erro
      if (!currentLessonData) {
        throw new Error('Aula não encontrada');
      }

      // Calcular progresso
      const allLessons = sortedModules.flatMap(m => m.lessons);
      const completedCount = allLessons.filter(l => completedLessonsSet.has(l.id)).length;
      const progressPercentage = Math.round((completedCount / allLessons.length) * 100) || 0;

      setCourse({
        ...courseData,
        modules: sortedModules,
        total_lessons: allLessons.length,
        completed_lessons: completedCount,
        progress_percentage: progressPercentage
      });
      
      setCurrentLesson(currentLessonData);
      setCompletedLessons(completedLessonsSet);
      
      // Verificar se há próxima aula
      if (completedLessonsSet.has(lessonId)) {
        const next = findNextLesson(allLessons, lessonId, completedLessonsSet);
        setNextLesson(next);
      }
      
    } catch (error) {
      console.error('Erro ao carregar curso:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a aula. Tente novamente.',
        variant: 'destructive',
      });
      navigate(`/courses/${courseId}`);
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId, user, navigate]);

  // Encontrar próxima aula disponível para o usuário
  const findNextLesson = useCallback((allLessons: Lesson[], currentLessonId: string, completedSet: Set<string>) => {
    if (!allLessons || allLessons.length === 0) return null;
    
    const currentIndex = allLessons.findIndex(l => l.id === currentLessonId);
    if (currentIndex === -1) return null;
    
    // Se for a última aula, não há próxima aula
    if (currentIndex >= allLessons.length - 1) return null;
    
    // Procurar a próxima aula que o usuário pode acessar
    for (let i = currentIndex + 1; i < allLessons.length; i++) {
      const lesson = allLessons[i];
      
      // Verificar se o usuário tem acesso à aula (é grátis ou está logado)
      const hasAccess = lesson.is_free || user;
      
      // Se o usuário tem acesso e a aula ainda não foi concluída, retornar
      if (hasAccess && !completedSet.has(lesson.id)) {
        return {
          id: lesson.id,
          title: lesson.title,
          isLocked: false
        };
      }
      
      // Se o usuário tem acesso mas já concluiu, continuar procurando
      // Se não tem acesso, pular para a próxima
    }
    
    // Se chegou até aqui, não há próxima aula disponível
    return null;
  }, [user]);

  // Buscar progresso das aulas
  const fetchLessonProgress = useCallback(async () => {
    if (!user || !course) return;
    
    try {
      const allLessonIds = course.modules.flatMap(m => m.lessons.map(l => l.id));
      
      const { data: progressData, error } = await supabase
        .from('lesson_progress')
        .select('lesson_id, is_completed')
        .eq('user_id', user.id)
        .in('lesson_id', allLessonIds);

      if (error) throw error;

      const completed = new Set(progressData
        .filter(p => p.is_completed)
        .map(p => p.lesson_id)
      );
      
      setCompletedLessons(completed);
    } catch (error) {
      console.error('Erro ao buscar progresso das aulas:', error);
    }
  }, [user, course]);

  // Atualizar o progresso do curso
  const fetchCourseProgress = useCallback(async () => {
    if (!user || !courseId) return;
    
    try {
      // Buscar todas as aulas do curso
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('module_id', courseId);
      
      if (lessonsError) throw lessonsError;
      
      const lessonIds = lessonsData.map(l => l.id);
      if (lessonIds.length === 0) return;
      
      // Buscar progresso das aulas
      const { data: progressData, error: progressError } = await supabase
        .from('lesson_progress')
        .select('lesson_id, is_completed')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds);
      
      if (progressError) throw progressError;
      
      // Calcular progresso
      const completedLessons = progressData.filter(p => p.is_completed);
      const progress = Math.round((completedLessons.length / lessonIds.length) * 100);
      
      // Atualizar estado do curso
      setCourse(prev => prev ? {
        ...prev,
        completed_lessons: completedLessons.length,
        total_lessons: lessonIds.length,
        progress_percentage: progress
      } : null);
      
      // Retornar o progresso calculado
      return {
        completed: completedLessons.length,
        total: lessonIds.length,
        progress
      };
      
    } catch (error) {
      console.error('Erro ao buscar progresso do curso:', error);
      return null;
    }
  }, [user, courseId]);

  // Carregar dados quando o curso ou aula mudar
  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  // Atualizar progresso quando o curso for carregado
  useEffect(() => {
    if (course) {
      fetchLessonProgress();
    }
  }, [course, fetchLessonProgress]);

  // Marcar aula como concluída
  const markLessonAsCompleted = async () => {
    if (!user || !lessonId || !courseId || !currentLesson) return;
    
    try {
      setIsCompleting(true);
      
      // Verificar se já está marcada como concluída
      if (completedLessons.has(lessonId)) {
        setIsCompleting(false);
        return;
      }

      // Atualizar no banco de dados
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          is_completed: true,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,lesson_id'
        });

      if (error) throw error;

      // Atualizar estado local
      setCompletedLessons(prev => new Set([...prev, lessonId]));
      
      // Atualizar contagem de aulas concluídas
      if (course) {
        const newCompletedCount = course.completed_lessons + 1;
        const newProgress = Math.round((newCompletedCount / course.total_lessons) * 100);
        
        setCourse(prev => prev ? {
          ...prev,
          completed_lessons: newCompletedCount,
          progress_percentage: newProgress
        } : null);
      }
      
      // Atualizar o progresso do curso
      await fetchCourseProgress();
      
      // Encontrar próxima aula
      if (course) {
        const allLessons = course.modules.flatMap(m => m.lessons);
        const next = findNextLesson(allLessons, lessonId, completedLessons);
        setNextLesson(next);
        setShowNextLessonModal(true);
      }
      
      // Mostrar notificação de sucesso
      toast({
        title: 'Aula concluída!',
        description: 'Você completou esta aula com sucesso!',
      });
      
    } catch (error) {
      console.error('Erro ao marcar aula como concluída:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar a aula como concluída. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Estado para controle de carregamento durante a navegação
  const [isNavigating, setIsNavigating] = useState(false);

  // Navegar para a aula anterior
  const goToPreviousLesson = useCallback(async () => {
    if (!course || !lessonId || isNavigating) return;
    
    try {
      setIsNavigating(true);
      const allLessons = course.modules.flatMap(m => m.lessons);
      const currentIndex = allLessons.findIndex(l => l.id === lessonId);
      
      if (currentIndex > 0) {
        const prevLesson = allLessons[currentIndex - 1];
        // Navegar para a aula anterior
        navigate(`/courses/${courseId}/lessons/${prevLesson.id}`, { state: { fromNavigation: true } });
      } else {
        // Se for a primeira aula, voltar para a página do curso
        navigate(`/courses/${courseId}`);
      }
    } catch (error) {
      console.error('Erro ao navegar para a aula anterior:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a aula anterior. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsNavigating(false);
    }
  }, [course, courseId, lessonId, navigate, isNavigating]);

  // Encontrar a próxima aula disponível
  const findNextAvailableLesson = useCallback((allLessons: Lesson[], currentLessonId: string) => {
    const currentIndex = allLessons.findIndex(l => l.id === currentLessonId);
    if (currentIndex === -1 || currentIndex === allLessons.length - 1) return null;
    
    // Encontrar próxima aula (não necessariamente a próxima na sequência)
    for (let i = currentIndex + 1; i < allLessons.length; i++) {
      // Verificar se o usuário tem acesso à aula (é grátis ou está logado)
      if (allLessons[i].is_free || user) {
        return allLessons[i];
      }
    }
    
    return null;
  }, [user]);

  // Navegar para a próxima aula disponível
  const goToNextAvailableLesson = useCallback(async () => {
    if (!course || !lessonId || isNavigating) return;
    
    try {
      setIsNavigating(true);
      const allLessons = course.modules.flatMap(m => m.lessons);
      const next = findNextAvailableLesson(allLessons, lessonId);
      
      if (next) {
        // Navegar para a próxima aula
        navigate(`/courses/${courseId}/lessons/${next.id}`, { state: { fromNavigation: true } });
      } else {
        // Se não houver próxima aula, mostrar mensagem
        toast({
          title: 'Parabéns!',
          description: 'Você chegou ao final do curso!',
        });
        // Opcional: Navegar para a página de conclusão do curso
        // navigate(`/courses/${courseId}/complete`);
      }
    } catch (error) {
      console.error('Erro ao navegar para a próxima aula:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a próxima aula. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsNavigating(false);
    }
  }, [course, courseId, findNextAvailableLesson, lessonId, navigate, isNavigating]);

  // Navegar para a próxima aula (usado no modal)
  const goToNextLesson = () => {
    if (!nextLesson) return;
    setShowNextLessonModal(false);
    goToNextAvailableLesson();
  };

  // Lidar com o término do vídeo
  const handleVideoComplete = useCallback(async () => {
    if (!lessonId) return;
    
    try {
      // Mostrar notificação de conclusão
      toast({
        title: 'Aula concluída!',
        description: 'Aguarde, preparando a próxima aula...',
        duration: 3000,
      });
      
      // Marcar a aula como concluída se ainda não estiver
      if (!completedLessons.has(lessonId)) {
        await markLessonAsCompleted();
      }
      
      // Navegar automaticamente para a próxima aula após um pequeno atraso
      if (nextLesson) {
        // Aguardar um pouco para o usuário ver a notificação
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Navegar para a próxima aula
        navigate(`/courses/${courseId}/lessons/${nextLesson.id}`, { 
          state: { 
            fromNavigation: true,
            autoPlay: true // Flag para tocar o próximo vídeo automaticamente
          } 
        });
      } else {
        // Se não houver próxima aula, mostrar mensagem de conclusão
        setTimeout(() => {
          toast({
            title: '🎉 Parabéns!',
            description: 'Você concluiu todas as aulas deste módulo!',
            duration: 5000,
          });
        }, 3000);
        
        // Opcional: Navegar para a página de conclusão do módulo
        // navigate(`/courses/${courseId}/complete`);
      }
    } catch (error) {
      console.error('Erro ao processar conclusão do vídeo:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao processar a conclusão da aula.',
        variant: 'destructive',
      });
    }
  }, [completedLessons, lessonId, markLessonAsCompleted, nextLesson, navigate, courseId]);

  // Verificar se a aula atual está concluída
  const isCurrentLessonCompleted = useMemo(() => {
    return lessonId ? completedLessons.has(lessonId) : false;
  }, [completedLessons, lessonId]);

  // Se estiver carregando, mostrar skeleton
  if (loading || !course || !currentLesson) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Conteúdo principal */}
          <div className="flex-1 space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="aspect-video w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:w-80 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Verificar se o usuário tem acesso à aula
  if (!currentLesson.is_free && !user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-muted/50 p-6 rounded-lg border">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Aula Bloqueada</h2>
            <p className="text-muted-foreground mb-6">
              Esta aula faz parte do conteúdo exclusivo para assinantes. Faça login ou inscreva-se para continuar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/login">Fazer Login</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/pricing">Ver Planos</Link>
              </Button>
            </div>
          </div>
          <Button variant="ghost" className="mt-8" asChild>
            <Link to={`/courses/${courseId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para o curso
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Barra de progresso */}
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4">
          <div className="py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                Progresso do Curso: {course.progress_percentage}%
              </span>
              <span className="text-xs text-muted-foreground">
                {course.completed_lessons} de {course.total_lessons} aulas
              </span>
            </div>
            <Progress value={course.progress_percentage} className="h-2" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Conteúdo principal */}
          <div className="flex-1">
            {/* Cabeçalho */}
            <div className="mb-6">
              <Button 
                variant="ghost" 
                className="pl-0 mb-4"
                onClick={() => navigate(`/courses/${courseId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para o curso
              </Button>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {currentLesson.title}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    {course.title} • {course.modules.find(m => m.id === currentLesson.module_id)?.title}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {isCurrentLessonCompleted ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Concluída
                    </Badge>
                  ) : (
                    <Button
                      onClick={markLessonAsCompleted}
                      disabled={isCompleting || isCurrentLessonCompleted}
                      size="sm"
                      className="gap-1.5"
                    >
                      {isCompleting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Marcar como concluída
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1.5" />
                  {currentLesson.duration_minutes} min de duração
                </div>
                
                {currentLesson.is_free ? (
                  <Badge variant="outline" className="text-xs">
                    Grátis
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Exclusivo
                  </Badge>
                )}
              </div>
            </div>
            
            
            {/* Player de vídeo moderno */}
            <div className="relative w-full mb-8">
              <SecureYouTubePlayer 
                videoUrl={currentLesson.video_url || ''}
                videoId={currentLesson.video_url ? getYouTubeVideoId(currentLesson.video_url) : ''}
                title={currentLesson.title}
                onComplete={handleVideoComplete}
                onProgress={(progress) => {
                  // Atualizar progresso da aula
                  if (progress > 10) { // Só começar a contar após 10% do vídeo
                    // Aqui você pode implementar lógica para salvar progresso
                  }
                }}
                showControls={true}
                autoplay={false}
              />
            </div>
            
            {/* Descrição da aula */}
            <div className="prose dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold mb-4">Sobre esta aula</h2>
              <p className="text-muted-foreground">
                {currentLesson.description || 'Nenhuma descrição fornecida para esta aula.'}
              </p>
            </div>
            
            {/* Navegação entre aulas */}
            <div className="mt-12 pt-6 border-t">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <Button 
                  variant="outline" 
                  onClick={goToPreviousLesson}
                  disabled={isNavigating || !course.modules.some(m => 
                    m.lessons.some((l, i) => i > 0 && l.id === lessonId)
                  )}
                  className="justify-start min-w-[150px]"
                >
                  {isNavigating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Aula Anterior
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={goToNextAvailableLesson}
                  disabled={isNavigating || !nextLesson}
                  className="justify-end min-w-[150px]"
                >
                  {isNavigating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      Próxima Aula
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
              
              {/* Indicador de progresso durante a navegação */}
              {isNavigating && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 inline-block mr-2 animate-spin" />
                  Carregando a próxima aula...
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:w-80 space-y-6">
            {/* Progresso do curso */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Seu Progresso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Aulas concluídas</span>
                    <span className="font-medium">
                      {course.completed_lessons} de {course.total_lessons}
                    </span>
                  </div>
                  <Progress value={course.progress_percentage} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso total</span>
                    <span className="font-medium">{course.progress_percentage}%</span>
                  </div>
                  
                  {course.progress_percentage === 100 && (
                    <Button className="w-full mt-4" variant="outline">
                      <Award className="h-4 w-4 mr-2" />
                      Emitir Certificado
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Lista de aulas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ListVideo className="h-4 w-4" />
                  Conteúdo do Curso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ModuleList
                  courseId={courseId!}
                  modules={course.modules}
                  currentLessonId={lessonId!}
                  onLessonSelect={(id) => navigate(`/courses/${courseId}/lessons/${id}`)}
                  completedLessons={completedLessons}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Modal de próxima aula */}
      {showNextLessonModal && nextLesson && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-xl p-6 max-w-md w-full shadow-xl border">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Aula Concluída!</h3>
              <p className="text-muted-foreground mb-6">
                Parabéns! Você concluiu esta aula. Próxima aula em {countdown}s
              </p>
              
              <div className="bg-muted/50 p-4 rounded-lg mb-6 text-left">
                <h4 className="font-medium mb-1">Próxima Aula</h4>
                <p className="text-sm text-muted-foreground">{nextLesson.title}</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowNextLessonModal(false)}
                >
                  Continuar nesta página
                </Button>
                <Button 
                  className="flex-1"
                  onClick={goToNextLesson}
                >
                  Ir para próxima aula
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonPage;
