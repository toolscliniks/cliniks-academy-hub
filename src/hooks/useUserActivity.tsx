import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface ActivityOptions {
  courseId?: string;
  lessonId?: string;
  metadata?: any;
}

export const useUserActivity = () => {
  const { user } = useAuth();

  const logActivity = async (type: string, description: string, options?: ActivityOptions) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          activity_type: type,
          activity_description: description,
          course_id: options?.courseId || null,
          lesson_id: options?.lessonId || null,
          metadata: options?.metadata || null
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const trackSession = async () => {
    if (!user?.id) return;

    try {
      // Update last activity
      await supabase
        .from('user_sessions')
        .upsert({
          user_id: user.id,
          last_activity: new Date().toISOString(),
          is_active: true,
          ip_address: null,
          user_agent: navigator.userAgent
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });
    } catch (error) {
      console.error('Error tracking session:', error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // Track initial session
    trackSession();

    // Set up periodic activity tracking
    const interval = setInterval(trackSession, 30000); // Every 30 seconds

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        trackSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount or user change
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Mark session as inactive
      if (user?.id) {
        supabase
          .from('user_sessions')
          .update({ 
            is_active: false, 
            session_end: new Date().toISOString() 
          })
          .eq('user_id', user.id)
          .then(() => {});
      }
    };
  }, [user?.id]);

  return {
    logActivity,
    trackSession
  };
};