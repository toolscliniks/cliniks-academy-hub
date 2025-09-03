import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Eye, EyeOff, Star, Package, Users } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  instructor_name: string;
  duration_hours: number;
  difficulty_level: string;
  category: string;
  price: number;
  currency: string;
  is_published: boolean;
  is_featured: boolean;
  trailer_video_url: string;
  commercial_video_url: string;
  created_at: string;
}

interface CoursePackage {
  id: string;
  name: string;
  description: string;
  original_price: number;
  sale_price: number;
  discount_percentage: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  max_purchases: number;
  current_purchases: number;
}

interface CoursePlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_active: boolean;
}

const AdminCursos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('courses');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingPackage, setEditingPackage] = useState<CoursePackage | null>(null);
  const [editingPlan, setEditingPlan] = useState<CoursePlan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Buscar cursos
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Course[];
    },
  });

  // Buscar pacotes
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CoursePackage[];
    },
  });

  // Buscar planos
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CoursePlan[];
    },
  });

  // Mutação para salvar curso
  const saveCourse = useMutation({
    mutationFn: async (courseData: Partial<Course>) => {
      if (editingCourse) {
        const { data, error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', editingCourse.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('courses')
          .insert(courseData)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      setDialogOpen(false);
      setEditingCourse(null);
      toast({
        title: 'Sucesso',
        description: 'Curso salvo com sucesso!'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar curso',
        variant: 'destructive'
      });
    }
  });

  // Mutação para deletar curso
  const deleteCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast({
        title: 'Sucesso',
        description: 'Curso deletado com sucesso!'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao deletar curso',
        variant: 'destructive'
      });
    }
  });

  // Mutação para toggle published/featured
  const toggleCourseStatus = useMutation({
    mutationFn: async ({ courseId, field, value }: { courseId: string, field: string, value: boolean }) => {
      const { error } = await supabase
        .from('courses')
        .update({ [field]: value })
        .eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleEditCourse = (course?: Course) => {
    setEditingCourse(course || null);
    setDialogOpen(true);
  };

  const handleSaveCourse = (formData: FormData) => {
    const courseData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      instructor_name: formData.get('instructor_name') as string,
      duration_hours: parseInt(formData.get('duration_hours') as string) || 0,
      difficulty_level: formData.get('difficulty_level') as string,
      category: formData.get('category') as string,
      price: parseFloat(formData.get('price') as string) || 0,
      trailer_video_url: formData.get('trailer_video_url') as string,
      commercial_video_url: formData.get('commercial_video_url') as string,
      is_published: formData.get('is_published') === 'on',
      is_featured: formData.get('is_featured') === 'on',
    };

    saveCourse.mutate(courseData);
  };

  const CourseForm = () => (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSaveCourse(new FormData(e.currentTarget));
    }}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            name="title"
            defaultValue={editingCourse?.title || ''}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructor_name">Instrutor</Label>
          <Input
            id="instructor_name"
            name="instructor_name"
            defaultValue={editingCourse?.instructor_name || ''}
            required
          />
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={editingCourse?.description || ''}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Input
            id="category"
            name="category"
            defaultValue={editingCourse?.category || ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="difficulty_level">Nível</Label>
          <Select name="difficulty_level" defaultValue={editingCourse?.difficulty_level || 'Iniciante'}>
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
          <Label htmlFor="duration_hours">Duração (horas)</Label>
          <Input
            id="duration_hours"
            name="duration_hours"
            type="number"
            defaultValue={editingCourse?.duration_hours || 0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Preço (R$)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            defaultValue={editingCourse?.price || 0}
          />
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="trailer_video_url">URL do Trailer</Label>
          <Input
            id="trailer_video_url"
            name="trailer_video_url"
            type="url"
            defaultValue={editingCourse?.trailer_video_url || ''}
          />
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="commercial_video_url">URL do Vídeo Comercial</Label>
          <Input
            id="commercial_video_url"
            name="commercial_video_url"
            type="url"
            defaultValue={editingCourse?.commercial_video_url || ''}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_published"
            name="is_published"
            defaultChecked={editingCourse?.is_published || false}
          />
          <Label htmlFor="is_published">Publicado</Label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_featured"
            name="is_featured"
            defaultChecked={editingCourse?.is_featured || false}
          />
          <Label htmlFor="is_featured">Destaque</Label>
        </div>
      </div>

      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saveCourse.isPending}>
          {saveCourse.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogFooter>
    </form>
  );

  const CourseCard = ({ course }: { course: Course }) => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{course.title}</CardTitle>
            <CardDescription>{course.instructor_name}</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleCourseStatus.mutate({
                courseId: course.id,
                field: 'is_published',
                value: !course.is_published
              })}
            >
              {course.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleCourseStatus.mutate({
                courseId: course.id,
                field: 'is_featured',
                value: !course.is_featured
              })}
            >
              <Star className={`w-4 h-4 ${course.is_featured ? 'text-yellow-500' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <Badge variant={course.is_published ? 'default' : 'secondary'}>
              {course.is_published ? 'Publicado' : 'Rascunho'}
            </Badge>
            {course.is_featured && (
              <Badge variant="outline" className="text-yellow-600">
                Destaque
              </Badge>
            )}
            <Badge variant="outline">{course.difficulty_level}</Badge>
          </div>
          <div className="text-lg font-bold text-green-600">
            {formatCurrency(course.price)}
          </div>
        </div>

        <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
          <span>{course.category}</span>
          <span>{course.duration_hours}h</span>
        </div>

        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditCourse(course)}
          >
            <Edit className="w-4 h-4 mr-1" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteCourse.mutate(course.id)}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Deletar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Administração de Cursos</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="packages">Pacotes</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Gerenciar Cursos</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleEditCourse()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Curso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingCourse ? 'Editar Curso' : 'Novo Curso'}
                  </DialogTitle>
                  <DialogDescription>
                    Preencha os dados do curso abaixo.
                  </DialogDescription>
                </DialogHeader>
                <CourseForm />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coursesLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="bg-gray-200 h-6 rounded mb-2"></div>
                    <div className="bg-gray-200 h-4 rounded"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-200 h-20 rounded"></div>
                  </CardContent>
                </Card>
              ))
            ) : (
              courses?.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Gerenciar Pacotes</h2>
            <Button>
              <Package className="w-4 h-4 mr-2" />
              Novo Pacote
            </Button>
          </div>
          
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Funcionalidade de pacotes em desenvolvimento</p>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Gerenciar Planos</h2>
            <Button>
              <Users className="w-4 h-4 mr-2" />
              Novo Plano
            </Button>
          </div>
          
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Funcionalidade de planos em desenvolvimento</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCursos;