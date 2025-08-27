import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, BookOpen, FolderOpen, Edit, Trash2, Save, X } from 'lucide-react';
import { useCourses } from '@/hooks/useCourses';

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  course_id: string;
  cover_image_url: string | null;
  lesson_count?: number;
}

const ModuleManagement = () => {
  const { courses, loading: coursesLoading } = useCourses();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  
  const [moduleFormData, setModuleFormData] = useState({
    title: '',
    description: ''
  });

  const [editFormData, setEditFormData] = useState({
    title: '',
    description: ''
  });

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseModules();
    }
  }, [selectedCourse]);

  const fetchCourseModules = async () => {
    if (!selectedCourse) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('modules')
        .select(`
          *,
          lessons(count)
        `)
        .eq('course_id', selectedCourse)
        .order('order_index');

      if (error) throw error;

      const modulesWithCount = data?.map(module => ({
        ...module,
        lesson_count: module.lessons?.[0]?.count || 0
      })) || [];

      setModules(modulesWithCount);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar módulos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
      // Get the next order index
      const { data: lastModule, error: orderError } = await supabase
        .from('modules')
        .select('order_index')
        .eq('course_id', selectedCourse)
        .order('order_index', { ascending: false })
        .limit(1);

      if (orderError) throw orderError;

      const nextOrderIndex = lastModule?.[0]?.order_index + 1 || 0;

      const { error } = await supabase
        .from('modules')
        .insert({
          title: moduleFormData.title.trim(),
          description: moduleFormData.description.trim() || null,
          course_id: selectedCourse,
          order_index: nextOrderIndex
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Módulo adicionado com sucesso."
      });

      setModuleFormData({ title: '', description: '' });
      setIsAddModuleOpen(false);
      fetchCourseModules();
    } catch (error: any) {
      console.error('Error adding module:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar módulo.",
        variant: "destructive"
      });
    }
  };

  const handleEditModule = async (moduleId: string) => {
    if (!editFormData.title.trim()) {
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
          title: editFormData.title.trim(),
          description: editFormData.description.trim() || null
        })
        .eq('id', moduleId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Módulo atualizado com sucesso."
      });

      setEditingModule(null);
      fetchCourseModules();
    } catch (error: any) {
      console.error('Error updating module:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar módulo.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteModule = async (moduleId: string, moduleTitle: string) => {
    if (!confirm(`Tem certeza que deseja excluir o módulo "${moduleTitle}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      // First check if module has lessons
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

      fetchCourseModules();
    } catch (error: any) {
      console.error('Error deleting module:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir módulo.",
        variant: "destructive"
      });
    }
  };

  const startEditing = (module: Module) => {
    setEditingModule(module.id);
    setEditFormData({
      title: module.title,
      description: module.description || ''
    });
  };

  const cancelEditing = () => {
    setEditingModule(null);
    setEditFormData({ title: '', description: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Gerenciar Módulos</h2>
          <p className="text-muted-foreground">
            Organize os módulos dos seus cursos
          </p>
        </div>
      </div>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Curso</CardTitle>
          <CardDescription>Escolha um curso para gerenciar seus módulos</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
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
          {/* Add Module Button */}
          <div className="flex justify-end">
            <Dialog open={isAddModuleOpen} onOpenChange={setIsAddModuleOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
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
          </div>

          {/* Modules List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Módulos do Curso
              </CardTitle>
              <CardDescription>Gerencie a estrutura dos módulos</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : modules.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum módulo encontrado.</p>
                  <p className="text-sm">Clique em "Novo Módulo" para criar o primeiro módulo.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {modules.map((module, index) => (
                    <Card key={module.id} className="border-l-4 border-l-primary">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            {editingModule === module.id ? (
                              <div className="space-y-3">
                                <Input
                                  value={editFormData.title}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                                  placeholder="Título do módulo"
                                />
                                <Textarea
                                  value={editFormData.description}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Descrição do módulo (opcional)"
                                  className="min-h-[60px]"
                                />
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleEditModule(module.id)}
                                    disabled={!editFormData.title.trim()}
                                  >
                                    <Save className="w-4 h-4 mr-1" />
                                    Salvar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={cancelEditing}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-3 mb-2">
                                  <CardTitle className="text-lg">{module.title}</CardTitle>
                                  <Badge variant="secondary">
                                    Módulo {index + 1}
                                  </Badge>
                                  <Badge variant="outline">
                                    {module.lesson_count || 0} aula{(module.lesson_count || 0) !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                                {module.description && (
                                  <CardDescription className="mt-2">
                                    {module.description}
                                  </CardDescription>
                                )}
                              </>
                            )}
                          </div>
                          
                          {editingModule !== module.id && (
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => startEditing(module)}
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
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ModuleManagement;