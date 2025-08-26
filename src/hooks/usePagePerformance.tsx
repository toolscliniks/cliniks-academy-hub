import { useEffect } from 'react';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';
import { useLocation } from 'react-router-dom';

export function usePagePerformance() {
  const { measurePageLoad } = usePerformanceMonitoring();
  const location = useLocation();

  useEffect(() => {
    // Measure performance for each page navigation
    measurePageLoad(location.pathname);
  }, [location.pathname, measurePageLoad]);

  useEffect(() => {
    // Monitor Core Web Vitals
    if ('web-vitals' in window || typeof window !== 'undefined') {
      // Cumulative Layout Shift
      let cumulativeLayoutShift = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            const layoutShiftEntry = entry as any;
            if (!layoutShiftEntry.hadRecentInput) {
              cumulativeLayoutShift += layoutShiftEntry.value;
            }
          }
        }
      });
      
      try {
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Layout shift monitoring not supported');
      }

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            const fidEntry = entry as any;
            console.log('First Input Delay:', fidEntry.processingStart - fidEntry.startTime);
          }
        }
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('First Input Delay monitoring not supported');
      }

      return () => {
        observer.disconnect();
        fidObserver.disconnect();
      };
    }
  }, []);

  // Resource loading performance
  useEffect(() => {
    const trackResourcePerformance = () => {
      const resources = performance.getEntriesByType('resource');
      const slowResources = resources.filter(resource => resource.duration > 1000);
      
      if (slowResources.length > 0) {
        console.warn('Slow loading resources detected:', slowResources);
      }
    };

    // Check after page load
    if (document.readyState === 'complete') {
      setTimeout(trackResourcePerformance, 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(trackResourcePerformance, 1000);
      }, { once: true });
    }
  }, [location.pathname]);
}