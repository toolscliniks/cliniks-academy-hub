import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

export function usePerformanceMonitoring() {
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

  const logPerformance = useCallback(async (pagePath: string, metrics: Partial<PerformanceMetrics>) => {
    try {
      // Get navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;

      // Get paint metrics
      const paintMetrics = performance.getEntriesByType('paint');
      const fcp = paintMetrics.find(metric => metric.name === 'first-contentful-paint')?.startTime || 0;

      const performanceData = {
        ...metrics,
        loadTime: loadTime || metrics.loadTime || 0,
        firstContentfulPaint: fcp,
        navigationTiming: {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          resourcesLoaded: navigation.loadEventEnd - navigation.fetchStart,
          dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcpConnect: navigation.connectEnd - navigation.connectStart,
        }
      };

      await supabase.from('performance_logs').insert({
        user_id: user?.id || null,
        page_path: pagePath,
        load_time_ms: Math.round(loadTime || metrics.loadTime || 0),
        performance_data: performanceData
      });
    } catch (error) {
      console.error('Failed to log performance metrics:', error);
    }
  }, [user?.id]);

  const measurePageLoad = useCallback((pagePath: string) => {
    // Wait for page to load completely
    if (document.readyState === 'complete') {
      setTimeout(() => logPerformance(pagePath, {}), 100);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => logPerformance(pagePath, {}), 100);
      }, { once: true });
    }
  }, [logPerformance]);

  useEffect(() => {
    // Log Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          logPerformance(window.location.pathname, {
            largestContentfulPaint: entry.startTime
          });
        }
        if (entry.entryType === 'layout-shift') {
          const layoutShiftEntry = entry as any;
          if (!layoutShiftEntry.hadRecentInput) {
            logPerformance(window.location.pathname, {
              cumulativeLayoutShift: layoutShiftEntry.value
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] });

    return () => observer.disconnect();
  }, [logPerformance]);

  return {
    logPerformance,
    measurePageLoad
  };
}