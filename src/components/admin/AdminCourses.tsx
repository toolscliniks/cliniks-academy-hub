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

    category: '',
    cover_image_url: '',
    trailer_video_url: '',
    commercial_video_url: '',
    price: '',
    currency: 'BRL'
  });
  
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    is_free: false
  });

  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleCover, setNewModuleCover] = useState<File | null>(null);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [isEditModuleOpen, setIsEditModuleOpen] = useState(false);
  const [fetchingYouTube, setFetchingYouTube] = useState(false);

  const {
    modules,
    lessons,
    loading: lessonsLoading,
    createModule,
    addLesson,
    fetchYouTubeInfo,
    updateCourseDuration,
    updateModule,
    deleteModule,
    refetch: refetchLessons
  } = useCourseLessons(managingCourse?.id || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submitData = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null
      };
      
      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update(submitData)
          .eq('id', editingCourse.id);
          
        if (error) throw error;
        
        toast({
          title: "Curso atualizado!",
          description: "As alterações foram salvas com sucesso."
        });
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([{ ...submitData, is_published: true }]);
          
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
    if (!newModuleTitle.trim() || !managingCourse?.id) return;
    
    try {
      await createModule(newModuleTitle, '', newModuleCover || undefined);
      setNewModuleTitle('');
      setNewModuleCover(null);
      toast({
        title: "Módulo criado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao criar módulo:', error);
      toast({
        title: "Erro ao criar módulo",
        variant: "destructive",
      });
    }
  };

  const handleEditModule = async () => {
    if (!editingModule || !newModuleTitle.trim()) return;
    
    try {
      await updateModule(editingModule.id, newModuleTitle, '', newModuleCover || undefined);
      setNewModuleTitle('');
      setNewModuleCover(null);
      setEditingModule(null);
      setIsEditModuleOpen(false);
      toast({
        title: "Módulo atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao atualizar módulo:', error);
      toast({
        title: "Erro ao atualizar módulo",
        variant: "destructive",
      });
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    await deleteModule(moduleId);
  };

  const openEditModule = (module: any) => {
    setEditingModule(module);
    setNewModuleTitle(module.title);
    setNewModuleCover(null);
    setIsEditModuleOpen(true);
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedModuleId) {
      console.log('No selectedModuleId');
      return;
    }

    if (!managingCourse?.id) {
      console.log('No managingCourse.id');
      toast({
        title: "Erro",
        description: "Curso não selecionado para gerenciar aulas",
        variant: "destructive"
      });
      return;
    }

    try {
      setFetchingYouTube(true);
      
      // Extract video ID from YouTube URL
      const videoId = extractYouTubeVideoId(lessonFormData.youtubeUrl);
      if (!videoId) {
        throw new Error('URL do YouTube inválida');
      }

      let title = lessonFormData.title;
      let duration = 10; // Default 10 minutes

      try {
        // Try to fetch YouTube video info
        const youtubeInfo = await fetchYouTubeInfo(lessonFormData.youtubeUrl);
        title = lessonFormData.title || youtubeInfo.title;
        duration = Math.ceil(youtubeInfo.duration / 60); // Convert seconds to minutes
      } catch (youtubeError) {
        console.warn('Failed to fetch YouTube info, using defaults:', youtubeError);
        // If YouTube API fails, use manual input or defaults
        if (!title) {
          title = `Aula ${lessons.filter(l => l.module_id === selectedModuleId).length + 1}`;
        }
      }

      // Add lesson with YouTube data
      await addLesson(selectedModuleId, {
        title,
        description: lessonFormData.description,
        video_type: 'youtube',
        external_video_id: videoId,
        external_video_platform: 'youtube',
        duration_minutes: duration,
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
      category: '',
      cover_image_url: '',
      trailer_video_url: '',
      commercial_video_url: '',
      price: '',
      currency: 'BRL'
    });
  };

  const handleEdit = (course: any) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      instructor_name: course.instructor_name || '',
      category: course.category || '',
      cover_image_url: course.cover_image_url || '',
      trailer_video_url: course.trailer_video_url || '',
      commercial_video_url: course.commercial_video_url || '',
      price: course.price ? course.price.toString() : '',
      currency: course.currency || 'BRL'
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

  const handleToggleFeatured = async (courseId: string, featured: boolean) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_featured: featured })
        .eq('id', courseId);
        
      if (error) throw error;
      
      toast({
        title: featured ? "Curso adicionado aos destaques!" : "Curso removido dos destaques!",
        description: featured ? "O curso agora aparecerá na página inicial." : "O curso não aparecerá mais na página inicial."
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
              
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trailer_video">Vídeo Trailer (YouTube)</Label>
                <Input
                  id="trailer_video"
                  value={formData.trailer_video_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, trailer_video_url: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-xs text-muted-foreground">
                  URL do YouTube para vídeo de propaganda que ficará rodando em loop na página do curso (estilo Netflix)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="commercial_video">Vídeo Comercial</Label>
                <Input
                  id="commercial_video"
                  value={formData.commercial_video_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, commercial_video_url: e.target.value }))}
                  placeholder="https://exemplo.com/video-comercial.mp4"
                />
                <p className="text-xs text-muted-foreground">
                  Este vídeo será exibido automaticamente quando o usuário passar o mouse sobre o card do curso.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="299.00"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para venda apenas via planos
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">Moeda</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real (BRL)</SelectItem>
                      <SelectItem value="USD">Dólar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewModuleCover(e.target.files?.[0] || null)}
                    className="flex-shrink-0 w-48"
                  />
                  <Button onClick={handleCreateModule} disabled={!newModuleTitle.trim()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Módulo
                  </Button>
                </div>
              </div>

              {/* Edit Module Dialog */}
              <Dialog open={isEditModuleOpen} onOpenChange={setIsEditModuleOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Módulo</DialogTitle>
                    <DialogDescription>
                      Atualize as informações do módulo
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="editModuleTitle">Título do Módulo</Label>
                      <Input
                        id="editModuleTitle"
                        value={newModuleTitle}
                        onChange={(e) => setNewModuleTitle(e.target.value)}
                        placeholder="Nome do módulo"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="editModuleCover">Nova Capa (opcional)</Label>
                      <Input
                        id="editModuleCover"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewModuleCover(e.target.files?.[0] || null)}
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsEditModuleOpen(false);
                          setEditingModule(null);
                          setNewModuleTitle('');
                          setNewModuleCover(null);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleEditModule} disabled={!newModuleTitle.trim()}>
                        Salvar Alterações
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

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
                            <div className="flex items-center space-x-4">
                              {module.cover_image_url && (
                                <img 
                                  src={module.cover_image_url} 
                                  alt={module.title}
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                              )}
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
                            </div>

                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModule(module)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteModule(module.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedModuleId(module.id);
                                  resetLessonForm();
                                  setIsAddLessonOpen(true);
                                }}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Nova Aula
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        {moduleLessons.length > 0 && (
                          <CardContent>
                            <div className="space-y-2">
                              {moduleLessons.map((lesson, index) => (
                                <div key={lesson.id} className="flex items-center justify-between p-3 border rounded bg-background">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-8 rounded overflow-hidden bg-muted/20 flex-shrink-0">
                                      {lesson.video_type === 'youtube' && lesson.external_video_id ? (
                                        <img
                                          src={`https://img.youtube.com/vi/${lesson.external_video_id}/mqdefault.jpg`}
                                          alt={lesson.title}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                          <Video className="w-3 h-3 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
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

        {/* Add Lesson Dialog */}
        <Dialog open={isAddLessonOpen} onOpenChange={setIsAddLessonOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500" />
                Nova Aula
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
                  <span className="text-muted-foreground">Em Destaque:</span>
                  <Switch
                    checked={course.is_featured || false}
                    onCheckedChange={(checked) => handleToggleFeatured(course.id, checked)}
                  />
                </div>
                {course.price && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Preço:</span>
                    <span className="font-semibold text-primary">
                      {course.currency === 'BRL' ? 'R$' : course.currency === 'USD' ? '$' : '€'} 
                      {parseFloat(course.price.toString()).toFixed(2)}
                    </span>
                  </div>
                )}
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