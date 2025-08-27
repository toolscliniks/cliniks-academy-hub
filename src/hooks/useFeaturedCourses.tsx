import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Course } from './useCourses';

export const useFeaturedCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeaturedCourses();
  }, []);

  const fetchFeaturedCourses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cursos em destaque');
    } finally {
      setLoading(false);
    }
  };

  return { courses, loading, error, refetch: fetchFeaturedCourses };
};