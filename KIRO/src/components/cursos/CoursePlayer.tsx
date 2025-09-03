import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/auth/authContext';
import { useCourseAccess } from '@/hooks/useCourseAccess';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, SkipBack, SkipForward, CheckCircle, Lock, Clock, BookOpen } from 'lucide-react';

interface CoursePlayerProps {
  courseId: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  video_type: string;
  external_video_id: string;
  external_video_platform: string;
  duration_minutes: number;
  order_index: number;
  is_free: boolean;
  module_id: string;
  module: {
    id: string;
    title: string;
    order_index: number;
  };
}

interface LessonProgress {
  lesson_id: string;
  is_completed: boolean;
  watch_time_seconds: number;
  completed_at: string | null;
}

const CoursePlayer: React.FC<CoursePlayerProps> = ({ courseId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { courseAccess, courseProgress } = useCourseAccess(courseId);
  
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Buscar estrutura do curso (módulos e aulas)
  const { data: courseStructure, isLoading } = useQuery({
    queryKey: ['course-structure', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          course_modules (
            id,
            title,
            order_index,
            course_lessons (
              id,
              title,
              description,
              video_url,
              video_type,
              external_video_id,
              external_video_platform,
              duration_minutes,
              order_index,
              is_free
            )
          )
        `)
        .eq('id', courseId)
        .single();

      if (error) throw error;

      // Organizar aulas por módulo e ordem
      const modules = data.course_modules
        .sort((a, b) => a.order_index - b.order_index)
        .map(module => ({
          ...module,
          course_lessons: module.course_lessons.sort((a, b) => a.order_index - b.order_index)
        }));

      return {
        ...data,
        modules,
        allLessons: modules.flatMap(module => 
          module.course_lessons.map(lesson => ({
            ...lesson,
            module: {
              id: module.id,
              title: module.title,
              order_index: module.order_index
            }
          }))
        )
      };
    },
    enabled: !!courseId,
  });

  // Buscar progresso detalhado das aulas
  const { data: lessonsProgress } = useQuery({
    queryKey: ['lessons-progress', user?.id, courseId],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('lesson_id', courseStructure?.allLessons.map(l => l.id) || []);

      if (error) throw error;
      return data as LessonProgress[];
    },
    enabled: !!user?.id && !!courseStructure?.allLessons,
  });

  // Mutação para atualizar progresso da aula
  const updateProgress = useMutation({
    mutationFn: async ({ lessonId, watchTime, isCompleted }: {
      lessonId: string;
      watchTime: number;
      isCompleted: boolean;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          watch_time_seconds: watchTime,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-progress', user?.id, courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-progress', user?.id, courseId] });
    },
  });

  // Selecionar primeira aula automaticamente
  useEffect(() => {
    if (courseStructure?.allLessons && !currentLessonId) {
      const firstLesson = courseStructure.allLessons[0];
      if (firstLesson) {
        setCurrentLessonId(firstLesson.id);
      }
    }
  }, [courseStructure, currentLessonId]);

  // Atualizar progresso periodicamente durante reprodução
  useEffect(() => {
    if (isPlaying && currentLessonId && currentTime > 0) {
      const interval = setInterval(() => {
        const watchTime = Math.floor(currentTime);
        const isCompleted = duration > 0 && (currentTime / duration) >= 0.9; // 90% assistido = completo

        updateProgress.mutate({
          lessonId: currentLessonId,
          watchTime,
          isCompleted,
        });
      }, 10000); // Atualizar a cada 10 segundos

      return () => clearInterval(interval);
    }
  }, [isPlaying, currentLessonId, currentTime, duration, updateProgress]);

  if (!courseAccess?.hasAccess) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Lock className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Acesso Restrito</h3>
          <p className="text-gray-600 text-center mb-4">
            Você precisa adquirir este curso para acessar o conteúdo.
          </p>
          <Button onClick={() => window.history.back()}>
            Voltar aos Cursos
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="bg-gray-200 h-64 rounded-lg"></div>
              <div className="bg-gray-200 h-4 rounded w-3/4"></div>
              <div className="bg-gray-200 h-4 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentLesson = courseStructure?.allLessons.find(l => l.id === currentLessonId);
  const currentLessonProgress = lessonsProgress?.find(p => p.lesson_id === currentLessonId);
  
  const completedLessons = lessonsProgress?.filter(p => p.is_completed).length || 0;
  const totalLessons = courseStructure?.allLessons.length || 0;
  const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  const handleLessonSelect = (lessonId: string) => {
    setCurrentLessonId(lessonId);
    setIsPlaying(false);
  };

  const handleNextLesson = () => {
    if (!courseStructure?.allLessons || !currentLessonId) return;
    
    const currentIndex = courseStructure.allLessons.findIndex(l => l.id === currentLessonId);
    const nextLesson = courseStructure.allLessons[currentIndex + 1];
    
    if (nextLesson) {
      setCurrentLessonId(nextLesson.id);
    }
  };

  const handlePreviousLesson = () => {
    if (!courseStructure?.allLessons || !currentLessonId) return;
    
    const currentIndex = courseStructure.allLessons.findIndex(l => l.id === currentLessonId);
    const previousLesson = courseStructure.allLessons[currentIndex - 1];
    
    if (previousLesson) {
      setCurrentLessonId(previousLesson.id);
    }
  };

  const renderVideoPlayer = () => {
    if (!currentLesson) return null;

    // Para vídeos do YouTube
    if (currentLesson.video_type === 'youtube' && currentLesson.external_video_id) {
      return (
        <div className="relative w-full h-0 pb-[56.25%]"> {/* 16:9 aspect ratio */}
          <iframe
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            src={`https://www.youtube.com/embed/${currentLesson.external_video_id}?enablejsapi=1`}
            title={currentLesson.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    // Para vídeos do Vimeo
    if (currentLesson.video_type === 'vimeo' && currentLesson.external_video_id) {
      return (
        <div className="relative w-full h-0 pb-[56.25%]">
          <iframe
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            src={`https://player.vimeo.com/video/${currentLesson.external_video_id}`}
            title={currentLesson.title}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    // Para vídeos hospedados (upload direto)
    if (currentLesson.video_url) {
      return (
        <video
          className="w-full rounded-lg"
          controls
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          <source src={currentLesson.video_url} type="video/mp4" />
          Seu navegador não suporta o elemento de vídeo.
        </video>
      );
    }

    return (
      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Vídeo não disponível</p>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player de Vídeo - Coluna Principal */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{currentLesson?.title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentLesson?.module.title} • {currentLesson?.duration_minutes} min
                  </p>
                </div>
                {currentLessonProgress?.is_completed && (
                  <Badge className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Concluída
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {renderVideoPlayer()}
              
              {/* Controles do Player */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePreviousLesson}
                    disabled={!courseStructure?.allLessons || courseStructure.allLessons[0]?.id === currentLessonId}
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleNextLesson}
                    disabled={!courseStructure?.allLessons || courseStructure.allLessons[courseStructure.allLessons.length - 1]?.id === currentLessonId}
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="text-sm text-gray-600">
                  {currentLessonProgress?.watch_time_seconds ? 
                    `${Math.floor(currentLessonProgress.watch_time_seconds / 60)}min assistidos` : 
                    'Não iniciado'
                  }
                </div>
              </div>
              
              {/* Descrição da Aula */}
              {currentLesson?.description && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Sobre esta aula</h4>
                  <p className="text-sm text-gray-700">{currentLesson.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lista de Aulas - Sidebar */}
        <div className="space-y-4">
          {/* Progresso Geral */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progresso do Curso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Concluído</span>
                  <span>{completedLessons}/{totalLessons} aulas</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
                <p className="text-xs text-gray-600">
                  {Math.round(overallProgress)}% do curso concluído
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Módulos e Aulas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conteúdo do Curso</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {courseStructure?.modules.map((module) => (
                  <div key={module.id} className="border-b border-gray-100 last:border-b-0">
                    <div className="p-4 bg-gray-50">
                      <h4 className="font-semibold text-sm">{module.title}</h4>
                    </div>
                    <div className="space-y-1">
                      {module.course_lessons.map((lesson) => {
                        const lessonProgress = lessonsProgress?.find(p => p.lesson_id === lesson.id);
                        const isCurrentLesson = lesson.id === currentLessonId;
                        
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => handleLessonSelect(lesson.id)}
                            className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                              isCurrentLesson ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {lessonProgress?.is_completed ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                )}
                                <div>
                                  <p className="text-sm font-medium">{lesson.title}</p>
                                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{lesson.duration_minutes} min</span>
                                    {lesson.is_free && (
                                      <Badge variant="outline" className="text-xs">
                                        Grátis
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {isCurrentLesson && (
                                <Play className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CoursePlayer;