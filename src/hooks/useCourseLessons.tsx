import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  video_type: string;
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
      setLessons(lessonsData || []);
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
    video_type: string;
    external_video_id?: string;
    external_video_platform?: string;
    duration_minutes: number;
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
    
    setLessons(prev => [...prev, data]);
    return data;
  };

  const fetchYouTubeInfo = async (youtubeUrl: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('youtube-video-info', {
        body: { url: youtubeUrl }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error('Erro ao buscar informações do YouTube');
    }
  };

  const updateCourseDuration = async () => {
    const totalMinutes = lessons.reduce((total, lesson) => total + lesson.duration_minutes, 0);
    const totalHours = Math.ceil(totalMinutes / 60);

    const { error } = await supabase
      .from('courses')
      .update({ duration_hours: totalHours })
      .eq('id', courseId);

    if (error) throw error;
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
    refetch: fetchModulesAndLessons
  };
};