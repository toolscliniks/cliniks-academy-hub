import { useState } from 'react';
import { useCourses } from '@/hooks/useCourses';
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
import { Plus, Edit, Trash2, Upload, ExternalLink, Video } from 'lucide-react';

const AdminCourses = () => {
  const { courses, loading, refetch } = useCourses();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor_name: '',
    duration_hours: 0,
    difficulty_level: 'Iniciante',
    category: '',
    cover_image_url: ''
  });

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
                <Label htmlFor="cover">Imagem de Capa</Label>
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
                  <img 
                    src={formData.cover_image_url} 
                    alt="Preview" 
                    className="w-32 h-20 object-cover rounded border"
                  />
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
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses?.map((course) => (
          <Card key={course.id} className="bg-gradient-card border-border/50">
            <CardHeader>
              {course.cover_image_url && (
                <img 
                  src={course.cover_image_url} 
                  alt={course.title}
                  className="w-full h-32 object-cover rounded mb-2"
                />
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
                <Button variant="outline" size="sm">
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