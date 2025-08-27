import { useState, useEffect } from 'react';
import { useCourseLessons, Lesson } from '@/hooks/useCourseLessons';
import { useCourses } from '@/hooks/useCourses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Video, Youtube, Upload, Clock, BookOpen, Edit, Trash2, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const LessonManagement = () => {
  const { courses, loading: coursesLoading } = useCourses();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [fetchingYouTube, setFetchingYouTube] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    is_free: false
  });

  const {
    modules,
    lessons,
    loading: lessonsLoading,
    addLesson,
    fetchYouTubeInfo,
    refetch: refetchLessons
  } = useCourseLessons(selectedCourse?.id || '');

  const handleCourseSelect = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    setSelectedCourse(course);
    setSelectedModuleId('');
  };

  const handleAddLesson = async () => {
    if (!selectedModuleId || !lessonFormData.title) {
      toast({
        title: "Erro",
        description: "Selecione um módulo e preencha o título da aula.",
        variant: "destructive"
      });
      return;
    }

    try {
      let lessonData: {
        title: string;
        description: string;
        is_free: boolean;
        video_type: 'upload' | 'youtube' | 'vimeo';
        external_video_id: string | null;
        external_video_platform: string | null;
        duration_minutes: number;
      } = {
        title: lessonFormData.title,
        description: lessonFormData.description,
        is_free: lessonFormData.is_free,
        video_type: 'upload',
        external_video_id: null,
        external_video_platform: null,
        duration_minutes: 0
      };

      // If YouTube URL is provided, fetch video info
      if (lessonFormData.youtubeUrl.trim()) {
        setFetchingYouTube(true);
        try {
          const videoInfo = await fetchYouTubeInfo(lessonFormData.youtubeUrl);
          if (videoInfo) {
              lessonData = {
                ...lessonData,
                video_type: 'youtube',
                external_video_id: videoInfo.id,
                external_video_platform: 'youtube',
                duration_minutes: Math.ceil(videoInfo.duration / 60),
                description: lessonData.description || videoInfo.description
              };
          }
        } catch (error) {
          console.error('Error fetching YouTube info:', error);
          toast({
            title: "Aviso",
            description: "Não foi possível buscar informações do YouTube, mas a aula será criada.",
            variant: "default"
          });
        } finally {
          setFetchingYouTube(false);
        }
      }

      const success = await addLesson(selectedModuleId, lessonData);
      
      if (success) {
        toast({
          title: "Sucesso!",
          description: "Aula adicionada com sucesso."
        });
        
        setLessonFormData({
          title: '',
          description: '',
          youtubeUrl: '',
          is_free: false
        });
        setIsAddLessonOpen(false);
      }
    } catch (error) {
      console.error('Error adding lesson:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar aula. Tente novamente.",
        variant: "destructive"
      });
    }
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

  if (coursesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando cursos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Aulas</h2>
          <p className="text-muted-foreground">Adicione e organize aulas dos seus cursos</p>
        </div>
      </div>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Curso</CardTitle>
          <CardDescription>Escolha um curso para gerenciar suas aulas</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourse?.id || ''} onValueChange={handleCourseSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um curso..." />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourse && (
        <>
          {/* Add Lesson Button */}
          <div className="flex justify-end">
            <Dialog open={isAddLessonOpen} onOpenChange={setIsAddLessonOpen}>
              <DialogTrigger asChild>
                <Button disabled={modules.length === 0}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Aula
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Aula</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova aula ao curso selecionado
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="module">Módulo *</Label>
                    <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um módulo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {modules.map((module: any) => (
                          <SelectItem key={module.id} value={module.id}>
                            {module.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="title">Título da Aula *</Label>
                    <Input
                      id="title"
                      value={lessonFormData.title}
                      onChange={(e) => setLessonFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Digite o título da aula..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="youtubeUrl">URL do YouTube (opcional)</Label>
                    <Input
                      id="youtubeUrl"
                      value={lessonFormData.youtubeUrl}
                      onChange={(e) => setLessonFormData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Cole aqui o link do YouTube. O título e duração serão capturados automaticamente.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <Textarea
                      id="description"
                      value={lessonFormData.description}
                      onChange={(e) => setLessonFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva o conteúdo da aula..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_free"
                      checked={lessonFormData.is_free}
                      onCheckedChange={(checked) => setLessonFormData(prev => ({ ...prev, is_free: checked }))}
                    />
                    <Label htmlFor="is_free">Aula gratuita</Label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleAddLesson}
                      disabled={fetchingYouTube || !lessonFormData.title || !selectedModuleId}
                      className="flex-1"
                    >
                      {fetchingYouTube ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Aula
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddLessonOpen(false)}
                      disabled={fetchingYouTube}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Course Modules and Lessons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {selectedCourse.title}
              </CardTitle>
              <CardDescription>Módulos e aulas do curso</CardDescription>
            </CardHeader>
            <CardContent>
              {lessonsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : modules.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum módulo encontrado.</p>
                  <p className="text-sm">Adicione módulos primeiro para poder criar aulas.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {modules.map((module: any) => {
                    const moduleLessons = lessons.filter((lesson: any) => lesson.module_id === module.id);
                    const isExpanded = expandedModules.has(module.id);
                    
                    return (
                      <Collapsible key={module.id} open={isExpanded} onOpenChange={() => toggleModule(module.id)}>
                        <Card className="border-l-4 border-l-primary">
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                  <div>
                                    <CardTitle className="text-lg">{module.title}</CardTitle>
                                    <CardDescription>
                                      {moduleLessons.length} aula{moduleLessons.length !== 1 ? 's' : ''}
                                    </CardDescription>
                                  </div>
                                </div>
                                <Badge variant="secondary">
                                  Módulo {module.order_index + 1}
                                </Badge>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              {moduleLessons.length === 0 ? (
                                <div className="text-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                                  <Play className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                                  <p className="text-muted-foreground">Nenhuma aula neste módulo</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {moduleLessons
                                    .sort((a: any, b: any) => a.order_index - b.order_index)
                                    .map((lesson: any, index: number) => (
                                      <div
                                        key={lesson.id}
                                        className="flex items-center justify-between p-4 border rounded-lg bg-card"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                            {index + 1}
                                          </div>
                                          <div>
                                            <h4 className="font-medium">{lesson.title}</h4>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                              {lesson.video_type === 'youtube' && (
                                                <div className="flex items-center gap-1">
                                                  <Youtube className="w-4 h-4" />
                                                  <span>YouTube</span>
                                                </div>
                                              )}
                                              {lesson.duration_minutes > 0 && (
                                                <div className="flex items-center gap-1">
                                                  <Clock className="w-4 h-4" />
                                                  <span>{lesson.duration_minutes}min</span>
                                                </div>
                                              )}
                                              {lesson.is_free && (
                                                <Badge variant="secondary" className="text-xs">
                                                  Gratuita
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          <Button variant="ghost" size="sm">
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="text-destructive">
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))
                                  }
                                </div>
                              )}
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default LessonManagement;