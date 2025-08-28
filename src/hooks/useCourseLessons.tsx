import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_type: 'upload' | 'youtube' | 'vimeo';
  external_video_id: string | null;
  external_video_platform: string | null;
  duration_minutes: number;
  order_index: number;
  is_free: boolean;
  created_at: string;
  updated_at: string;
}

export const useCourseLessons = (courseId: string) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (courseId) {
      fetchModulesAndLessons();
    }
  }, [courseId]);

  const fetchModulesAndLessons = async () => {
    try {
      setLoading(true);
      
      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (modulesError) throw modulesError;

      // Fetch lessons for all modules
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .in('module_id', modulesData?.map(m => m.id) || [])
        .order('order_index');

      if (lessonsError) throw lessonsError;

      setModules(modulesData || []);
      setLessons(lessonsData?.map(lesson => ({
        ...lesson,
        video_type: lesson.video_type as 'upload' | 'youtube' | 'vimeo'
      })) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar aulas');
    } finally {
      setLoading(false);
    }
  };

  const createModule = async (title: string, description: string = '', coverImage?: File) => {
    const maxOrder = Math.max(...modules.map(m => m.order_index), 0);
    
    let cover_image_url = null;
    
    // Upload cover image if provided
    if (coverImage) {
      const fileExt = coverImage.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${courseId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-covers')
        .upload(filePath, coverImage);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-covers')
        .getPublicUrl(filePath);

      cover_image_url = publicUrl;
    }
    
    const { data, error } = await supabase
      .from('modules')
      .insert([{
        course_id: courseId,
        title,
        description,
        cover_image_url,
        order_index: maxOrder + 1
      }])
      .select()
      .single();

    if (error) throw error;
    
    setModules(prev => [...prev, data]);
    return data;
  };

  const addLesson = async (moduleId: string, lessonData: {
    title: string;
    description?: string;
    video_url?: string;
    video_type?: 'upload' | 'youtube' | 'vimeo';
    external_video_id?: string | null;
    external_video_platform?: string | null;
    duration_minutes?: number;
    is_free?: boolean;
  }) => {
    const modulelessons = lessons.filter(l => l.module_id === moduleId);
    const maxOrder = Math.max(...modulelessons.map(l => l.order_index), 0);

    const { data, error } = await supabase
      .from('lessons')
      .insert([{
        module_id: moduleId,
        ...lessonData,
        order_index: maxOrder + 1
      }])
      .select()
      .single();

    if (error) throw error;
    
    const newLesson = {
      ...data,
      video_type: data.video_type as 'upload' | 'youtube' | 'vimeo'
    };
    
    setLessons(prev => [...prev, newLesson]);
    
    // Update course duration after adding lesson
    try {
      await updateCourseDuration();
    } catch (error) {
      console.error('Error updating course duration:', error);
    }
    
    return data;
  };

  const fetchYouTubeInfo = async (youtubeUrl: string) => {
    try {
      // Extract video ID from URL
      const extractYouTubeId = (url: string): string | null => {
        const patterns = [
          /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
          /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
        ];
        
        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match && match[1]) {
            return match[1];
          }
        }
        return null;
      };

      const videoId = extractYouTubeId(youtubeUrl);
      if (!videoId) {
        throw new Error('ID do vídeo do YouTube não pôde ser extraído da URL');
      }

      const { data, error } = await supabase.functions.invoke('youtube-video-info', {
        body: { url: youtubeUrl }
      });

      if (error) throw error;
      
      // Return in the expected format for lesson creation
      return {
        id: videoId,
        title: data.title || 'Título do YouTube',
        description: data.description || '',
        duration: data.duration || 0,
        thumbnail: data.thumbnail || ''
      };
    } catch (err: any) {
      console.error('YouTube API Error:', err);
      throw new Error(err.message || 'Erro ao buscar informações do YouTube');
    }
  };

  const updateCourseDuration = async () => {
    if (!courseId) return;
    
    const totalMinutes = lessons.reduce((total, lesson) => total + (lesson.duration_minutes || 0), 0);
    const totalHours = Math.ceil(totalMinutes / 60);

    const { error } = await supabase
      .from('courses')
      .update({ duration_hours: totalHours })
      .eq('id', courseId);

    if (error) throw error;
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Tem certeza que deseja excluir este módulo e todas suas aulas?')) return;
    
    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);
      
      if (error) throw error;
      
      setModules(prev => prev.filter(m => m.id !== moduleId));
      toast({
        title: "Módulo excluído!",
        description: "O módulo foi removido com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateModule = async (moduleId: string, title: string, description: string = '', coverImage?: File) => {
    try {
      let cover_image_url = modules.find(m => m.id === moduleId)?.cover_image_url;
      
      // Upload new cover image if provided
      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${courseId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('course-covers')
          .upload(filePath, coverImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('course-covers')
          .getPublicUrl(filePath);

        cover_image_url = publicUrl;
      }
      
      const { data, error } = await supabase
        .from('modules')
        .update({
          title,
          description,
          cover_image_url
        })
        .eq('id', moduleId)
        .select()
        .single();

      if (error) throw error;
      
      setModules(prev => prev.map(m => m.id === moduleId ? data : m));
      return data;
    } catch (error) {
      throw error;
    }
  };

  return {
    modules,
    lessons,
    loading,
    error,
    createModule,
    addLesson,
    fetchYouTubeInfo,
    updateCourseDuration,
    updateModule,
    deleteModule,
    refetch: fetchModulesAndLessons
  };
};