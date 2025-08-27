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
import { Plus, Video, Youtube, Upload, Clock, BookOpen, Edit, Trash2, Play, ChevronDown, ChevronRight, Save, X, Image, FolderOpen, Layers } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  course_id: string;
  cover_image_url: string | null;
  lesson_count?: number;
}

const LessonModuleManagement = () => {
  const { courses, loading: coursesLoading } = useCourses();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [fetchingYouTube, setFetchingYouTube] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    is_free: false
  });

  const [moduleFormData, setModuleFormData] = useState({
    title: '',
    description: ''
  });

  const [editLessonData, setEditLessonData] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    is_free: false
  });

  const [editModuleData, setEditModuleData] = useState({
    title: '',
    description: ''
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

  const handleAddModule = async () => {
    if (!selectedCourse || !moduleFormData.title.trim()) {
      toast({
        title: "Erro",
        description: "Selecione um curso e preencha o título do módulo.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: lastModule, error: orderError } = await supabase
        .from('modules')
        .select('order_index')
        .eq('course_id', selectedCourse.id)
        .order('order_index', { ascending: false })
        .limit(1);

      if (orderError) throw orderError;

      const nextOrderIndex = lastModule?.[0]?.order_index + 1 || 0;

      const { error } = await supabase
        .from('modules')
        .insert({
          title: moduleFormData.title.trim(),
          description: moduleFormData.description.trim() || null,
          course_id: selectedCourse.id,
          order_index: nextOrderIndex
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Módulo adicionado com sucesso."
      });

      setModuleFormData({ title: '', description: '' });
      setIsAddModuleOpen(false);
      refetchLessons();
    } catch (error: any) {
      console.error('Error adding module:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar módulo.",
        variant: "destructive"
      });
    }
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

  const handleEditModule = async (moduleId: string) => {
    if (!editModuleData.title.trim()) {
      toast({
        title: "Erro",
        description: "O título do módulo é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('modules')
        .update({
          title: editModuleData.title.trim(),
          description: editModuleData.description.trim() || null
        })
        .eq('id', moduleId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Módulo atualizado com sucesso."
      });

      setEditingModule(null);
      refetchLessons();
    } catch (error: any) {
      console.error('Error updating module:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar módulo.",
        variant: "destructive"
      });
    }
  };

  const handleEditLesson = async (lessonId: string) => {
    if (!editLessonData.title.trim()) {
      toast({
        title: "Erro",
        description: "O título da aula é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      let updateData: any = {
        title: editLessonData.title.trim(),
        description: editLessonData.description.trim() || null,
        is_free: editLessonData.is_free
      };

      if (editLessonData.youtubeUrl.trim()) {
        try {
          const videoInfo = await fetchYouTubeInfo(editLessonData.youtubeUrl);
          if (videoInfo) {
            updateData = {
              ...updateData,
              video_type: 'youtube',
              external_video_id: videoInfo.id,
              external_video_platform: 'youtube',
              duration_minutes: Math.ceil(videoInfo.duration / 60)
            };
          }
        } catch (error) {
          console.error('Error fetching YouTube info:', error);
        }
      }

      const { error } = await supabase
        .from('lessons')
        .update(updateData)
        .eq('id', lessonId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Aula atualizada com sucesso."
      });

      setEditingLesson(null);
      refetchLessons();
    } catch (error: any) {
      console.error('Error updating lesson:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar aula.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteModule = async (moduleId: string, moduleTitle: string) => {
    if (!confirm(`Tem certeza que deseja excluir o módulo "${moduleTitle}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { data: lessons, error: checkError } = await supabase
        .from('lessons')
        .select('id')
        .eq('module_id', moduleId)
        .limit(1);

      if (checkError) throw checkError;

      if (lessons && lessons.length > 0) {
        toast({
          title: "Erro",
          description: "Não é possível excluir um módulo que contém aulas. Exclua as aulas primeiro.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Módulo excluído com sucesso."
      });

      refetchLessons();
    } catch (error: any) {
      console.error('Error deleting module:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir módulo.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
    if (!confirm(`Tem certeza que deseja excluir a aula "${lessonTitle}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Aula excluída com sucesso."
      });

      refetchLessons();
    } catch (error: any) {
      console.error('Error deleting lesson:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir aula.",
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

  const startEditingLesson = (lesson: any) => {
    setEditingLesson(lesson.id);
    setEditLessonData({
      title: lesson.title,
      description: lesson.description || '',
      youtubeUrl: lesson.external_video_platform === 'youtube' 
        ? `https://youtube.com/watch?v=${lesson.external_video_id}` 
        : '',
      is_free: lesson.is_free
    });
  };

  const startEditingModule = (module: Module) => {
    setEditingModule(module.id);
    setEditModuleData({
      title: module.title,
      description: module.description || ''
    });
  };

  const handleImageUpload = async (lessonId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem válido.",
        variant: "destructive"
      });
      return;
    }

    setUploadingImage(lessonId);
    try {
      const fileName = `lesson-covers/${lessonId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('course-covers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('course-covers')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('lessons')
        .update({ video_url: data.publicUrl })
        .eq('id', lessonId);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso!",
        description: "Imagem da aula atualizada com sucesso."
      });

      refetchLessons();
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload da imagem.",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(null);
    }
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
          <h2 className="text-2xl font-bold">Gerenciar Aulas e Módulos</h2>
          <p className="text-muted-foreground">Organize módulos e aulas dos seus cursos</p>
        </div>
      </div>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Curso</CardTitle>
          <CardDescription>Escolha um curso para gerenciar módulos e aulas</CardDescription>
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
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Dialog open={isAddModuleOpen} onOpenChange={setIsAddModuleOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Layers className="w-4 h-4 mr-2" />
                  Novo Módulo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Módulo</DialogTitle>
                  <DialogDescription>
                    Crie um novo módulo para organizar as aulas do curso
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="module-title">Título do Módulo *</Label>
                    <Input
                      id="module-title"
                      value={moduleFormData.title}
                      onChange={(e) => setModuleFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Introdução e Fundamentos"
                    />
                  </div>

                  <div>
                    <Label htmlFor="module-description">Descrição (opcional)</Label>
                    <Textarea
                      id="module-description"
                      value={moduleFormData.description}
                      onChange={(e) => setModuleFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva o conteúdo deste módulo..."
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleAddModule}
                      disabled={!moduleFormData.title.trim()}
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Módulo
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddModuleOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddLessonOpen} onOpenChange={setIsAddLessonOpen}>
              <DialogTrigger asChild>
                <Button disabled={modules.length === 0} variant="outline">
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
                                    {editingModule === module.id ? (
                                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                        <Input
                                          value={editModuleData.title}
                                          onChange={(e) => setEditModuleData(prev => ({ ...prev, title: e.target.value }))}
                                          placeholder="Título do módulo"
                                          className="text-lg font-semibold"
                                        />
                                        <Textarea
                                          value={editModuleData.description}
                                          onChange={(e) => setEditModuleData(prev => ({ ...prev, description: e.target.value }))}
                                          placeholder="Descrição do módulo (opcional)"
                                          className="min-h-[60px]"
                                        />
                                        <div className="flex gap-2">
                                          <Button 
                                            size="sm" 
                                            onClick={() => handleEditModule(module.id)}
                                            disabled={!editModuleData.title.trim()}
                                          >
                                            <Save className="w-4 h-4 mr-1" />
                                            Salvar
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => setEditingModule(null)}
                                          >
                                            <X className="w-4 h-4 mr-1" />
                                            Cancelar
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <CardTitle className="text-lg">{module.title}</CardTitle>
                                        <CardDescription>
                                          {moduleLessons.length} aula{moduleLessons.length !== 1 ? 's' : ''}
                                          {module.description && ` • ${module.description}`}
                                        </CardDescription>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">
                                    Módulo {module.order_index + 1}
                                  </Badge>
                                  {editingModule !== module.id && (
                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => startEditingModule(module)}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteModule(module.id, module.title)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
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
                                        className="border rounded-lg bg-card"
                                      >
                                        {editingLesson === lesson.id ? (
                                          <div className="p-4 space-y-3">
                                            <Input
                                              value={editLessonData.title}
                                              onChange={(e) => setEditLessonData(prev => ({ ...prev, title: e.target.value }))}
                                              placeholder="Título da aula"
                                            />
                                            <Input
                                              value={editLessonData.youtubeUrl}
                                              onChange={(e) => setEditLessonData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                                              placeholder="URL do YouTube (opcional)"
                                            />
                                            <Textarea
                                              value={editLessonData.description}
                                              onChange={(e) => setEditLessonData(prev => ({ ...prev, description: e.target.value }))}
                                              placeholder="Descrição da aula (opcional)"
                                              className="min-h-[60px]"
                                            />
                                            <div className="flex items-center space-x-2">
                                              <Switch
                                                checked={editLessonData.is_free}
                                                onCheckedChange={(checked) => setEditLessonData(prev => ({ ...prev, is_free: checked }))}
                                              />
                                              <Label>Aula gratuita</Label>
                                            </div>
                                            <div className="flex gap-2">
                                              <Button 
                                                size="sm" 
                                                onClick={() => handleEditLesson(lesson.id)}
                                                disabled={!editLessonData.title.trim()}
                                              >
                                                <Save className="w-4 h-4 mr-1" />
                                                Salvar
                                              </Button>
                                              <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => setEditingLesson(null)}
                                              >
                                                <X className="w-4 h-4 mr-1" />
                                                Cancelar
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between p-4">
                                            <div className="flex items-center gap-3 flex-1">
                                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                                {index + 1}
                                              </div>
                                              <div className="flex-1">
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
                                              <div className="relative">
                                                <div className="w-16 h-9 bg-muted rounded overflow-hidden">
                                                  {lesson.video_url ? (
                                                    <img
                                                      src={lesson.video_url}
                                                      alt={lesson.title}
                                                      className="w-full h-full object-cover"
                                                    />
                                                  ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                      <Image className="w-4 h-4 text-muted-foreground/50" />
                                                    </div>
                                                  )}
                                                </div>
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  className="hidden"
                                                  id={`lesson-image-${lesson.id}`}
                                                  onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                      handleImageUpload(lesson.id, file);
                                                    }
                                                  }}
                                                />
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="absolute -top-1 -right-1 h-5 w-5 p-0"
                                                  onClick={() => document.getElementById(`lesson-image-${lesson.id}`)?.click()}
                                                  disabled={uploadingImage === lesson.id}
                                                >
                                                  {uploadingImage === lesson.id ? (
                                                    <div className="animate-spin rounded-full h-3 w-3 border border-primary border-t-transparent" />
                                                  ) : (
                                                    <Upload className="w-3 h-3" />
                                                  )}
                                                </Button>
                                              </div>
                                              
                                              <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => startEditingLesson(lesson)}
                                              >
                                                <Edit className="w-4 h-4" />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        )}
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

export default LessonModuleManagement;