import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export const useUserActivity = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Create or update user session
    const updateSession = async () => {
      try {
        const { error } = await supabase
          .from('user_sessions')
          .upsert({
            user_id: user.id,
            last_activity: new Date().toISOString(),
            is_active: true,
            ip_address: '0.0.0.0', // You can get real IP if needed
            user_agent: navigator.userAgent
          });

        if (error) console.error('Error updating session:', error);
      } catch (error) {
        console.error('Error in updateSession:', error);
      }
    };

    // Initial session update
    updateSession();

    // Update session every 30 seconds
    const interval = setInterval(updateSession, 30000);

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Mark session as inactive when component unmounts
      supabase
        .from('user_sessions')
        .update({ 
          is_active: false,
          session_end: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_active', true);
    };
  }, [user]);

  const logActivity = async (
    activityType: string, 
    description?: string, 
    courseId?: string, 
    lessonId?: string,
    metadata?: any
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          activity_type: activityType,
          activity_description: description,
          course_id: courseId,
          lesson_id: lessonId,
          metadata: metadata,
          created_at: new Date().toISOString()
        });

      if (error) console.error('Error logging activity:', error);
    } catch (error) {
      console.error('Error in logActivity:', error);
    }
  };

  return { logActivity };
};