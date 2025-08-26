import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface ErrorLog {
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export function useErrorLogger() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logError = useCallback(async (error: Error | ErrorLog, metadata?: Record<string, any>) => {
    try {
      const errorData = {
        user_id: user?.id || null,
        error_message: typeof error === 'string' ? error : error.message || 'Unknown error',
        error_stack: 'stack' in error ? error.stack : undefined,
        page_path: window.location.pathname,
        user_agent: navigator.userAgent,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          ...(typeof error === 'object' && 'componentStack' in error ? { componentStack: error.componentStack } : {})
        }
      };

      await supabase.from('error_logs').insert(errorData);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }, [user?.id]);

  const logApiError = useCallback((endpoint: string, status: number, message: string) => {
    logError({
      message: `API Error: ${status} - ${message}`,
      url: endpoint,
      userAgent: navigator.userAgent
    }, {
      type: 'api_error',
      endpoint,
      status
    });
  }, [logError]);

  const logComponentError = useCallback((componentName: string, error: Error) => {
    logError({
      message: `Component Error in ${componentName}: ${error.message}`,
      stack: error.stack,
      userAgent: navigator.userAgent
    }, {
      type: 'component_error',
      component: componentName
    });
  }, [logError]);

  return {
    logError,
    logApiError,
    logComponentError
  };
}