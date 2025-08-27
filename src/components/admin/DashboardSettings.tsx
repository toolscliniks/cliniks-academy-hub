import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Upload, Image, Star, Settings, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useCourses } from '@/hooks/useCourses';

interface CarouselItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  action_url: string;
  is_active: boolean;
  order_index: number;
}

interface FeaturedCourse {
  course_id: string;
  is_featured_on_homepage: boolean;
  order_index: number;
  custom_title?: string;
  custom_description?: string;
}

const DashboardSettings = () => {
  const { courses } = useCourses();
  const { toast } = useToast();
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<FeaturedCourse[]>([]);
  const [isCarouselDialogOpen, setIsCarouselDialogOpen] = useState(false);
  const [editingCarouselItem, setEditingCarouselItem] = useState<CarouselItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [carouselFormData, setCarouselFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    action_url: '',
    is_active: true
  });

  useEffect(() => {
    fetchCarouselItems();
    fetchFeaturedCourses();
  }, []);

  const fetchCarouselItems = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'dashboard_carousel')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.setting_value) {
        setCarouselItems(data.setting_value as unknown as CarouselItem[]);
      }
    } catch (error) {
      console.error('Error fetching carousel items:', error);
    }
  };

  const fetchFeaturedCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'homepage_featured_courses')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.setting_value) {
        setFeaturedCourses(data.setting_value as unknown as FeaturedCourse[]);
      }
    } catch (error) {
      console.error('Error fetching featured courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCarouselItems = async (items: CarouselItem[]) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'dashboard_carousel',
          setting_value: items as any,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setCarouselItems(items);
      toast({
        title: "Sucesso",
        description: "Carrossel atualizado com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar carrossel",
        variant: "destructive"
      });
    }
  };

  const saveFeaturedCourses = async (featured: FeaturedCourse[]) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'homepage_featured_courses',
          setting_value: featured as any,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setFeaturedCourses(featured);
      toast({
        title: "Sucesso",
        description: "Cursos em destaque atualizados"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar cursos em destaque",
        variant: "destructive"
      });
    }
  };

  const handleCarouselSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newItem: CarouselItem = {
      id: editingCarouselItem?.id || `carousel_${Date.now()}`,
      ...carouselFormData,
      order_index: editingCarouselItem?.order_index || carouselItems.length
    };

    let updatedItems;
    if (editingCarouselItem) {
      updatedItems = carouselItems.map(item => 
        item.id === editingCarouselItem.id ? newItem : item
      );
    } else {
      updatedItems = [...carouselItems, newItem];
    }

    saveCarouselItems(updatedItems);
    resetCarouselForm();
  };

  const resetCarouselForm = () => {
    setCarouselFormData({
      title: '',
      description: '',
      image_url: '',
      action_url: '',
      is_active: true
    });
    setEditingCarouselItem(null);
    setIsCarouselDialogOpen(false);
  };

  const deleteCarouselItem = (itemId: string) => {
    const updatedItems = carouselItems.filter(item => item.id !== itemId);
    saveCarouselItems(updatedItems);
  };

  const toggleCarouselItemStatus = (itemId: string) => {
    const updatedItems = carouselItems.map(item =>
      item.id === itemId ? { ...item, is_active: !item.is_active } : item
    );
    saveCarouselItems(updatedItems);
  };

  const toggleCourseFeatured = (courseId: string) => {
    const existing = featuredCourses.find(fc => fc.course_id === courseId);
    let updatedFeatured;

    if (existing) {
      updatedFeatured = featuredCourses.map(fc =>
        fc.course_id === courseId 
          ? { ...fc, is_featured_on_homepage: !fc.is_featured_on_homepage }
          : fc
      );
    } else {
      updatedFeatured = [...featuredCourses, {
        course_id: courseId,
        is_featured_on_homepage: true,
        order_index: featuredCourses.length
      }];
    }

    saveFeaturedCourses(updatedFeatured);
  };

  const editCarouselItem = (item: CarouselItem) => {
    setEditingCarouselItem(item);
    setCarouselFormData({
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      action_url: item.action_url,
      is_active: item.is_active
    });
    setIsCarouselDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dashboard Carousel Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Carrossel do Dashboard
          </CardTitle>
          <CardDescription>
            Gerencie os itens que aparecem no carrossel principal do dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <p className="text-sm text-muted-foreground">
              {carouselItems.length} itens configurados
            </p>
            <Dialog open={isCarouselDialogOpen} onOpenChange={setIsCarouselDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetCarouselForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingCarouselItem ? 'Editar' : 'Adicionar'} Item do Carrossel
                  </DialogTitle>
                  <DialogDescription>
                    Configure um item para aparecer no carrossel do dashboard
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCarouselSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        value={carouselFormData.title}
                        onChange={(e) => setCarouselFormData(prev => ({...prev, title: e.target.value}))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="action_url">URL de Ação</Label>
                      <Input
                        id="action_url"
                        value={carouselFormData.action_url}
                        onChange={(e) => setCarouselFormData(prev => ({...prev, action_url: e.target.value}))}
                        placeholder="/courses/123"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={carouselFormData.description}
                      onChange={(e) => setCarouselFormData(prev => ({...prev, description: e.target.value}))}
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="image_url">URL da Imagem</Label>
                    <Input
                      id="image_url"
                      value={carouselFormData.image_url}
                      onChange={(e) => setCarouselFormData(prev => ({...prev, image_url: e.target.value}))}
                      placeholder="https://..."
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={carouselFormData.is_active}
                      onCheckedChange={(checked) => setCarouselFormData(prev => ({...prev, is_active: checked}))}
                    />
                    <Label htmlFor="is_active">Ativo</Label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={resetCarouselForm}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingCarouselItem ? 'Atualizar' : 'Adicionar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {carouselItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div>
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCarouselItemStatus(item.id)}
                  >
                    {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editCarouselItem(item)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCarouselItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {carouselItems.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum item configurado ainda
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Featured Courses Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Cursos em Destaque
          </CardTitle>
          <CardDescription>
            Selecione quais cursos aparecerão na tela inicial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {courses?.map((course) => {
              const featured = featuredCourses.find(fc => fc.course_id === course.id);
              const isFeatured = featured?.is_featured_on_homepage || false;
              
              return (
                <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <img
                      src={course.cover_image_url || '/placeholder.svg'}
                      alt={course.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <h4 className="font-semibold">{course.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Por {course.instructor_name || 'Instrutor'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={course.is_published ? "default" : "secondary"}>
                          {course.is_published ? "Publicado" : "Rascunho"}
                        </Badge>
                        {isFeatured && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <Star className="w-3 h-3 mr-1" />
                            Destaque
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={isFeatured}
                      onCheckedChange={() => toggleCourseFeatured(course.id)}
                      disabled={!course.is_published}
                    />
                    <Label className="text-sm">Em destaque</Label>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardSettings;