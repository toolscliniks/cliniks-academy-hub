import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  enrolled_at: string;
  completed_at: string | null;
}

interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  is_completed: boolean;
  watch_time_seconds: number;
  completed_at: string | null;
}

export const useEnrollment = (courseId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && courseId) {
      fetchEnrollment();
    }
  }, [user, courseId]);

  const fetchEnrollment = async () => {
    if (!user || !courseId) return;

    try {
      setLoading(true);

      // Get enrollment data
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (enrollmentError) throw enrollmentError;
      setEnrollment(enrollmentData);

      // Get lesson progress if enrolled
      if (enrollmentData) {
        const { data: progressData, error: progressError } = await supabase
          .from('lesson_progress')
          .select(`
            *,
            lessons!inner (
              module_id,
              modules!inner (
                course_id
              )
            )
          `)
          .eq('user_id', user.id)
          .eq('lessons.modules.course_id', courseId);

        if (progressError) throw progressError;
        setLessonProgress(progressData || []);
      }
    } catch (error) {
      console.error('Error fetching enrollment:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrollInCourse = async () => {
    if (!user || !courseId) return false;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('course_enrollments')
        .insert([{
          user_id: user.id,
          course_id: courseId
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Você foi inscrito no curso com sucesso!"
      });

      // Refresh enrollment data
      await fetchEnrollment();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateCourseProgress = async () => {
    if (!user || !courseId) return;

    try {
      // Get all lessons for this course
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          modules!inner (
            course_id
          )
        `)
        .eq('modules.course_id', courseId);

      if (lessonsError) throw lessonsError;
      
      const lessonIds = lessonsData?.map(l => l.id) || [];
      if (lessonIds.length === 0) return;

      // Get completed lessons count
      const { data: completedLessons, error: progressError } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .in('lesson_id', lessonIds);

      if (progressError) throw progressError;

      // Calculate progress percentage
      const completedCount = completedLessons?.length || 0;
      const totalLessons = lessonIds.length;
      const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      
      // Check if course is completed
      const isCompleted = progressPercentage === 100;
      const completedAt = isCompleted ? new Date().toISOString() : null;

      // Update course enrollment progress
      const { error: updateError } = await supabase
        .from('course_enrollments')
        .update({
          progress: progressPercentage,
          completed_at: completedAt
        })
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (updateError) throw updateError;

    } catch (error) {
      console.error('Error updating course progress:', error);
    }
  };

  const markLessonComplete = async (lessonId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          is_completed: true,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update course progress after marking lesson complete
      await updateCourseProgress();

      toast({
        title: "Parabéns!",
        description: "Aula marcada como concluída!"
      });

      // Refresh data
      await fetchEnrollment();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const updateWatchTime = async (lessonId: string, watchTimeSeconds: number) => {
    if (!user) return;

    try {
      await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          watch_time_seconds: watchTimeSeconds
        });
    } catch (error) {
      console.error('Error updating watch time:', error);
    }
  };

  const isLessonCompleted = (lessonId: string): boolean => {
    return lessonProgress.some(
      progress => progress.lesson_id === lessonId && progress.is_completed
    );
  };

  const getLessonWatchTime = (lessonId: string): number => {
    const progress = lessonProgress.find(p => p.lesson_id === lessonId);
    return progress?.watch_time_seconds || 0;
  };

  return {
    enrollment,
    lessonProgress,
    loading,
    enrollInCourse,
    markLessonComplete,
    updateWatchTime,
    isLessonCompleted,
    getLessonWatchTime,
    refetch: fetchEnrollment
  };
};