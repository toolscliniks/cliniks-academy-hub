// Performance optimization utilities for Phase 4

import { supabase } from '@/integrations/supabase/client';

// Image optimization utilities
export const optimizeImage = (url: string, width?: number, height?: number): string => {
  if (!url) return '';
  
  // If it's a Supabase storage URL, add transformation parameters
  if (url.includes('supabase')) {
    const params = new URLSearchParams();
    if (width) params.append('width', width.toString());
    if (height) params.append('height', height.toString());
    params.append('quality', '80');
    params.append('format', 'webp');
    
    return `${url}?${params.toString()}`;
  }
  
  return url;
};

// Lazy loading utilities
export const lazyLoadImage = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = reject;
    img.src = src;
  });
};

// Database query optimization
export const optimizedCourseQuery = async (limit: number = 10, offset: number = 0) => {
  return await supabase
    .from('courses')
    .select(`
      id,
      title,
      description,
      cover_image_url,
      instructor_name,
      difficulty_level,
      category,
      is_published,
      created_at
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
};

export const optimizedUserCoursesQuery = async (userId: string) => {
  return await supabase
    .from('course_enrollments')
    .select(`
      id,
      progress,
      enrolled_at,
      completed_at,
      courses (
        id,
        title,
        cover_image_url,
        instructor_name
      )
    `)
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });
};

// Caching utilities
class SimpleCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  
  set(key: string, data: any, ttl: number = 300000) { // 5 minutes default
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }
  
  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear() {
    this.cache.clear();
  }
}

export const cache = new SimpleCache();

// Performance monitoring
export const measurePerformance = async (name: string, fn: () => Promise<any>) => {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    // Log performance data
    await supabase.from('performance_logs').insert({
      page_path: window.location.pathname,
      load_time_ms: Math.round(duration),
      performance_data: {
        operation: name,
        duration,
        timestamp: new Date().toISOString()
      }
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    
    // Log error with timing
    await supabase.from('error_logs').insert({
      error_message: `Performance operation failed: ${name}`,
      error_stack: error instanceof Error ? error.stack : undefined,
      page_path: window.location.pathname,
      metadata: {
        operation: name,
        duration,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    
    throw error;
  }
};

// Bundle optimization utilities
export const preloadRoute = (routePath: string) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = routePath;
  document.head.appendChild(link);
};

export const preloadCriticalImages = (urls: string[]) => {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = 'image';
    document.head.appendChild(link);
  });
};

// Memory optimization
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};