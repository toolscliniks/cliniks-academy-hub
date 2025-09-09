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
import type { DashboardCarouselItem } from '@/types/carousel';

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
  const [carouselItems, setCarouselItems] = useState<DashboardCarouselItem[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<FeaturedCourse[]>([]);
  const [isCarouselDialogOpen, setIsCarouselDialogOpen] = useState(false);
  const [editingCarouselItem, setEditingCarouselItem] = useState<DashboardCarouselItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [carouselFormData, setCarouselFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    video_url: '',
    media_type: 'image' as 'image' | 'video',
    action_url: '',
    is_active: true,
    show_title: true,
    show_description: true,
    content_position: 'overlay' as 'overlay' | 'bottom',
    transparency_level: 'medium' as 'low' | 'medium' | 'high'
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
        setCarouselItems(data.setting_value as unknown as DashboardCarouselItem[]);
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

  const saveCarouselItems = async (items: DashboardCarouselItem[]) => {
    try {
      // Primeiro, verifica se o registro existe
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('setting_key', 'dashboard_carousel')
        .single();

      let error;
      if (existing) {
        // Se existe, faz UPDATE
        const result = await supabase
          .from('site_settings')
          .update({
            setting_value: items as any,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'dashboard_carousel');
        error = result.error;
      } else {
        // Se não existe, faz INSERT
        const result = await supabase
          .from('site_settings')
          .insert({
            setting_key: 'dashboard_carousel',
            setting_value: items as any,
            updated_at: new Date().toISOString()
          });
        error = result.error;
      }

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
      // Primeiro, verifica se o registro existe
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('setting_key', 'homepage_featured_courses')
        .single();

      let error;
      if (existing) {
        // Se existe, faz UPDATE
        const result = await supabase
          .from('site_settings')
          .update({
            setting_value: featured as any,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'homepage_featured_courses');
        error = result.error;
      } else {
        // Se não existe, faz INSERT
        const result = await supabase
          .from('site_settings')
          .insert({
            setting_key: 'homepage_featured_courses',
            setting_value: featured as any,
            updated_at: new Date().toISOString()
          });
        error = result.error;
      }

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
    
    const newItem: DashboardCarouselItem = {
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
      video_url: '',
      media_type: 'image',
      action_url: '',
      is_active: true,
      show_title: true,
      show_description: true,
      content_position: 'overlay',
      transparency_level: 'medium'
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

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (image: 5MB, video: 50MB limit)
    const maxSize = mediaType === 'image' ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Erro",
        description: `O ${mediaType === 'image' ? 'arquivo' : 'vídeo'} deve ter no máximo ${mediaType === 'image' ? '5MB' : '50MB'}`,
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    const validTypes = mediaType === 'image' ? validImageTypes : validVideoTypes;
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: `Tipo de arquivo não suportado. Use ${mediaType === 'image' ? 'JPEG, PNG, WebP ou GIF' : 'MP4, WebM ou OGG'}`,
        variant: "destructive"
      });
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `carousel_${mediaType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('course-covers')
        .upload(`carousel/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-covers')
        .getPublicUrl(`carousel/${fileName}`);

      if (mediaType === 'image') {
        setCarouselFormData(prev => ({ ...prev, image_url: publicUrl, media_type: 'image' }));
      } else {
        setCarouselFormData(prev => ({ ...prev, video_url: publicUrl, media_type: 'video' }));
      }
      
      toast({
        title: `${mediaType === 'image' ? 'Imagem' : 'Vídeo'} enviado!`,
        description: `O ${mediaType === 'image' ? 'imagem' : 'vídeo'} do carrossel foi carregado com sucesso.`
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const editCarouselItem = (item: DashboardCarouselItem) => {
    setEditingCarouselItem(item);
    setCarouselFormData({
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      video_url: item.video_url || '',
      media_type: item.media_type || 'image',
      action_url: item.action_url,
      is_active: item.is_active,
      show_title: item.show_title ?? true,
      show_description: item.show_description ?? true,
      content_position: item.content_position || 'overlay',
      transparency_level: item.transparency_level || 'medium'
    });
    setIsCarouselDialogOpen(true);
  };

  const updateCarouselItemSettings = async (itemId: string, settings: Partial<Pick<DashboardCarouselItem, 'show_title' | 'show_description' | 'content_position'>>) => {
    try {
      // Atualizar o estado local primeiro
      const updatedItems = carouselItems.map(item => 
        item.id === itemId ? { ...item, ...settings } : item
      );
      
      setCarouselItems(updatedItems);

      // Salvar no site_settings
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'dashboard_carousel',
          setting_value: updatedItems,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      toast({
        title: "Configurações atualizadas",
        description: "As configurações do item foram salvas com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive"
      });
      
      // Reverter o estado local em caso de erro
      setCarouselItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...Object.fromEntries(Object.keys(settings).map(key => [key, item[key as keyof DashboardCarouselItem]])) } : item
      ));
    }
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
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCarouselItem ? 'Editar' : 'Adicionar'} Item do Carrossel
                  </DialogTitle>
                  <DialogDescription>
                    Configure um item para aparecer no carrossel do dashboard
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCarouselSubmit} className="space-y-3">
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={carouselFormData.description}
                      onChange={(e) => setCarouselFormData(prev => ({...prev, description: e.target.value}))}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipo de Mídia</Label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="media_type"
                          value="image"
                          checked={carouselFormData.media_type === 'image'}
                          onChange={(e) => setCarouselFormData(prev => ({...prev, media_type: e.target.value as 'image' | 'video'}))}
                        />
                        <span>Imagem</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="media_type"
                          value="video"
                          checked={carouselFormData.media_type === 'video'}
                          onChange={(e) => setCarouselFormData(prev => ({...prev, media_type: e.target.value as 'image' | 'video'}))}
                        />
                        <span>Vídeo</span>
                      </label>
                    </div>
                  </div>

                  {carouselFormData.media_type === 'image' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="image_url">URL da Imagem</Label>
                        <Input
                          id="image_url"
                          value={carouselFormData.image_url}
                          onChange={(e) => setCarouselFormData(prev => ({...prev, image_url: e.target.value}))}
                          placeholder="https://... (dimensões ideais: 1920x1080px)"
                        />
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <div className="text-blue-600 text-lg">📐</div>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-blue-900 mb-1">Especificações Recomendadas:</p>
                              <ul className="text-xs text-blue-800 space-y-1">
                                <li>• <strong>Dimensões:</strong> 1920x1080px (Full HD, proporção 16:9)</li>
                                <li>• <strong>Tamanho máximo:</strong> 5MB</li>
                                <li>• <strong>Formatos:</strong> JPG, PNG, WebP (WebP recomendado)</li>
                                <li>• <strong>Qualidade:</strong> Alta resolução para melhor visualização</li>
                              </ul>
                              <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-700">
                                💡 <strong>Dica:</strong> Imagens com texto devem ter contraste alto para melhor legibilidade
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                        <div className="space-y-2">
                          <Label htmlFor="image_upload">Ou faça upload de uma imagem</Label>
                          <Input
                            id="image_upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handleMediaUpload(e, 'image')}
                            className="mt-1"
                          />
                          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                            <p className="text-xs text-green-800">
                              ✅ <strong>Upload automático:</strong> A imagem será redimensionada e otimizada automaticamente para o carrossel
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {carouselFormData.media_type === 'video' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="video_url">URL do Vídeo</Label>
                          <Input
                            id="video_url"
                            value={carouselFormData.video_url}
                            onChange={(e) => setCarouselFormData(prev => ({...prev, video_url: e.target.value}))}
                            placeholder="https://... ou URL do YouTube"
                          />
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <div className="text-purple-600 text-lg">🎥</div>
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-purple-900 mb-1">Vídeos Suportados:</p>
                                <ul className="text-xs text-purple-800 space-y-1">
                                  <li>• <strong>YouTube:</strong> Cole a URL completa do vídeo</li>
                                  <li>• <strong>Upload direto:</strong> MP4, WebM, OGV</li>
                                  <li>• <strong>Resolução:</strong> 1920x1080px (Full HD) recomendada</li>
                                  <li>• <strong>Duração:</strong> Vídeos curtos (30s-2min) funcionam melhor</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="video_upload">Ou faça upload de um vídeo</Label>
                          <Input
                            id="video_upload"
                            type="file"
                            accept="video/mp4,video/webm,video/ogg"
                            onChange={(e) => handleMediaUpload(e, 'video')}
                            className="mt-1"
                          />
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                            <p className="text-xs text-orange-800">
                              ⚠️ <strong>Limite de upload:</strong> Máximo 50MB • Formatos: MP4, WebM, OGV
                            </p>
                            <p className="text-xs text-orange-700 mt-1">
                              💡 Para vídeos maiores, recomendamos hospedar no YouTube e usar a URL
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-medium text-sm">Personalização</h4>
                    
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show_title"
                          checked={carouselFormData.show_title}
                          onCheckedChange={(checked) => setCarouselFormData(prev => ({...prev, show_title: checked}))}
                        />
                        <Label htmlFor="show_title">Título</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show_description"
                          checked={carouselFormData.show_description}
                          onCheckedChange={(checked) => setCarouselFormData(prev => ({...prev, show_description: checked}))}
                        />
                        <Label htmlFor="show_description">Descrição</Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Posição</Label>
                      <div className="flex space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="content_position"
                            value="overlay"
                            checked={carouselFormData.content_position === 'overlay'}
                            onChange={(e) => setCarouselFormData(prev => ({...prev, content_position: e.target.value as 'overlay' | 'bottom'}))}
                          />
                          <span>Sobreposto</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="content_position"
                            value="bottom"
                            checked={carouselFormData.content_position === 'bottom'}
                            onChange={(e) => setCarouselFormData(prev => ({...prev, content_position: e.target.value as 'overlay' | 'bottom'}))}
                          />
                          <span>Abaixo</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Nível de Transparência</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="transparency_level"
                          value="low"
                          checked={carouselFormData.transparency_level === 'low'}
                          onChange={(e) => setCarouselFormData(prev => ({...prev, transparency_level: e.target.value as 'low' | 'medium' | 'high'}))}
                        />
                        <span className="text-sm">Baixa</span>
                      </label>
                      <label className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="transparency_level"
                          value="medium"
                          checked={carouselFormData.transparency_level === 'medium'}
                          onChange={(e) => setCarouselFormData(prev => ({...prev, transparency_level: e.target.value as 'low' | 'medium' | 'high'}))}
                        />
                        <span className="text-sm">Média</span>
                      </label>
                      <label className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="transparency_level"
                          value="high"
                          checked={carouselFormData.transparency_level === 'high'}
                          onChange={(e) => setCarouselFormData(prev => ({...prev, transparency_level: e.target.value as 'low' | 'medium' | 'high'}))}
                        />
                        <span className="text-sm">Alta</span>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">Controla a opacidade do overlay sobre a imagem/vídeo</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={carouselFormData.is_active}
                      onCheckedChange={(checked) => setCarouselFormData(prev => ({...prev, is_active: checked}))}
                    />
                    <Label htmlFor="is_active">Ativo</Label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={resetCarouselForm}>
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm">
                      {editingCarouselItem ? 'Atualizar' : 'Adicionar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {carouselItems.map((item) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
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
                
                {/* Controles de Personalização Inline */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Personalização</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          size="sm"
                          checked={item.show_title ?? true}
                          onCheckedChange={(checked) => updateCarouselItemSettings(item.id, { show_title: checked })}
                        />
                        <Label className="text-xs text-gray-700">Título</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          size="sm"
                          checked={item.show_description ?? true}
                          onCheckedChange={(checked) => updateCarouselItemSettings(item.id, { show_description: checked })}
                        />
                        <Label className="text-xs text-gray-700">Descrição</Label>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-gray-700">Posição:</Label>
                        <select
                          className="text-xs border rounded px-2 py-1 w-full bg-white text-gray-900"
                          value={item.content_position || 'center-left'}
                          onChange={(e) => updateCarouselItemSettings(item.id, { content_position: e.target.value })}
                        >
                          <option value="top-left">Topo Esquerda</option>
                          <option value="top-center">Topo Centro</option>
                          <option value="top-right">Topo Direita</option>
                          <option value="center-left">Centro Esquerda</option>
                          <option value="center-center">Centro</option>
                          <option value="center-right">Centro Direita</option>
                          <option value="bottom-left">Baixo Esquerda</option>
                          <option value="bottom-center">Baixo Centro</option>
                          <option value="bottom-right">Baixo Direita</option>
                        </select>
                      </div>
                    </div>
                  </div>
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