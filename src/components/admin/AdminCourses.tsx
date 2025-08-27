import { useState } from 'react';
import { useCourses } from '@/hooks/useCourses';
import { useCourseLessons } from '@/hooks/useCourseLessons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Upload, ExternalLink, Video, Clock, Youtube } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

const AdminCourses = () => {
  const { courses, loading, refetch } = useCourses();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [managingCourse, setManagingCourse] = useState<any>(null);
  const [isLessonsOpen, setIsLessonsOpen] = useState(false);
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor_name: '',
    duration_hours: 0,
    difficulty_level: 'Iniciante',
    category: '',
    cover_image_url: ''
  });
  
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    is_free: false
  });

  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [fetchingYouTube, setFetchingYouTube] = useState(false);

  const {
    modules,
    lessons,
    loading: lessonsLoading,
    createModule,
    addLesson,
    fetchYouTubeInfo,
    updateCourseDuration,
    refetch: refetchLessons
  } = useCourseLessons(managingCourse?.id || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update(formData)
          .eq('id', editingCourse.id);
          
        if (error) throw error;
        
        toast({
          title: "Curso atualizado!",
          description: "As alterações foram salvas com sucesso."
        });
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([{ ...formData, is_published: true }]);
          
        if (error) throw error;
        
        toast({
          title: "Curso criado!",
          description: "O novo curso foi adicionado à plataforma."
        });
      }
      
      refetch();
      setIsCreateOpen(false);
      setEditingCourse(null);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleManageLessons = (course: any) => {
    setManagingCourse(course);
    setIsLessonsOpen(true);
  };

  const handleCreateModule = async () => {
    if (!newModuleTitle.trim()) return;
    
    try {
      await createModule(newModuleTitle);
      setNewModuleTitle('');
      toast({
        title: "Módulo criado!",
        description: "O novo módulo foi adicionado ao curso."
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId) return;

    try {
      setFetchingYouTube(true);
      
      // Extract video ID from YouTube URL
      const videoId = extractYouTubeVideoId(lessonFormData.youtubeUrl);
      if (!videoId) {
        throw new Error('URL do YouTube inválida');
      }

      // Fetch YouTube video info
      const youtubeInfo = await fetchYouTubeInfo(lessonFormData.youtubeUrl);
      
      // Add lesson with YouTube data
      await addLesson(selectedModuleId, {
        title: lessonFormData.title || youtubeInfo.title,
        description: lessonFormData.description,
        video_type: 'youtube',
        external_video_id: videoId,
        external_video_platform: 'youtube',
        duration_minutes: Math.ceil(youtubeInfo.duration / 60), // Convert seconds to minutes
        is_free: lessonFormData.is_free
      });

      // Update course total duration
      await updateCourseDuration();
      
      // Reset form
      setLessonFormData({
        title: '',
        description: '',
        youtubeUrl: '',
        is_free: false
      });
      setSelectedModuleId('');
      setIsAddLessonOpen(false);
      
      // Refresh course list to update duration
      refetch();
      
      toast({
        title: "Aula adicionada!",
        description: "A nova aula foi criada com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setFetchingYouTube(false);
    }
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const resetLessonForm = () => {
    setLessonFormData({
      title: '',
      description: '',
      youtubeUrl: '',
      is_free: false
    });
    setSelectedModuleId('');
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      instructor_name: '',
      duration_hours: 0,
      difficulty_level: 'Iniciante',
      category: '',
      cover_image_url: ''
    });
  };

  const handleEdit = (course: any) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      instructor_name: course.instructor_name || '',
      duration_hours: course.duration_hours,
      difficulty_level: course.difficulty_level,
      category: course.category || '',
      cover_image_url: course.cover_image_url || ''
    });
    setIsCreateOpen(true);
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Tem certeza que deseja excluir este curso?')) return;
    
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
        
      if (error) throw error;
      
      toast({
        title: "Curso excluído!",
        description: "O curso foi removido da plataforma."
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('course-covers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-covers')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, cover_image_url: publicUrl }));
      
      toast({
        title: "Imagem enviada!",
        description: "A capa do curso foi carregada com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gerenciar Cursos</h2>
          <p className="text-muted-foreground">Crie e gerencie os cursos da plataforma</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingCourse(null); }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Curso
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? 'Editar Curso' : 'Criar Novo Curso'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do curso abaixo
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="instructor">Instrutor</Label>
                  <Input
                    id="instructor"
                    value={formData.instructor_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, instructor_name: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (horas)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_hours: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Dificuldade</Label>
                  <Select 
                    value={formData.difficulty_level} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Iniciante">Iniciante</SelectItem>
                      <SelectItem value="Intermediário">Intermediário</SelectItem>
                      <SelectItem value="Avançado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cover">Imagem de Capa (Vertical - 708x1494px)</Label>
                <div className="flex gap-2">
                  <Input
                    id="cover"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                {formData.cover_image_url && (
                  <div>
                    <div className="w-24 aspect-[708/1494]">
                      <img 
                        src={formData.cover_image_url} 
                        alt="Preview" 
                        className="w-full h-full object-cover rounded border"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Imagem de Capa (Vertical - Resolução sugerida: 708 x 1494 pixels)
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCourse ? 'Salvar Alterações' : 'Criar Curso'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Lessons Management Dialog */}
        <Dialog open={isLessonsOpen} onOpenChange={setIsLessonsOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Gerenciar Aulas - {managingCourse?.title}
              </DialogTitle>
              <DialogDescription>
                Organize módulos e adicione aulas ao curso
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Create Module Section */}
              <div className="border rounded-lg p-4 bg-muted/20">
                <h3 className="font-semibold mb-3">Criar Novo Módulo</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do módulo (ex: Introdução, Conceitos Básicos...)"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleCreateModule} disabled={!newModuleTitle.trim()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Módulo
                  </Button>
                </div>
              </div>

              {/* Modules and Lessons */}
              {lessonsLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : modules.length === 0 ? (
                <div className="border rounded-lg p-8 bg-muted/50 text-center">
                  <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhum módulo criado ainda.
                    <br />
                    Crie o primeiro módulo para começar a adicionar aulas.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {modules.map((module) => {
                    const moduleLessons = lessons.filter(l => l.module_id === module.id);
                    const totalDuration = moduleLessons.reduce((total, lesson) => total + lesson.duration_minutes, 0);
                    
                    return (
                      <Card key={module.id} className="border-l-4 border-l-primary/50">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{module.title}</CardTitle>
                              <CardDescription className="flex items-center gap-4 mt-1">
                                <span>{moduleLessons.length} aula{moduleLessons.length !== 1 ? 's' : ''}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {Math.floor(totalDuration / 60)}h {totalDuration % 60}min
                                </span>
                              </CardDescription>
                            </div>
                            
                            <Dialog open={isAddLessonOpen} onOpenChange={setIsAddLessonOpen}>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedModuleId(module.id);
                                    resetLessonForm();
                                  }}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Nova Aula
                                </Button>
                              </DialogTrigger>
                              
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Youtube className="w-5 h-5 text-red-500" />
                                    Nova Aula - {module.title}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Adicione uma nova aula com vídeo do YouTube
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <form onSubmit={handleAddLesson} className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="youtubeUrl">URL do YouTube *</Label>
                                    <Input
                                      id="youtubeUrl"
                                      placeholder="https://www.youtube.com/watch?v=..."
                                      value={lessonFormData.youtubeUrl}
                                      onChange={(e) => setLessonFormData(prev => ({ 
                                        ...prev, 
                                        youtubeUrl: e.target.value 
                                      }))}
                                      required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Cole aqui o link do YouTube. O título e duração serão capturados automaticamente.
                                    </p>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="lessonTitle">Título da Aula (opcional)</Label>
                                    <Input
                                      id="lessonTitle"
                                      placeholder="Deixe vazio para usar o título do YouTube"
                                      value={lessonFormData.title}
                                      onChange={(e) => setLessonFormData(prev => ({ 
                                        ...prev, 
                                        title: e.target.value 
                                      }))}
                                    />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="lessonDescription">Descrição (opcional)</Label>
                                    <Textarea
                                      id="lessonDescription"
                                      placeholder="Descrição da aula..."
                                      rows={3}
                                      value={lessonFormData.description}
                                      onChange={(e) => setLessonFormData(prev => ({ 
                                        ...prev, 
                                        description: e.target.value 
                                      }))}
                                    />
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id="isFree"
                                      checked={lessonFormData.is_free}
                                      onCheckedChange={(checked) => setLessonFormData(prev => ({ 
                                        ...prev, 
                                        is_free: checked 
                                      }))}
                                    />
                                    <Label htmlFor="isFree">Aula gratuita</Label>
                                  </div>
                                  
                                  <div className="flex justify-end gap-2 pt-4">
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      onClick={() => setIsAddLessonOpen(false)}
                                    >
                                      Cancelar
                                    </Button>
                                    <Button type="submit" disabled={fetchingYouTube}>
                                      {fetchingYouTube ? (
                                        <>Buscando dados...</>
                                      ) : (
                                        <>
                                          <Plus className="w-4 h-4 mr-2" />
                                          Adicionar Aula
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </form>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardHeader>
                        
                        {moduleLessons.length > 0 && (
                          <CardContent>
                            <div className="space-y-2">
                              {moduleLessons.map((lesson, index) => (
                                <div key={lesson.id} className="flex items-center justify-between p-3 border rounded bg-background">
                                  <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-primary/10 text-primary text-xs font-semibold rounded-full flex items-center justify-center">
                                      {index + 1}
                                    </span>
                                    <div>
                                      <p className="font-medium text-sm">{lesson.title}</p>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Youtube className="w-3 h-3 text-red-500" />
                                        <span>{lesson.duration_minutes} min</span>
                                        {lesson.is_free && (
                                          <Badge variant="secondary" className="text-xs px-1 py-0">
                                            Gratuita
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <Button variant="ghost" size="sm">
                                    <ExternalLink className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses?.map((course) => (
          <Card key={course.id} className="bg-gradient-card border-border/50">
            <CardHeader>
              {course.cover_image_url && (
                <div className="aspect-[708/1494] w-full mb-2">
                  <img 
                    src={course.cover_image_url} 
                    alt={course.title}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              )}
              <CardTitle className="text-lg">{course.title}</CardTitle>
              <CardDescription>{course.description}</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Instrutor:</span>
                  <span>{course.instructor_name || 'Não definido'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duração:</span>
                  <span>{course.duration_hours}h</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dificuldade:</span>
                  <Badge variant="secondary">{course.difficulty_level}</Badge>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(course)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(course.id)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleManageLessons(course)}>
                  <Video className="w-4 h-4 mr-1" />
                  Aulas
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminCourses;