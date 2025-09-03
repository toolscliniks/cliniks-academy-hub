import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/authContext';

interface CourseAccess {
  courseId: string;
  hasAccess: boolean;
  accessType: 'individual' | 'package' | 'plan' | null;
  expiresAt: string | null;
  enrollmentId: string | null;
}

export const useCourseAccess = (courseId?: string) => {
  const { user } = useAuth();

  // Verificar acesso a um curso específico
  const { data: courseAccess, isLoading: courseAccessLoading } = useQuery({
    queryKey: ['course-access', user?.id, courseId],
    queryFn: async () => {
      if (!user?.id || !courseId) return null;

      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          course_id,
          enrolled_at,
          course_purchases (
            purchase_type,
            access_expires_at,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('course_purchases.status', 'active')
        .single();

      if (error || !data) return null;

      const purchase = data.course_purchases;
      const hasAccess = purchase?.status === 'active' && 
        (!purchase.access_expires_at || new Date(purchase.access_expires_at) > new Date());

      return {
        courseId,
        hasAccess,
        accessType: purchase?.purchase_type || null,
        expiresAt: purchase?.access_expires_at || null,
        enrollmentId: data.id,
      } as CourseAccess;
    },
    enabled: !!user?.id && !!courseId,
  });

  // Verificar todos os cursos que o usuário tem acesso
  const { data: allCourseAccess, isLoading: allAccessLoading } = useQuery({
    queryKey: ['all-course-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          course_id,
          enrolled_at,
          courses (
            id,
            title,
            cover_image_url
          ),
          course_purchases (
            purchase_type,
            access_expires_at,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('course_purchases.status', 'active');

      if (error) throw error;

      return data.map(enrollment => {
        const purchase = enrollment.course_purchases;
        const hasAccess = purchase?.status === 'active' && 
          (!purchase.access_expires_at || new Date(purchase.access_expires_at) > new Date());

        return {
          courseId: enrollment.course_id,
          hasAccess,
          accessType: purchase?.purchase_type || null,
          expiresAt: purchase?.access_expires_at || null,
          enrollmentId: enrollment.id,
          course: enrollment.courses,
        };
      });
    },
    enabled: !!user?.id,
  });

  // Verificar progresso do usuário em um curso
  const { data: courseProgress, isLoading: progressLoading } = useQuery({
    queryKey: ['course-progress', user?.id, courseId],
    queryFn: async () => {
      if (!user?.id || !courseId) return null;

      // Buscar progresso geral do curso
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('course_enrollments')
        .select('progress, completed_at')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (enrollmentError || !enrollment) return null;

      // Buscar progresso detalhado por aula
      const { data: lessonProgress, error: lessonError } = await supabase
        .from('lesson_progress')
        .select(`
          lesson_id,
          is_completed,
          watch_time_seconds,
          completed_at,
          course_lessons (
            id,
            title,
            duration_minutes
          )
        `)
        .eq('user_id', user.id)
        .eq('course_lessons.module_id', courseId); // Ajustar conforme estrutura

      if (lessonError) {
        console.error('Erro ao buscar progresso das aulas:', lessonError);
      }

      return {
        overallProgress: enrollment.progress || 0,
        completedAt: enrollment.completed_at,
        lessonProgress: lessonProgress || [],
      };
    },
    enabled: !!user?.id && !!courseId && !!courseAccess?.hasAccess,
  });

  return {
    // Acesso a curso específico
    courseAccess,
    courseAccessLoading,
    
    // Todos os cursos com acesso
    allCourseAccess,
    allAccessLoading,
    
    // Progresso do curso
    courseProgress,
    progressLoading,
    
    // Funções auxiliares
    hasAccessToCourse: (id: string) => {
      if (!allCourseAccess) return false;
      return allCourseAccess.some(access => access.courseId === id && access.hasAccess);
    },
    
    getAccessType: (id: string) => {
      if (!allCourseAccess) return null;
      const access = allCourseAccess.find(access => access.courseId === id);
      return access?.accessType || null;
    },
    
    getExpirationDate: (id: string) => {
      if (!allCourseAccess) return null;
      const access = allCourseAccess.find(access => access.courseId === id);
      return access?.expiresAt || null;
    },
  };
};